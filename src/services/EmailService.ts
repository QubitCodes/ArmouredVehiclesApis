
import sgMail from '@sendgrid/mail';

// Lazy initialization check
let isInitialized = false;

export class EmailService {

    private static initialize() {
        if (isInitialized) return;

        const apiKey = process.env.SENDGRID_API_KEY;
        if (!apiKey) {
            throw new Error("SENDGRID_API_KEY is missing in environment variables.");
        }

        sgMail.setApiKey(apiKey.trim());
        isInitialized = true;
    }

    /**
     * Send an Email using SendGrid
     * @param to - Recipient email
     * @param subject - Email subject
     * @param html - Email content (HTML)
     */
    static async sendEmail(to: string, subject: string, html: string): Promise<void> {
        // Since user might add credentials later, we try to initialize on every call
        // If it fails, we log it but don't crash the whole app flow if possible?
        // Actually, for OTP, if we can't send, we should probably throw so the user knows.
        
        try {
            this.initialize();
        } catch (error: any) {
             console.error("EmailService Initialization Failed:", error.message);
             // Re-throw so the controller knows delivery failed
             throw new Error("Email service not configured.");
        }

        const fromEmail = process.env.SENDGRID_FROM_EMAIL;
        if (!fromEmail) {
            console.error("SENDGRID_FROM_EMAIL is missing.");
             throw new Error("Email service not configured (Missing Sender).");
        }

        const msg = {
            to,
            from: fromEmail.trim(), // Change to your verified sender
            subject,
            html,
        };

        try {
            console.log(`Attempting to send email to ${to} from ${fromEmail.trim()}...`);
            const response = await sgMail.send(msg);
            console.log(`Email Service Response: Status Code ${response[0].statusCode}`);
            console.log(`Email sent successfully to ${to}`);
        } catch (error: any) {
            console.error(`Error sending email to ${to}:`, error);
            if (error.response) {
                console.error('SendGrid Error Body:', JSON.stringify(error.response.body, null, 2));
            }
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }
}
