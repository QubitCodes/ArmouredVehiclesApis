
import 'dotenv/config';
import { EmailService } from '../services/EmailService';

// Ensure you run this with: npx tsx src/scripts/test_email.ts

async function testEmail() {
    // You can hardcode an email here for testing or pass it as an argument
    // e.g. npx tsx src/scripts/test_email.ts test@example.com
    const targetEmail = process.argv[2];

    if (!targetEmail) {
        console.error("Please provide an email address as an argument (e.g., test@example.com)");
        process.exit(1);
    }

    console.log(`Attempting to send test Email to: ${targetEmail}`);

    try {
        await EmailService.sendEmail(
            targetEmail, 
            "Test Email from Armoured Vehicles App",
            "<h1>It Works!</h1><p>This is a test email sent via SendGrid.</p>"
        );
        console.log("✅ Email sent successfully! Check your inbox.");
    } catch (error: any) {
        console.error("❌ Failed to send Email:", error.message);
        if (error.message.includes("not configured")) {
            console.log("ℹ️  Tip: Make sure SENDGRID_API_KEY and SENDGRID_FROM_EMAIL are set in .env");
        }
    }
}

testEmail();
