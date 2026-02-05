import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { InvoiceService } from '../services/InvoiceService';
import { Invoice, Order, OrderItem, User, UserProfile, Address } from '../models';
import { Product } from '../models/Product';
import { getFileUrl } from '../utils/fileUrl';

/**
 * InvoiceController
 * Handles invoice generation, retrieval, and HTML rendering
 */
export class InvoiceController extends BaseController {
	/**
	 * GET /api/v1/invoices
	 * Get all invoices for the authenticated user
	 */
	async getInvoices(req: NextRequest) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const isAdmin = ['admin', 'super_admin'].includes(user!.user_type);
			const isVendor = user!.user_type === 'vendor';
			const isCustomer = user!.user_type === 'customer';

			let invoices: Invoice[] = [];

			if (isAdmin) {
				invoices = await InvoiceService.getAllInvoices();
			} else if (isVendor) {
				invoices = await InvoiceService.getInvoicesByVendor(user!.id);
			} else if (isCustomer) {
				invoices = await InvoiceService.getInvoicesByCustomer(user!.id);
			} else {
				return this.sendError('Forbidden', 403);
			}

			return this.sendSuccess(invoices, 'Invoices fetched successfully');
		} catch (err) {
			console.error('Get All Invoices Error:', err);
			return this.sendError('Failed to fetch invoices', 500);
		}
	}

	/**
	 * GET /api/v1/invoices/order/:orderId
	 * Get all invoices for an order (authenticated)
	 */
	async getInvoicesByOrder(req: NextRequest, { params }: { params: any }) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const { orderId } = await params;

			// Fetch order to verify access
			const order = await Order.findByPk(orderId);
			if (!order) {
				return this.sendError('Order not found', 404);
			}

			// Access control: user must be customer, vendor, or admin
			const isCustomer = order.user_id === user!.id;
			const isVendor = order.vendor_id === user!.id;
			const isAdmin = ['admin', 'super_admin'].includes(user!.user_type);

			if (!isCustomer && !isVendor && !isAdmin) {
				return this.sendError('Forbidden', 403);
			}

			const invoices = await InvoiceService.getInvoicesByOrderId(orderId);

			// Filter based on user type
			let filteredInvoices = invoices;
			if (isCustomer && !isAdmin) {
				// Customers can only see customer invoices
				filteredInvoices = invoices.filter(inv => inv.invoice_type === 'customer');
			} else if (isVendor && !isAdmin) {
				// Vendors can only see admin invoices (their invoices to admin)
				filteredInvoices = invoices.filter(inv => inv.invoice_type === 'admin');
			}

			return this.sendSuccess(filteredInvoices, 'Invoices fetched successfully');
		} catch (err) {
			console.error('Get Invoices By Order Error:', err);
			return this.sendError('Failed to fetch invoices', 500);
		}
	}

	/**
	 * GET /api/v1/invoices/:id
	 * Get invoice by ID (authenticated)
	 */
	async getInvoiceById(req: NextRequest, { params }: { params: any }) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const { id } = await params;

			const invoice = await InvoiceService.getInvoiceById(id);
			if (!invoice) {
				return this.sendError('Invoice not found', 404);
			}

			// Access control via order
			const order = invoice.order;
			if (!order) {
				return this.sendError('Associated order not found', 404);
			}

			const isCustomer = order.user_id === user!.id;
			const isVendor = order.vendor_id === user!.id;
			const isAdmin = ['admin', 'super_admin'].includes(user!.user_type);

			if (!isCustomer && !isVendor && !isAdmin) {
				return this.sendError('Forbidden', 403);
			}

			// Additional type-based filtering
			if (isCustomer && !isAdmin && invoice.invoice_type !== 'customer') {
				return this.sendError('Forbidden', 403);
			}
			if (isVendor && !isAdmin && invoice.invoice_type !== 'admin') {
				return this.sendError('Forbidden', 403);
			}

			return this.sendSuccess(invoice, 'Invoice fetched successfully');
		} catch (err) {
			console.error('Get Invoice By ID Error:', err);
			return this.sendError('Failed to fetch invoice', 500);
		}
	}

	/**
	 * GET /api/v1/invoices/view/:token
	 * Public invoice access via unique token
	 */
	async getInvoiceByToken(req: NextRequest, { params }: { params: any }) {
		try {
			const { token } = await params;

			const invoice = await InvoiceService.getInvoiceByToken(token);
			if (!invoice) {
				return this.sendError('Invoice not found or link has expired', 404);
			}

			return this.sendSuccess(invoice, 'Invoice fetched successfully');
		} catch (err) {
			console.error('Get Invoice By Token Error:', err);
			return this.sendError('Failed to fetch invoice', 500);
		}
	}

	/**
	 * GET /api/v1/invoices/:id/html
	 * Render invoice as A4 HTML for printing/viewing
	 */
	async renderInvoiceHtml(req: NextRequest, { params }: { params: any }) {
		try {
			const { id } = await params;

			// Allow both authenticated access and token-based access
			let invoice: Invoice | null = null;

			// Check if there's an auth header
			const authHeader = req.headers.get('authorization');
			if (authHeader && authHeader.startsWith('Bearer ')) {
				const { user, error } = await this.verifyAuth(req);
				if (!error && user) {
					invoice = await InvoiceService.getInvoiceById(id);
					if (invoice) {
						const order = invoice.order;
						if (order) {
							const isCustomer = order.user_id === user.id;
							const isVendor = order.vendor_id === user.id;
							const isAdmin = ['admin', 'super_admin'].includes(user.user_type);
							if (!isCustomer && !isVendor && !isAdmin) {
								invoice = null;
							}
						}
					}
				}
			}

			if (!invoice) {
				return this.sendError('Invoice not found or access denied', 404);
			}

			// Fetch order with items for line items
			const order = await Order.findByPk(invoice.order_id, {
				include: [
					{
						model: OrderItem,
						as: 'items',
						include: [{ model: Product, as: 'product' }]
					}
				]
			}) as Order & { items?: (OrderItem & { product?: Product })[] };

			// Build invoice HTML
			const html = this.buildInvoiceHtml(invoice, order);

			return new Response(html, {
				headers: {
					'Content-Type': 'text/html; charset=utf-8'
				}
			});
		} catch (err) {
			console.error('Render Invoice HTML Error:', err);
			return this.sendError('Failed to render invoice', 500);
		}
	}

	/**
	 * GET /api/v1/invoices/view/:token/html
	 * Public HTML rendering via token
	 */
	/**
	 * GET /api/v1/invoices/view/:token/html
	 * Public HTML rendering via token
	 * UPDATED: Now enforces STRICT access control by verifying the user session.
	 * Even though it uses a "token", the user must be logged in as a relevant party.
	 */
	async renderInvoiceHtmlByToken(req: NextRequest, { params }: { params: any }) {
		try {
			const { token } = await params;

			// 1. Get the invoice
			const invoice = await InvoiceService.getInvoiceByToken(token);

			if (!invoice) {
				return this.sendError('Invoice not found or link has expired', 404);
			}

			// 2. Perform strict authorization check
			// We manually check auth here because this route might have been excluded from global middleware
			// or we need specific logic (Vendor A vs Vendor B).

			const { user, error } = await this.verifyAuth(req);

			if (error || !user) {
				// If no user, we CANNOT show the invoice based on user requirements.
				// However, if the frontend is just an iframe, returning 401 might break the UI in an ugly way.
				// But security comes first. The frontend page should handle the 401 by redirecting to login.
				return this.sendError('Authentication required to view this invoice', 401);
			}

			// 3. User is logged in. Check if they are allowed to see THIS invoice.
			const isAdmin = ['admin', 'super_admin'].includes(user.user_type);

			if (isAdmin) {
				// Admins can see everything. Pass.
			} else {
				// Get order details to check relationships
				const order = await Order.findByPk(invoice.order_id);
				if (!order) {
					return this.sendError('Invoice order not found', 404);
				}

				const isAddressee = order.user_id === user.id; // Customer
				const isIssuer = order.vendor_id === user.id; // Vendor

				// Rule: "Must only be accessible by either parties"
				// Vendor Invoice: Vendor (Issuer) & Admin
				// Customer Invoice: Customer (Addressee) & Admin

				if (invoice.invoice_type === 'admin') {
					// Vendor -> Admin
					if (!isIssuer) {
						return this.sendError('Access denied. Only the issuing vendor can view this invoice.', 403);
					}
				} else if (invoice.invoice_type === 'customer') {
					// Admin -> Customer
					if (!isAddressee) {
						return this.sendError('Access denied. Only the customer can view this invoice.', 403);
					}
				} else {
					// Fallback safety
					return this.sendError('Access denied', 403);
				}
			}

			// 4. Authorized. Fetch full details and render.
			const fullOrder = await Order.findByPk(invoice.order_id, {
				include: [
					{
						model: OrderItem,
						as: 'items',
						include: [{ model: Product, as: 'product' }]
					}
				]
			}) as Order & { items?: (OrderItem & { product?: Product })[] };

			// Fallback: If items are empty, try manual fetch using UUID
			if (!fullOrder.items || fullOrder.items.length === 0) {
				const manualItems = await OrderItem.findAll({
					where: { order_id: fullOrder.id },
					include: [{ model: Product, as: 'product' }]
				});
				if (manualItems.length > 0) {
					fullOrder.items = manualItems;
					console.log(`[InvoiceController] Recovered ${manualItems.length} items via manual query for Order ${fullOrder.id}`);
				} else {
					console.log(`[InvoiceController] No items found even with manual query for Order ${fullOrder.id}`);
				}
			}

			const html = this.buildInvoiceHtml(invoice, fullOrder);

			return new Response(html, {
				headers: {
					'Content-Type': 'text/html; charset=utf-8'
				}
			});
		} catch (err) {
			console.error('Render Invoice HTML By Token Error:', err);
			return this.sendError('Failed to render invoice', 500);
		}
	}

	/**
	 * Builds A4-sized HTML invoice
	 */
	private buildInvoiceHtml(invoice: Invoice, order: Order & { items?: (OrderItem & { product?: Product })[] } | null): string {
		const rawItems = order?.items || [];

		// Normalize items to plain objects to ensure property access works
		const items = rawItems.map(item => {
			return (item as any).toJSON ? (item as any).toJSON() : item;
		});

		if (items.length > 0) {
			console.log(`[InvoiceHTML] First item keys:`, Object.keys(items[0]));
		}

		console.log(`[InvoiceHTML] Building invoice ${invoice.invoice_number} for Order ${order?.id}. Items count: ${items.length}`);

		const logoUrl = invoice.issuer_logo_url ? getFileUrl(invoice.issuer_logo_url) : '';
		const sealClass = invoice.payment_status === 'paid' ? 'seal-paid' : 'seal-unpaid';
		const sealText = invoice.payment_status === 'paid' ? 'PAID' : 'UNPAID';

		const formatCurrency = (amount: number) => {
			return `${invoice.currency} ${Number(amount).toFixed(2)}`;
		};

		const formatDate = (date: Date) => {
			return new Date(date).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		};

		const itemRows = items.map((item: any, index: number) => {
			// Safe property access
			const name = item.product_name || item.name || (item.product ? item.product.name : 'Item');
			const qty = item.quantity || 1;
			const price = Number(item.price || 0);
			const total = price * qty;

			return `
			<tr>
				<td>${index + 1}</td>
				<td>${name}</td>
				<td class="text-center">${qty}</td>
				<td class="text-right">${formatCurrency(price)}</td>
				<td class="text-right">${formatCurrency(total)}</td>
			</tr>
		`}).join('');

		return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Invoice ${invoice.invoice_number}</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		
		body {
			font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
			font-size: 12px;
			line-height: 1.5;
			color: #333;
			background: #f5f5f5;
		}
		
			.invoice-container {
				width: 210mm;
				/* min-height: 297mm;  Removed to prevent extra blank page */
				margin: 0 auto;
				padding: 15mm;
				background: white;
				box-shadow: 0 0 10px rgba(0,0,0,0.1);
				position: relative;
			}
			
			@media print {
				@page {
					margin: 0;
					size: A4;
				}
				body {
					background: white;
					margin: 0;
					padding: 0;
				}
				.invoice-container {
					width: 100%;
					margin: 0;
					padding: 15mm;
					box-shadow: none;
					page-break-after: avoid;
				}
				.no-print {
					display: none !important;
				}
			}
			
			/* Header */
			.invoice-header {
				display: flex;
				justify-content: space-between;
				align-items: flex-start;
				margin-bottom: 30px;
				padding-bottom: 20px;
				border-bottom: 2px solid #2c3e50;
			}
			
			.logo-section {
				flex: 0 0 200px;
			}
			
			.logo-section img {
				max-width: 180px;
				max-height: 80px;
				object-fit: contain;
			}
			
			.invoice-title-section {
				text-align: right;
			}
			
			.invoice-title {
				font-size: 32px;
				font-weight: 700;
				color: #2c3e50;
				text-transform: uppercase;
				letter-spacing: 2px;
			}
			
			.invoice-number {
				font-size: 14px;
				color: #7f8c8d;
				margin-top: 5px;
			}
			
			.invoice-date {
				font-size: 12px;
				color: #7f8c8d;
				margin-top: 3px;
			}
			
			/* Seal */
			.seal {
				position: absolute;
				top: 180px; /* Moved down to avoid obscuring header */
				right: 40px;
				width: 100px;
				height: 100px;
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 18px;
				font-weight: 700;
				transform: rotate(-15deg);
				opacity: 0.85;
			}
		
		.seal-paid {
			border: 4px solid #27ae60;
			color: #27ae60;
		}
		
		.seal-unpaid {
			border: 4px solid #e74c3c;
			color: #e74c3c;
		}
		
		/* Parties */
		.parties-section {
			display: flex;
			justify-content: space-between;
			margin-bottom: 30px;
		}
		
		.party-box {
			flex: 0 0 48%;
		}
		
		.party-label {
			font-size: 10px;
			text-transform: uppercase;
			color: #7f8c8d;
			font-weight: 600;
			margin-bottom: 8px;
			letter-spacing: 1px;
		}
		
		.party-name {
			font-size: 16px;
			font-weight: 600;
			color: #2c3e50;
			margin-bottom: 5px;
		}
		
		.party-details {
			font-size: 11px;
			color: #555;
			white-space: pre-line;
		}
		
		/* Items Table */
		.items-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 30px;
		}
		
		.items-table th {
			background: #2c3e50;
			color: white;
			padding: 12px 10px;
			text-align: left;
			font-size: 11px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		
		.items-table th:first-child {
			width: 40px;
		}
		
		.items-table td {
			padding: 12px 10px;
			border-bottom: 1px solid #ecf0f1;
		}
		
		.items-table tr:nth-child(even) {
			background: #f9f9f9;
		}
		
		.text-center {
			text-align: center;
		}
		
		.text-right {
			text-align: right;
		}
		
		/* Totals */
		.totals-section {
			display: flex;
			justify-content: flex-end;
			margin-bottom: 30px;
		}
		
		.totals-box {
			width: 280px;
		}
		
		.totals-row {
			display: flex;
			justify-content: space-between;
			padding: 8px 0;
			border-bottom: 1px solid #ecf0f1;
		}
		
		.totals-row.total-row {
			border-bottom: none;
			border-top: 2px solid #2c3e50;
			margin-top: 5px;
			padding-top: 12px;
			font-size: 16px;
			font-weight: 700;
			color: #2c3e50;
		}
		
		.totals-label {
			color: #7f8c8d;
		}
		
		.totals-value {
			font-weight: 600;
		}
		
		/* Comments */
		.comments-section {
			margin-bottom: 30px;
			padding: 15px;
			background: #f8f9fa;
			border-left: 4px solid #3498db;
		}
		
		.comments-title {
			font-size: 11px;
			text-transform: uppercase;
			color: #7f8c8d;
			font-weight: 600;
			margin-bottom: 8px;
		}
		
		.comments-text {
			font-size: 12px;
			color: #555;
			white-space: pre-line;
		}
		
		/* Terms */
		.terms-section {
			padding-top: 20px;
			border-top: 1px solid #ecf0f1;
		}
		
		.terms-title {
			font-size: 11px;
			text-transform: uppercase;
			color: #7f8c8d;
			font-weight: 600;
			margin-bottom: 8px;
		}
		
		.terms-text {
			font-size: 10px;
			color: #888;
			white-space: pre-line;
			line-height: 1.6;
		}
		
		/* Action Buttons */
		.action-buttons {
			position: fixed;
			top: 20px;
			right: 20px;
			display: flex;
			gap: 10px;
			z-index: 1000;
		}
		
		.action-btn {
			padding: 10px 20px;
			border: none;
			border-radius: 5px;
			cursor: pointer;
			font-size: 14px;
			font-weight: 600;
			transition: all 0.2s;
		}
		
		.btn-print {
			background: #3498db;
			color: white;
		}
		
		.btn-print:hover {
			background: #2980b9;
		}
		
		.btn-download {
			background: #27ae60;
			color: white;
		}
		
		.btn-download:hover {
			background: #229954;
		}
		
		.btn-copy {
			background: #9b59b6;
			color: white;
		}
		
		.btn-copy:hover {
			background: #8e44ad;
		}
	</style>
</head>
<body>
	<div class="action-buttons no-print">
		<button class="action-btn btn-print" onclick="window.print()">🖨️ Print</button>
		<button class="action-btn btn-copy" onclick="copyLink()">🔗 Copy Link</button>
	</div>
	
	<div class="invoice-container">
		<!-- Seal -->
		<div class="seal ${sealClass}">${sealText}</div>
		
		<!-- Header -->
		<div class="invoice-header">
			<div class="logo-section">
				${logoUrl ? `<img src="${logoUrl}" alt="Company Logo" />` : '<div style="height:60px;"></div>'}
			</div>
			<div class="invoice-title-section">
				<div class="invoice-title">Invoice</div>
				<div class="invoice-number">${invoice.invoice_number}</div>
				<div class="invoice-date">Date: ${formatDate(invoice.created_at)}</div>
			</div>
		</div>
		
		<!-- Parties -->
		<div class="parties-section">
			<div class="party-box">
				<div class="party-label">From</div>
				<div class="party-name">${invoice.issuer_name}</div>
				<div class="party-details">${invoice.issuer_address}
${invoice.issuer_phone ? `Tel: ${invoice.issuer_phone}` : ''}
${invoice.issuer_email ? `Email: ${invoice.issuer_email}` : ''}</div>
			</div>
			<div class="party-box">
				<div class="party-label">Bill To</div>
				<div class="party-name">${invoice.addressee_name}</div>
				<div class="party-details">${invoice.addressee_address}
${invoice.addressee_phone ? `Tel: ${invoice.addressee_phone}` : ''}
${invoice.addressee_email ? `Email: ${invoice.addressee_email}` : ''}</div>
			</div>
		</div>
		
		<!-- Items Table -->
		<table class="items-table">
			<thead>
				<tr>
					<th>#</th>
					<th>Description</th>
					<th class="text-center">Qty</th>
					<th class="text-right">Unit Price</th>
					<th class="text-right">Amount</th>
				</tr>
			</thead>
			<tbody>
				${itemRows || '<tr><td colspan="5" style="text-align:center;padding:20px;">No items</td></tr>'}
			</tbody>
		</table>
		
		<!-- Totals -->
		<div class="totals-section">
			<div class="totals-box">
				<div class="totals-row">
					<span class="totals-label">Subtotal</span>
					<span class="totals-value">${formatCurrency(Number(invoice.subtotal))}</span>
				</div>
				${Number(invoice.vat_amount) > 0 ? `
				<div class="totals-row">
					<span class="totals-label">VAT</span>
					<span class="totals-value">${formatCurrency(Number(invoice.vat_amount))}</span>
				</div>
				` : ''}
				${Number(invoice.shipping_amount) > 0 ? `
				<div class="totals-row">
					<span class="totals-label">Shipping</span>
					<span class="totals-value">${formatCurrency(Number(invoice.shipping_amount))}</span>
				</div>
				` : ''}
				${Number(invoice.packing_amount) > 0 ? `
				<div class="totals-row">
					<span class="totals-label">Packing</span>
					<span class="totals-value">${formatCurrency(Number(invoice.packing_amount))}</span>
				</div>
				` : ''}
				<div class="totals-row total-row">
					<span>Total Due</span>
					<span>${formatCurrency(Number(invoice.total_amount))}</span>
				</div>
			</div>
		</div>
		
		<!-- Comments -->
		${invoice.comments ? `
		<div class="comments-section">
			<div class="comments-title">Notes</div>
			<div class="comments-text">${invoice.comments}</div>
		</div>
		` : ''}
		
		<!-- Terms & Conditions -->
		${invoice.terms_conditions ? `
		<div class="terms-section">
			<div class="terms-title">Terms & Conditions</div>
			<div class="terms-text">${invoice.terms_conditions}</div>
		</div>
		` : ''}
	</div>
	
	<script>
		function copyLink() {
			const url = window.location.href;
			navigator.clipboard.writeText(url).then(() => {
				alert('Invoice link copied to clipboard!');
			}).catch(() => {
				prompt('Copy this link:', url);
			});
		}
	</script>
</body>
</html>
		`;
	}
}
