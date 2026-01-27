
import 'dotenv/config';
import { TwilioService } from '../services/TwilioService';

// Ensure you run this with: npx tsx src/scripts/test_sms.ts

async function testSms() {
    // You can hardcode a number here for testing or pass it as an argument
    // e.g. npx tsx src/scripts/test_sms.ts +1234567890
    const targetNumber = process.argv[2];

    if (!targetNumber) {
        console.error("Please provide a phone number as an argument (e.g., +1234567890)");
        process.exit(1);
    }

    console.log(`Attempting to send test SMS to: ${targetNumber}`);

    try {
        await TwilioService.sendSms(targetNumber, "This is a test message from Armoured Vehicles App via Twilio!");
        console.log("✅ SMS sent successfully! Check your phone.");
    } catch (error) {
        console.error("❌ Failed to send SMS:", error);
    }
}

testSms();
