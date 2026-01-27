
import { NextRequest } from 'next/server';
import { UploadController } from '@/controllers/UploadController';

const controller = new UploadController();

/**
 * @swagger
 * /api/v1/upload/files:
 *   post:
 *     summary: Generic File Upload
 *     description: Uploads files based on a configuration label. Supports optional database updates.
 *     tags:
 *       - Uploads
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - label
 *               - files
 *             properties:
 *               label:
 *                 type: string
 *                 description: |
 *                   Configuration label from UploadHandler (e.g., CUSTOMER_REGISTRATION_FILE, VENDOR_VAT_CERTIFICATE).
 *                   This determines the storage path and target database column.
 *                 example: CUSTOMER_REGISTRATION_FILE
 *               data:
 *                 type: string
 *                 format: json
 *                 description: |
 *                   JSON string containing variables for path replacement (e.g. { "user_id": "..." }) 
 *                   and lookup fields for database updates. if "user_id" is missing, it injects the authenticated user's ID.
 *                 example: '{"user_id": "123e4567-e89b-12d3-a456-426614174000"}'
 *               updateDb:
 *                 type: boolean
 *                 description: If true, updates the database record specified in the config using the path/url of the uploaded file.
 *                 default: false
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: One or more files to upload.
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Files uploaded successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of relative paths to the uploaded files.
 *                   example: ["file_uploads/users/123/documents/uuid-file.pdf"]
 *       400:
 *         description: Bad Request (Missing label, invalid JSON, no files)
 *       41:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export async function POST(req: NextRequest) {
  return controller.upload(req);
}
