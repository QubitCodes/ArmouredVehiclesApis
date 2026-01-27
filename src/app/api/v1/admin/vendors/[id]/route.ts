
import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/vendors/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get vendor details
 *     description: |
 *       Retrieve detailed information for a specific vendor including their complete onboarding profile.
 *       All document URLs in the profile are returned as full absolute URLs.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Vendor user ID
 *     responses:
 *       200:
 *         description: Vendor details with complete profile
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
 *                     is_active: { type: boolean }
 *                     profile:
 *                       type: object
 *                       description: Complete onboarding profile with all submitted fields. Document URLs are full absolute URLs.
 *                       properties:
 *                         onboarding_status: { type: string, enum: [not_started, in_progress, pending_verification, approved, rejected] }
 *                         company_name: { type: string }
 *                         company_email: { type: string }
 *                         vat_certificate_url: { type: string, description: Full absolute URL }
 *                         business_license_url: { type: string, description: Full absolute URL }
 *                         company_profile_url: { type: string, description: Full absolute URL }
 *                         bank_proof_url: { type: string, description: Full absolute URL }
 *       404:
 *         description: Vendor not found
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return AdminController.getVendor(req, { params });
}
