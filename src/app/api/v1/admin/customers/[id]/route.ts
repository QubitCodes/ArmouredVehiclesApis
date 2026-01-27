
import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/customers/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get customer details
 *     description: |
 *       Retrieve detailed information for a specific customer.
 *       - **Admins**: Full customer details including onboarding profile with all fields and document URLs
 *       - **Vendors**: Limited fields (id, name, email, phone, country_code) only if customer bought their products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer user ID
 *     responses:
 *       200:
 *         description: Customer details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     name: { type: string }
 *                     email: { type: string }
 *                     phone: { type: string }
 *                     is_active: { type: boolean }
 *                     profile:
 *                       type: object
 *                       description: (Admin only) Complete onboarding profile. Document URLs are full absolute URLs.
 *                       properties:
 *                         onboarding_status: { type: string }
 *                         company_name: { type: string }
 *                         vat_certificate_url: { type: string, description: Full absolute URL }
 *                         business_license_url: { type: string, description: Full absolute URL }
 *       404:
 *         description: Customer not found
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return AdminController.getCustomer(req, { params });
}
