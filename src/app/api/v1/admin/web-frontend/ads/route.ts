import { NextRequest, NextResponse } from 'next/server';
import { WebFrontendController } from '@/controllers/WebFrontendController';

const controller = new WebFrontendController();

export async function GET(req: NextRequest) {
  return controller.getAds(req);
}

export async function POST(req: NextRequest) {
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

      return controller.createAd(req, { data, files });

    } catch (e) {
      return NextResponse.json({
         status: false,
         message: 'Error parsing form data',
         code: 400,
         error: String(e)
      }, { status: 400 });
    }
  }

  return controller.createAd(req);
}
