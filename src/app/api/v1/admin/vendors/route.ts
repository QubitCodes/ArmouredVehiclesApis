
import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/vendors:
 *   get:
 *     tags: [Admin]
 *     summary: List all vendors
 *     description: |
 *       Retrieve a paginated list of vendors with their complete onboarding profile data.
 *       By default only shows vendors who completed onboarding (approved or pending_verification).
 *       All document URLs in the profile are returned as full absolute URLs.
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, suspended]
 *         description: Filter by account status
 *       - in: query
 *         name: onboarding_status
 *         schema:
 *           type: string
 *           enum: [not_started, in_progress, pending_verification, approved, rejected]
 *         description: Filter by onboarding status. If not provided, defaults to approved or pending_verification.
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of vendors with complete profile data
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Vendor'
 *                     misc:
 *                       type: object
 *                       properties:
 *                         total: { type: integer }
 *                         page: { type: integer }
 *                         pages: { type: integer }
 */
export async function GET(req: NextRequest) {
  return AdminController.getVendors(req);
}
