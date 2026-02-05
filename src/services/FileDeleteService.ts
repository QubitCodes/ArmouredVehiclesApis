import { unlink } from 'fs/promises';
import path from 'path';

/**
 * FileDeleteService
 * Centralized utility for deleting files from the public directory.
 */
export class FileDeleteService {
    /**
     * Deletes a file from the filesystem.
     * @param relativePath The path relative to `public/` (e.g., 'file_uploads/products/SKU/gallery/abc.png')
     * @returns True if deletion was successful or file didn't exist, false on error.
     */
    static async deleteFile(relativePath: string): Promise<boolean> {
        try {
            // Construct absolute path
            const absolutePath = path.join(process.cwd(), 'public', relativePath);
            console.log(`[FileDeleteService] Deleting file: ${absolutePath}`);

            await unlink(absolutePath);
            return true;
        } catch (error: any) {
            // ENOENT means file doesn't exist, which is fine
            if (error.code === 'ENOENT') {
                console.log(`[FileDeleteService] File already missing: ${relativePath}`);
                return true;
            }
            console.error(`[FileDeleteService] Failed to delete file: ${relativePath}`, error.message);
            return false;
        }
    }
}
