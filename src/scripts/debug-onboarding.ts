
import 'dotenv/config';
import path from 'path';
import fs from 'fs';

// Manually load .env if needed
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}

import { sequelize } from '../config/database';
import { User, UserProfile } from '../models';
import { OnboardingController } from '../controllers/OnboardingController';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Mock NextRequest
const createMockRequest = (body: any, userId: string) => {
    return {
        json: async () => body,
        formData: async () => {
            const formData = new Map();
            for (const [key, value] of Object.entries(body)) {
                formData.set(key, value);
            }
            return formData;
        },
        headers: {
            get: () => 'test-user-agent'
        },
        user: { id: userId, user_type: 'vendor' } // Mocking the attached user from middleware
    } as unknown as NextRequest;
};

// We need to bypass verifyAuth in the controller for this test
class TestOnboardingController extends OnboardingController {
    mockUserId: string = '';

    async verifyAuth(req: NextRequest) {
        return { user: { id: this.mockUserId, user_type: 'vendor' } as any, error: null };
    }
}

async function testOnboardingStatusFlow() {
    // console.log('Env Check:', process.env.DATABASE_URL ? 'Loaded' : 'Missing');
    
    const controller = new TestOnboardingController();
    const mockEmail = `test_${Date.now()}@example.com`;
    const mockPhone = `123${Date.now().toString().slice(-7)}`;
    
    try {
        console.log('--- Starting Onboarding Status Test ---');
        await sequelize.authenticate();

        // 1. Create User (Simulate Registration)
        const userId = crypto.randomUUID();
        controller.mockUserId = userId;
        
        const user = await User.create({
            id: userId,
            name: 'Test Vendor',
            email: mockEmail,
            username: `user_${Date.now()}`,
            user_type: 'vendor', // Corrected from 'vendor'
            phone: mockPhone,
            email_verified: true,
            phone_verified: false, // Simulating "While email / phone verification"
            is_active: true
        } as any);

        console.log('1. User Created (Email Verified, Phone NOT Verified)');
        console.log('   Expected Status: not_started (Implicit/No Profile)');
        let profile = await UserProfile.findOne({ where: { user_id: userId } });
        console.log(`   Profile exists? ${!!profile}`);
        
        // 2. Step 0 (Company Basics)
        console.log('\n2. Executing Step 0 (Starting Onboarding)...');
        await controller.step0(createMockRequest({
            country: 'UAE',
            companyName: 'Test Co',
            companyEmail: 'info@test.co'
        }, userId));
        
        profile = await UserProfile.findOne({ where: { user_id: userId } });
        console.log(`   Status: ${profile?.onboarding_status} (Expected: in_progress)`);
        console.log(`   Current Step: ${profile?.current_step}`);

        // 3. Step 5 (Simulate jumping to almost end)
        console.log('\n3. Executing Step 5 (Bank Details)...');
        // We skip steps 1-4 for brevity, assume they keep it in_progress
        const reqStep5 = {
            paymentMethod: 'Bank Transfer',
            bankCountry: 'UAE',
            financialInstitution: 'Test Bank',
            bankAccountNumber: '1234567890',
            proofType: 'statement',
            bankProofUrl: 'http://example.com/proof.pdf',
            isDraft: 'false'
        };
        // Use formData mock
        await controller.step5({
            ...createMockRequest(reqStep5, userId),
            formData: async () => {
                const map: any = {
                    get: (key: string) => (reqStep5 as any)[key]
                };
                return map;
            }
        } as any);

        profile = await UserProfile.findOne({ where: { user_id: userId } });
        console.log(`   Status: ${profile?.onboarding_status} (Expected: in_progress)`);
        console.log(`   Current Step: ${profile?.current_step}`);

        // 4. Submit Verification (The Last Step)
        console.log('\n4. Executing Submit Verification...');
        await controller.submitVerification(createMockRequest({
            verificationMethod: 'passport'
        }, userId));

        profile = await UserProfile.findOne({ where: { user_id: userId } });
        const freshUser = await User.findByPk(userId);

        console.log(`   Status: ${profile?.onboarding_status} (Expected: pending_verification)`);
        console.log(`   is_active: ${freshUser?.is_active} (Note: This defaults to true)`);
        console.log(`   Profile Current Step: ${profile?.current_step} (Expected: null)`);
        console.log(`   User Onboarding Step: ${freshUser?.onboarding_step} (Expected: null)`);
        console.log(`   Submitted For Approval: ${profile?.submitted_for_approval}`);

        console.log('\n--- Test Completed ---');

    } catch (error: any) {
        console.error('Test Failed:', error);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

testOnboardingStatusFlow();
