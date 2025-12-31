import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'ArmoredMart <noreply@armoredmart.com>';

const resendClient = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function sendOtpEmail(
  to: string,
  otpCode: string,
  name: string
): Promise<boolean> {
  if (!resendClient) {
    console.error('[Email] RESEND_API_KEY is not configured');
    return false;
  }

  try {
    await resendClient.emails.send({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject: 'Your ArmoredMart Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3D4736 0%, #2A2A2A 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: #D97706; margin: 0; font-size: 28px;">ArmoredMart</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">B2B Defense Vehicle Parts Marketplace</p>
          </div>
          <div style="background: #1C1C1C; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #3D4736; border-top: none;">
            <h2 style="color: #ffffff; margin: 0 0 20px 0;">Hello ${name},</h2>
            <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
              Your verification code is:
            </p>
            <div style="background: #2A2A2A; border: 2px solid #D97706; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #D97706; letter-spacing: 8px;">${otpCode}</span>
            </div>
            <p style="color: #999999; font-size: 14px;">
              This code expires in 10 minutes. If you didn't request this code, please ignore this email.
            </p>
          </div>
          <p style="color: #666666; font-size: 12px; text-align: center; margin-top: 20px;">
            © 2024 ArmoredMart. All rights reserved.
          </p>
        </div>
      `
    });

    console.log('[Email] OTP sent successfully to:', to);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send OTP:', error);
    return false;
  }
}
