import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const envCheck = {
      SID: !!process.env.TWILIO_ACCOUNT_SID,
      Token: !!process.env.TWILIO_AUTH_TOKEN,
      Service: !!process.env.TWILIO_VERIFY_SERVICE_SID,
    };

    // Dynamic import to catch module errors
    const { OtpService } = await import('@/services/OtpService');
    
    const result = await OtpService.sendOtp('+919400143527', 'sms');

    return NextResponse.json({ success: true, envCheck, result });
  } catch (error: any) {
    console.error('[TestOTP] Error caught:', error);
    
    // Attempt file write again just in case
    try {
        const fs = require('fs');
        fs.writeFileSync('debug_error.log', `Error: ${error.message}\nStack: ${error.stack}`);
    } catch (fsErr) {
        console.error('[TestOTP] Failed to write log:', fsErr);
    }

    return NextResponse.json({ 
      success: false, 
      error: error.message, 
      stack: error.stack
    }, { status: 500 });
  }
}
