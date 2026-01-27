export class OtpService {
  /**
   * Send OTP via SMS or Email using Twilio Verify
   * @param to Phone number (E.164) or Email address
   * @param channel 'sms' or 'email'
   */
  static async sendOtp(to: string, channel: 'sms' | 'email') {
    console.log(`[OtpService] MOCK Sending to ${to} (${channel})`);
    return { status: 'pending', valid: true, mocked: true, sid: 'mock_sid' };
  }

  /**
   * Verify the code provided by the user
   * @param to Phone number or Email
   * @param code 6-digit code
   */
  static async verifyOtp(to: string, code: string) {
    console.log(`[OtpService] MOCK Verifying ${to} with code ${code}`);
    
    if (code === '123456') {
        return { status: 'approved', valid: true };
    }
    return { status: 'failed', valid: false };
  }
}
