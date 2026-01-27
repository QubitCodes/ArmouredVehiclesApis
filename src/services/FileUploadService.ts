import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class FileUploadService {
  /**
   * Saves a file to the local filesystem.
   * @param file The File object (from formData)
   * @param subdir Subdirectory inside the uploads folder (e.g., 'products/123')
   * @returns The relative path to the saved file
   */
  static async saveFile(file: File, subdir: string): Promise<string> {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Define upload base path
    // Structure: file_uploads/{subdir}/{filename}
    // Saved to public/file_uploads so Next.js serves it at /file_uploads/...
    const uploadDir = path.join(process.cwd(), 'public', 'file_uploads', subdir);
    console.log(`[FileUploadService] Saving file to: ${uploadDir}`);
    
    await mkdir(uploadDir, { recursive: true });

    const originalName = file.name;
    // Sanitize original name to remove spaces or weird chars if needed, but for now simple replacement
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_'); 
    const filename = `${uuidv4()}-${sanitizedName}`;
    const filePath = path.join(uploadDir, filename);

    await writeFile(filePath, buffer);

    return `file_uploads/${subdir}/${filename}`;
  }
}
