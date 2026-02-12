import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { InvoiceService } from '../services/InvoiceService';
import { Invoice, Order, OrderItem, User, UserProfile, Address } from '../models';
import { Product } from '../models/Product';
import { getFileUrl } from '../utils/fileUrl';
import { Op } from 'sequelize';

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

			const invoices = order.order_group_id
				? await InvoiceService.getInvoicesByGroupId(order.order_group_id)
				: await InvoiceService.getInvoicesByOrderId(orderId);

			// Filter based on user type
			let filteredInvoices = invoices;
			if (isCustomer && !isAdmin) {
				// Customers can only see customer invoices
				filteredInvoices = invoices.filter(inv => inv.invoice_type === 'customer');
			} else if (isVendor && !isAdmin) {
				// Vendors can only see admin invoices (their invoices to admin) linked to THEIR order
				// However, getInvoicesByGroupId returns ALL vendor invoices in the group.
				// We must strictly filter to show ONLY invoices where order.vendor_id === user.id
				filteredInvoices = invoices.filter(inv => {
					// We need to check the order associated with the invoice
					// The service include adds 'order' to the invoice object
					const invOrder = (inv as any).order;
					return inv.invoice_type === 'admin' && invOrder && invOrder.vendor_id === user!.id;
				});
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
			let order = await Order.findByPk(invoice.order_id, {
				include: [
					{
						model: OrderItem,
						as: 'items',
						include: [{ model: Product, as: 'product' }]
					}
				]
			}) as any;

			// If Customer Invoice, we must fetch ALL sibling orders in the group to show consolidated items
			if (invoice.invoice_type === 'customer' && order && order.order_group_id) {
				console.log(`[InvoiceController] Consolidating items for Group ID: ${order.order_group_id}`);

				// 1. Get all Order IDs in the group (Admin + Vendor)
				const groupOrders = await Order.findAll({
					where: { order_group_id: order.order_group_id },
					attributes: ['id']
				});
				const groupOrderIds = groupOrders.map(o => o.id);
				console.log(`[InvoiceController] Found group order IDs: ${groupOrderIds.join(', ')}`);

				// 2. Fetch ALL items for these orders directly
				const allItems = await OrderItem.findAll({
					where: { order_id: { [Op.in]: groupOrderIds } },
					include: [{ model: Product, as: 'product' }]
				});

				console.log(`[InvoiceController] Total consolidated items: ${allItems.length}`);

				// Start with the primary order object
				// We clone strict JSON to avoid Sequelize instance issues
				const consolidatedOrder = order.toJSON ? order.toJSON() : { ...order };

				if (allItems.length > 0) {
					consolidatedOrder.items = allItems;
				} else {
					console.warn(`[InvoiceController] Consolidation returned 0 items. Keeping primary order items (${order.items?.length || 0}).`);
				}

				order = consolidatedOrder;
			} else {
				console.log(`[InvoiceController] No consolidation. Type: ${invoice.invoice_type}, Group: ${order?.order_group_id}`);
			}

			// Fallback: If items are empty, try manual fetch using order_group_id if available, else order_id
			// We check 'order' as it might have been updated by consolidation
			if (!order.items || order.items.length === 0) {
				console.warn(`[InvoiceController] Items list is empty for Order ${order.id}. Attempting manual recovery.`);

				let manualItems: OrderItem[] = [];

				if (invoice.invoice_type === 'customer' && order.order_group_id) {
					console.log(`[InvoiceController] Recovering items for Group ID: ${order.order_group_id}`);
					// Find all order IDs in the group
					const groupOrders = await Order.findAll({
						where: { order_group_id: order.order_group_id },
						attributes: ['id']
					});
					const groupOrderIds = groupOrders.map(o => o.id);

					manualItems = await OrderItem.findAll({
						where: { order_id: { [Op.in]: groupOrderIds } },
						include: [{ model: Product, as: 'product' }]
					});
				} else {
					manualItems = await OrderItem.findAll({
						where: { order_id: order.id },
						include: [{ model: Product, as: 'product' }]
					});
				}

				if (manualItems.length > 0) {
					order.items = manualItems;
					console.log(`[InvoiceController] Recovered ${manualItems.length} items via manual query`);
				} else {
					console.error(`[InvoiceController] FAILED to recover items for Order ${order.id}`);
				}
			}

			// Fetch bank accounts and admin company details for invoice
			const bankAccounts = await InvoiceService.getBankAccounts();
			const adminDetails = await InvoiceService.getAdminDetails();

			// Build invoice HTML
			const html = this.buildInvoiceHtml(invoice, order, bankAccounts, adminDetails);

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
			const { user, error } = await this.verifyAuth(req);

			if (error || !user) {
				return this.sendError('Authentication required to view this invoice', 401);
			}

			// 3. Fetch order with items early to check permissions AND consolidation
			let order = await Order.findByPk(invoice.order_id, {
				include: [
					{
						model: OrderItem,
						as: 'items',
						include: [{ model: Product, as: 'product' }]
					}
				]
			}) as any;

			if (!order) {
				return this.sendError('Invoice order not found', 404);
			}

			// 3b. Consolidate items if Customer Invoice (SAME LOGIC AS renderInvoiceHtml)
			if (invoice.invoice_type === 'customer' && order.order_group_id) {
				console.log(`[InvoiceTokenController] Consolidating items for Group ID: ${order.order_group_id}`);

				// 1. Get all Order IDs in the group
				const groupOrders = await Order.findAll({
					where: { order_group_id: order.order_group_id },
					attributes: ['id']
				});
				const groupOrderIds = groupOrders.map(o => o.id);
				console.log(`[InvoiceTokenController] Found group order IDs: ${groupOrderIds.join(', ')}`);

				// 2. Fetch ALL items directly
				const allItems = await OrderItem.findAll({
					where: { order_id: { [Op.in]: groupOrderIds } },
					include: [{ model: Product, as: 'product' }]
				});

				console.log(`[InvoiceTokenController] Total consolidated items: ${allItems.length}`);

				const consolidatedOrder = order.toJSON ? order.toJSON() : { ...order };

				if (allItems.length > 0) {
					consolidatedOrder.items = allItems;
				} else {
					console.warn(`[InvoiceTokenController] Consolidation returned 0 items. Keeping primary order items (${order.items?.length || 0}).`);
				}

				order = consolidatedOrder;
			}

			// 4. Permission Check
			const isAdmin = ['admin', 'super_admin'].includes(user.user_type);

			if (!isAdmin) {
				const isAddressee = order.user_id === user.id; // Customer
				const isIssuer = order.vendor_id === user.id; // Vendor

				if (invoice.invoice_type === 'admin') {
					if (!isIssuer) return this.sendError('Access denied', 403);
				} else if (invoice.invoice_type === 'customer') {
					if (!isAddressee) return this.sendError('Access denied', 403);
				} else {
					return this.sendError('Access denied', 403);
				}
			}

			// 5. Render
			// Use the prepared order object
			const finalOrder = order as Order & { items?: (OrderItem & { product?: Product })[] };

			// Fallback: If items are empty, try manual fetch using order_group_id if available, else order_id

			if (!finalOrder.items || finalOrder.items.length === 0) {
				console.warn(`[InvoiceTokenController] Items list is empty for Order ${finalOrder.id}. Attempting manual recovery.`);

				let manualItems: OrderItem[] = [];

				if (invoice.invoice_type === 'customer' && finalOrder.order_group_id) {
					console.log(`[InvoiceTokenController] Recovering items for Group ID: ${finalOrder.order_group_id}`);
					// Find all order IDs in the group
					const groupOrders = await Order.findAll({
						where: { order_group_id: finalOrder.order_group_id },
						attributes: ['id']
					});
					const groupOrderIds = groupOrders.map(o => o.id);

					manualItems = await OrderItem.findAll({
						where: { order_id: { [Op.in]: groupOrderIds } },
						include: [{ model: Product, as: 'product' }]
					});
				} else {
					manualItems = await OrderItem.findAll({
						where: { order_id: finalOrder.id },
						include: [{ model: Product, as: 'product' }]
					});
				}

				if (manualItems.length > 0) {
					finalOrder.items = manualItems;
					console.log(`[InvoiceTokenController] Recovered ${manualItems.length} items via manual query`);
				} else {
					console.error(`[InvoiceTokenController] FAILED to recover items for Order ${finalOrder.id}`);
				}
			}

			// Fetch bank accounts and admin company details for invoice
			const bankAccounts = await InvoiceService.getBankAccounts();
			const adminDetails = await InvoiceService.getAdminDetails();

			const html = this.buildInvoiceHtml(invoice, finalOrder, bankAccounts, adminDetails);

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
	private buildInvoiceHtml(invoice: Invoice, order: Order & { items?: (OrderItem & { product?: Product })[] } | null, bankAccounts: any[] = [], adminDetails?: { companyName: string; companyAddress: string; companyPhone: string | null; companyEmail: string | null; logoUrl: string | null; invoiceFooter: string | null }): string {
		const rawItems = order?.items || [];

		// Normalize items to plain objects to ensure property access works
		const items = rawItems.map(item => {
			return (item as any).toJSON ? (item as any).toJSON() : item;
		});

		if (items.length > 0) {

		}



		// Company details: For admin invoices (Vendor → Admin), show the VENDOR (issuer) info in the header.
		// For customer invoices (Admin → Customer), show the admin/platform info.
		const isVendorInvoice = invoice.invoice_type === 'admin';
		const companyName = isVendorInvoice
			? (invoice.issuer_name || adminDetails?.companyName || 'Vendor')
			: (adminDetails?.companyName || invoice.issuer_name);
		const companyAddress = isVendorInvoice
			? (invoice.issuer_address || adminDetails?.companyAddress || '')
			: (adminDetails?.companyAddress || invoice.issuer_address);
		const companyPhone = isVendorInvoice
			? (invoice.issuer_phone || null)
			: (adminDetails?.companyPhone || invoice.issuer_phone);
		const companyEmail = isVendorInvoice
			? (invoice.issuer_email || null)
			: (adminDetails?.companyEmail || invoice.issuer_email);

		// Debug: log what details were used for the header


		// Logo: use NEXT_PUBLIC_WEBSITE_URL/logo.png (the web app's public logo)
		const websiteUrl = (process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3001').replace(/\/$/, '');
		const logoUrl = `${websiteUrl}/final-logo (1).svg`;
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

		/**
		 * Converts a number to words with proper currency unit names
		 * e.g. 619.50 AED => "Six Hundred Nineteen Dirhams and Fifty Fils Only"
		 */
		const numberToWords = (num: number, currency: string): string => {
			const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
				'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
			const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

			/** Currency unit names: [singular main, plural main, singular sub, plural sub] */
			const currencyUnits: Record<string, [string, string, string, string]> = {
				'AED': ['Dirham', 'Dirhams', 'Fil', 'Fils'],
				'USD': ['Dollar', 'Dollars', 'Cent', 'Cents'],
				'EUR': ['Euro', 'Euros', 'Cent', 'Cents'],
				'GBP': ['Pound', 'Pounds', 'Penny', 'Pence'],
				'SAR': ['Riyal', 'Riyals', 'Halala', 'Halalas'],
			};
			const units = currencyUnits[currency] || [currency, currency, 'Cent', 'Cents'];

			const convertChunk = (n: number): string => {
				if (n === 0) return '';
				if (n < 20) return ones[n];
				if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
				return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertChunk(n % 100) : '');
			};

			const wholePart = Math.floor(Math.abs(num));
			const decimalPart = Math.round((Math.abs(num) - wholePart) * 100);

			if (wholePart === 0 && decimalPart === 0) return `Zero ${units[1]}`;

			let result = '';
			if (wholePart >= 1000000) {
				result += convertChunk(Math.floor(wholePart / 1000000)) + ' Million ';
			}
			if (wholePart >= 1000) {
				result += convertChunk(Math.floor((wholePart % 1000000) / 1000)) + ' Thousand ';
			}
			result += convertChunk(wholePart % 1000);
			result = result.trim();

			// Add main currency unit
			result += ' ' + (wholePart === 1 ? units[0] : units[1]);

			// Add subunit if any
			if (decimalPart > 0) {
				const subWords = convertChunk(decimalPart);
				result += ` and ${subWords} ${decimalPart === 1 ? units[2] : units[3]}`;
			}

			return result;
		};

		const orderSubtotal = items.reduce((sum: number, i: any) => sum + (Number(i.price || 0) * (i.quantity || 1)), 0);

		const itemRows = items.map((item: any, index: number) => {
			// Use snapshot from product_details if available, otherwise fallback
			const snapshot = item.product_details || {};
			const name = snapshot.name || item.product_name || item.name || (item.product ? item.product.name : 'Item');
			const qty = item.quantity || 1;

			// Logic:
			// Customer Invoice (type: customer): price = item.price (Base + Platform Fee)
			// Vendor Invoice (type: admin): price = item.price - (share of admin_commission)
			let price = Number(item.price || item['price'] || 0);

			if (invoice.invoice_type === 'admin') {
				const adminCommission = order ? (Number(order.admin_commission) || 0) : 0;
				if (adminCommission > 0 && orderSubtotal > 0) {
					// Proportional distribution of commission
					const itemTotal = price * qty;
					const itemShareOfCommission = (itemTotal / orderSubtotal) * adminCommission;
					const unitCommission = itemShareOfCommission / qty;
					price = price - unitCommission;
				} else {
					// Fallback to base_price columns if no commission balance recorded on order
					const bp = item.base_price ?? item['base_price'] ?? null;
					const pbp = snapshot.base_price ?? item.product?.base_price ?? null;
					price = (bp !== null ? Number(bp) : (pbp !== null ? Number(pbp) : price));
				}
			}

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

		// Calculate Platform Fees for footer (Customer Invoice only)
		const platformFees = invoice.invoice_type === 'customer'
			? items.reduce((sum: number, item: any) => {
				const base = Number(item.base_price || item.product?.base_price || item.price);
				const unit = Number(item.price);
				return sum + ((unit - base) * (item.quantity || 1));
			}, 0)
			: 0;

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
		
		/* Letterhead Header */
		.letterhead {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding-bottom: 16px;
			border-bottom: 3px solid #2c3e50;
			margin-bottom: 24px;
		}
		
		.letterhead-logo {
			flex: 0 0 160px;
		}
		
		.letterhead-logo img {
			max-width: 150px;
			max-height: 70px;
			object-fit: contain;
		}
		
		.letterhead-title {
			flex: 1;
			text-align: center;
		}
		
		.letterhead-title h1 {
			font-size: 30px;
			font-weight: 700;
			color: #2c3e50;
			text-transform: uppercase;
			letter-spacing: 3px;
		}
		
		.letterhead-company {
			flex: 0 0 220px;
			text-align: right;
			font-size: 10px;
			color: #555;
			line-height: 1.6;
		}
		
		.letterhead-company .company-name {
			font-size: 12px;
			font-weight: 700;
			color: #2c3e50;
			margin-bottom: 3px;
		}
		
		/* Info Row: Bill To + Invoice Details */
		.info-row {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			margin-bottom: 28px;
		}
		
		.bill-to {
			flex: 0 0 40%;
		}
		
		.invoice-details {
			flex: 0 0 38%;
			text-align: right;
		}
		
		.section-label {
			font-size: 10px;
			text-transform: uppercase;
			color: #7f8c8d;
			font-weight: 600;
			margin-bottom: 8px;
			letter-spacing: 1px;
		}
		
		.bill-to-name {
			font-size: 16px;
			font-weight: 600;
			color: #2c3e50;
			margin-bottom: 4px;
		}
		
		.bill-to-details {
			font-size: 11px;
			color: #555;
			white-space: pre-line;
		}
		
		.detail-table {
			width: 100%;
			border-collapse: collapse;
		}
		
		.detail-table td {
			padding: 5px 0;
			font-size: 11px;
		}
		
		.detail-table .dt-label {
			color: #7f8c8d;
			text-align: right;
			padding-right: 12px;
			white-space: nowrap;
		}
		
		.detail-table .dt-value {
			color: #2c3e50;
			font-weight: 600;
			text-align: right;
		}
		
		/* Seal */
		.seal {
			position: static;
			width: 70px;
			height: 70px;
			border-radius: 50%;
			display: none; /* Hidden: status is shown separately in invoice details */
			align-items: center;
			justify-content: center;
			font-size: 14px;
			font-weight: 700;
			transform: rotate(-15deg);
			opacity: 0.85;
			flex-shrink: 0;
		}
		
		.seal-paid {
			border: 4px solid #27ae60;
			color: #27ae60;
		}
		
		.seal-unpaid {
			border: 4px solid #e74c3c;
			color: #e74c3c;
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
		
		.text-center { text-align: center; }
		.text-right { text-align: right; }
		
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
		
		.totals-label { color: #7f8c8d; }
		.totals-value { font-weight: 600; }
		
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
		
		/* Footer: T&C + Bank Details side by side */
		.footer-row {
			display: flex;
			gap: 24px;
			padding-top: 20px;
			border-top: 1px solid #ecf0f1;
		}
		
		.footer-col {
			flex: 1;
		}
		
		.footer-title {
			font-size: 11px;
			text-transform: uppercase;
			color: #7f8c8d;
			font-weight: 600;
			margin-bottom: 8px;
			letter-spacing: 0.5px;
		}
		
		.terms-text {
			font-size: 10px;
			color: #888;
			white-space: pre-line;
			line-height: 1.6;
		}
		
		.bank-account {
			margin-bottom: 10px;
			font-size: 10px;
			color: #555;
			line-height: 1.5;
		}
		
		.bank-account .bank-label {
			color: #7f8c8d;
			display: inline-block;
			min-width: 55px;
		}
		
		.bank-account .bank-holder {
			font-weight: 600;
			color: #2c3e50;
			font-size: 11px;
			margin-bottom: 2px;
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
		
		.btn-print { background: #3498db; color: white; }
		.btn-print:hover { background: #2980b9; }
		.btn-copy { background: #9b59b6; color: white; }
		.btn-copy:hover { background: #8e44ad; }
	</style>
</head>
<body>
	<div class="action-buttons no-print">
		<button class="action-btn btn-print" onclick="window.print()">🖨️ Print</button>
		<button class="action-btn btn-copy" onclick="copyLink()">🔗 Copy Link</button>
	</div>
	
	<div class="invoice-container">
		
		<!-- Letterhead Header -->
		<div class="letterhead">
			<div class="letterhead-logo">
				<img src="${logoUrl}" alt="Company Logo" />
			</div>
			<div class="letterhead-title">
				<h1>Invoice</h1>
			</div>
			<div class="letterhead-company">
				<div class="company-name">${companyName}</div>
				${companyAddress}
				${companyPhone ? `<br/>Tel: ${companyPhone}` : ''}
				${companyEmail ? `<br/>Email: ${companyEmail}` : ''}
			</div>
		</div>
		
		<!-- Bill To + Seal + Invoice Details -->
		<div class="info-row">
			<div class="bill-to">
				<div class="section-label">Bill To</div>
				<div class="bill-to-name">${invoice.addressee_name}</div>
				<div class="bill-to-details">${invoice.addressee_address}
${invoice.addressee_phone ? `Tel: ${invoice.addressee_phone}` : ''}
${invoice.addressee_email ? `Email: ${invoice.addressee_email}` : ''}</div>
			</div>
			<div style="display:flex;align-items:center;justify-content:center;flex:0 0 auto;padding:0 10px;">
				<div class="seal ${sealClass}">${sealText}</div>
			</div>
			<div class="invoice-details">
				<div class="section-label">Invoice Details</div>
				<table class="detail-table">
					<tr><td class="dt-label">Invoice No:</td><td class="dt-value">${invoice.invoice_number}</td></tr>
					<tr><td class="dt-label">Date:</td><td class="dt-value">${formatDate(invoice.created_at)}</td></tr>
					<tr><td class="dt-label">Status:</td><td class="dt-value" style="color:${invoice.payment_status === 'paid' ? '#27ae60' : '#e74c3c'};text-transform:uppercase;">${invoice.payment_status}</td></tr>
				</table>
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
					<span class="totals-label">${invoice.invoice_type === 'admin' ? 'Subtotal' : 'Subtotal (Base Price)'}</span>
					<span class="totals-value">${formatCurrency(Number(invoice.subtotal) - (invoice.invoice_type === 'customer' ? platformFees : 0))}</span>
				</div>
				${invoice.invoice_type === 'customer' && platformFees > 0 ? `
				<div class="totals-row">
					<span class="totals-label">Platform Fees</span>
					<span class="totals-value">${formatCurrency(platformFees)}</span>
				</div>
				` : ''}
				${Number(invoice.vat_amount) > 0 ? `
				<div class="totals-row">
					<span class="totals-label">VAT (5%)</span>
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
					<span>Grand Total</span>
					<span>${formatCurrency(Number(invoice.total_amount))}</span>
				</div>
				<div style="margin-top:8px;font-size:10px;color:#7f8c8d;font-style:italic;text-align:right;">
					${numberToWords(Number(invoice.total_amount), invoice.currency)} Only
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
		
		<!-- Footer: Terms & Conditions + Bank Details -->
		${(invoice.terms_conditions || bankAccounts.length > 0) ? `
		<div class="footer-row">
			${invoice.terms_conditions ? `
			<div class="footer-col">
				<div class="footer-title">Terms &amp; Conditions</div>
				<div class="terms-text">${invoice.terms_conditions}</div>
			</div>
			` : ''}
			${bankAccounts.length > 0 ? `
			<div class="footer-col">
				<div class="footer-title">Bank Details</div>
				${bankAccounts.map((acc: any) => `
				<div class="bank-account">
					<div class="bank-holder">${acc.account_holder} (${acc.currency})</div>
					<span class="bank-label">A/C:</span> ${acc.account_number}<br/>
					<span class="bank-label">IBAN:</span> ${acc.iban}<br/>
					<span class="bank-label">BIC:</span> ${acc.bic || 'N/A'}<br/>
					${acc.bank_address ? `<span class="bank-label">Bank:</span> ${acc.bank_address}` : ''}
				</div>
				`).join('')}
			</div>
			` : ''}
		</div>
		` : ''}
		${adminDetails?.invoiceFooter ? `
		<div style="text-align:center;margin-top:20px;padding-top:12px;border-top:1px solid #ecf0f1;font-size:9px;color:#999;font-style:italic;">
			${adminDetails.invoiceFooter}
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
