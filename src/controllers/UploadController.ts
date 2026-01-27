
import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { UploadHandler, UploadConfigLabel } from '../services/UploadHandler';

export class UploadController extends BaseController {

    /**
     * POST /api/v1/upload/files
     * Generic file upload endpoint.
     * Content-Type: multipart/form-data
     */
    async upload(req: NextRequest) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const contentType = req.headers.get('content-type') || '';
            if (!contentType.includes('multipart/form-data')) {
                return this.sendError('Content-Type must be multipart/form-data', 415);
            }

            const formData = await req.formData();
            
            const label = formData.get('label') as string;
            if (!label) {
                return this.sendError('Missing required field: label', 400);
            }

            // Extract 'data' object (for path variables & lookup)
            const dataStr = formData.get('data') as string;
            let data: Record<string, any> = {};
            try {
                if (dataStr) {
                    data = JSON.parse(dataStr);
                }
            } catch (e) {
                return this.sendError('Invalid JSON format for data field', 400);
            }

            // Add user_id to data if not present, as it's commonly used
            if (!data.user_id) {
                data.user_id = user!.id;
            }

            const updateDb = formData.get('updateDb') === 'true';

            // Get Files
            // We assume key is 'files' or 'file'
            let files = formData.getAll('files') as File[];
            if (files.length === 0) {
                 files = formData.getAll('file') as File[];
            }

            if (files.length === 0) {
                return this.sendError('No files uploaded', 400);
            }

            const result = await UploadHandler.handle(
                files.length === 1 ? files[0] : files,
                label as UploadConfigLabel,
                data,
                updateDb
            );

            if (!result.status) {
                return this.sendError(result.message, result.code, result.errors);
            }

            return this.sendSuccess(result.data, result.message, result.code, result.misc);

        } catch (error: any) {
            console.error('UploadController Error:', error);
            return this.sendError(error.message, 500);
        }
    }
}
