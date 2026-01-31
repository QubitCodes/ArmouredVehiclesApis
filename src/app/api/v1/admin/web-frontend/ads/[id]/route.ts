import { NextRequest, NextResponse } from 'next/server';
import { WebFrontendController } from '@/controllers/WebFrontendController';

const controller = new WebFrontendController();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = { params };
  const contentType = req.headers.get('content-type') || '';
  
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData();
      const data: any = {};
      const files: File[] = [];

      formData.forEach((value, key) => {
        if (value instanceof File) {
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

      return controller.updateAd(req, context, { data, files });

    } catch (e) {
      return NextResponse.json({
         status: false,
         message: 'Error parsing form data',
         code: 400,
         error: String(e)
      }, { status: 400 });
    }
  }

  return controller.updateAd(req, context);
}

export const PATCH = PUT;

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return controller.deleteAd(req, { params });
}
