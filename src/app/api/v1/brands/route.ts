import { NextRequest } from "next/server";
import { BrandController } from "@/controllers/BrandController";

const controller = new BrandController();

/**
 * @swagger
 * /api/v1/brands:
 *   get:
 *     summary: List all brands
 *     tags: [Brands]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of brands
 */
export async function GET(req: NextRequest) {
  return controller.list(req);
}

/**
 * @swagger
 * /api/v1/brands:
 *   post:
 *     summary: Create a brand
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               icon:
 *                 type: string
 *     responses:
 *       201:
 *         description: Brand created
 */
export async function POST(req: NextRequest) {
  return controller.create(req);
}
