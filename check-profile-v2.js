require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, { logging: false });

async function check() {
    const [profiles] = await sequelize.query(
        `SELECT * FROM user_profiles WHERE user_id = 'dfb279ad-3f85-44eb-abf6-dbaea1feae63'`
    );

    if (profiles[0]) {
        const p = profiles[0];
        console.log('--- Step 0 (Company Basics) ---');
        console.log('country:', p.country);
        console.log('company_name:', p.company_name);
        console.log('type_of_buyer:', p.type_of_buyer);

        console.log('\n--- Step 1 (Registration) ---');
        console.log('country_of_registration:', p.country_of_registration);
        console.log('legal_entity_id:', p.legal_entity_id);
        console.log('vat_certificate_url:', p.vat_certificate_url);

        console.log('\n--- Step 2 (Contact) ---');
        console.log('contact_full_name:', p.contact_full_name);
        console.log('contact_mobile:', p.contact_mobile);
        console.log('contact_id_document_url:', p.contact_id_document_url);

        console.log('\n--- Step 3 (Business) ---');
        console.log('nature_of_business:', p.nature_of_business);
        console.log('business_license_url:', p.business_license_url);

        console.log('\n--- Step 4 (Preferences) ---');
        console.log('selling_categories:', p.selling_categories);
        console.log('register_as:', p.register_as);

        console.log('\n--- Step 5 (Bank) ---');
        console.log('financial_institution:', p.financial_institution);
        console.log('bank_account_number:', p.bank_account_number);
        console.log('bank_proof_url:', p.bank_proof_url);

        console.log('\n--- Status ---');
        console.log('onboarding_status:', p.onboarding_status);
        console.log('current_step:', p.current_step);
    } else {
        console.log('No profile found');
    }

    process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
