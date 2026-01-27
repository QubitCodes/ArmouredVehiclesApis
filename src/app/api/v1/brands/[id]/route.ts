import { NextRequest } from "next/server";
import { BrandController } from "@/controllers/BrandController";

const controller = new BrandController();

/**
 * @swagger
 * /api/v1/brands/{id}:
 *   put:
 *     summary: Update a brand
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               icon:
 *                 type: string
 *     responses:
 *       200:
 *         description: Brand updated
 * 
 *   delete:
 *     summary: Delete a brand
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Brand deleted
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return controller.update(req, { params });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return controller.delete(req, { params });
}
