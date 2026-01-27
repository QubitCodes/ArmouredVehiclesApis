import { NextRequest, NextResponse } from 'next/server';
import { WebFrontendController } from '@/controllers/WebFrontendController';

const controller = new WebFrontendController();

export async function GET(req: NextRequest) {
  return controller.getSliders(req);
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
             // Basic handling for repeated keys is not priority for simple updates but good to have
             if (data[key]) {
                 if (!Array.isArray(data[key])) data[key] = [data[key]];
                 data[key].push(value);
             } else {
                 data[key] = value;
             }
        }
      });

      return controller.createSlider(req, { data, files });

    } catch (e) {
      return NextResponse.json({
         status: false,
         message: 'Error parsing form data',
         code: 400,
         error: String(e)
      }, { status: 400 });
    }
  }

  // Fallback (though implementation uses upload service likely needing file)
  return controller.createSlider(req);
}
