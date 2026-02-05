
import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const controller = new ProductController();

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return controller.getById(req, { params });
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData();
      const data: any = {};
      let coverImage: File | null = null;
      const files: File[] = [];

      formData.forEach((value, key) => {
        if (key === 'coverImage' && value instanceof File) {
          coverImage = value;
        } else if (key === 'files' && value instanceof File) {
          files.push(value);
        } else if (value instanceof File) {
          files.push(value);
        } else {
          if (data[key]) {
            if (!Array.isArray(data[key])) data[key] = [data[key]];
            data[key].push(value);
          } else {
            data[key] = value;
          }
        }
      });

      return controller.update(req, { params, parsedData: { data, files, coverImage } });
    } catch (e) {
      return Response.json({
        status: false,
        message: 'Error parsing form data',
        code: 400,
        error: String(e)
      }, { status: 400 });
    }
  }

  return controller.update(req, { params });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return controller.delete(req, { params });
}
