
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { EmailService } from '../services/EmailService.js';

async function test() {
    console.log('--- Starting Email Test ---');
    console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
    console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);
    
    try {
        await EmailService.sendEmail(
            'mail@iamjk.in',
            'Test Email from Debug Script',
            '<p>This is a test email to verify SendGrid configuration.</p>'
        );
        console.log('--- Email Test Completed Successfully ---');
    } catch (error) {
        console.error('--- Email Test Failed ---');
        console.error(error);
    }
}

test();
