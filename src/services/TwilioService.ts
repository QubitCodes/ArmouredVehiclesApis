
import twilio from 'twilio';

// Lazy initialization
let client: twilio.Twilio | null = null;

export class TwilioService {

    private static getClient() {
        if (client) return client;

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;

        if (!accountSid || !authToken) {
            throw new Error("Twilio credentials (ACCOUNT_SID or AUTH_TOKEN) are missing in environment variables.");
        }

        try {
            client = twilio(accountSid.trim(), authToken.trim());
            return client;
        } catch (error) {
            console.error("Failed to initialize Twilio client:", error);
            throw error;
        }
    }

    /**
     * Send an SMS using Twilio Programmable Messaging
     * @param to - The recipient's phone number (E.164 format, e.g., +1234567890)
     * @param body - The message content
     */
    static async sendSms(to: string, body: string): Promise<void> {
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;
        
        if (!fromNumber) {
            throw new Error("TWILIO_PHONE_NUMBER is missing in environment variables.");
        }

        try {
            const twilioClient = this.getClient();
            const message = await twilioClient.messages.create({
                body: body,
                from: fromNumber,
                to: to
            });
            console.log(`SMS sent successfully to ${to}. SID: ${message.sid}`);
        } catch (error: any) {
            console.error(`Error sending SMS to ${to}:`, error);
            throw new Error(`Failed to send SMS: ${error.message}`);
        }
    }
}
