import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * UserProfile Model
 * Stores vendor/customer onboarding profile data
 * Separate from User model to keep auth and profile concerns separate
 */

interface UserProfileAttributes {
	id: string;
	user_id: string;
	
	// Step 0: Company Basics
	country?: string;
	company_name?: string;
	company_email?: string;
	company_phone?: string;
	company_phone_country_code?: string;
	company_website?: string;
	company_size?: string;
	company_type?: string;
	type_of_buyer?: string;
	
	// Step 1: Company Registration
	country_of_registration?: string;
	registered_company_name?: string;
	trade_brand_name?: string;
	registration_type?: string;
	legal_name?: string;
	registration_number?: string;
	year_of_establishment?: number;
	legal_entity_id?: string;
	legal_entity_issue_date?: Date;
	legal_entity_expiry_date?: Date;
	city_office_address?: string;
	official_website?: string;
	entity_type?: string;
	duns_number?: string;
	govt_compliance_reg_url?: string;
	vat_certificate_url?: string;
	tax_vat_number?: string;
	tax_id?: string;
	vat_number?: string;
	company_registration_number?: string;
	company_registration_expiry?: Date;
	founded_year?: number;
	website?: string;
	description?: string;
	city?: string;
	address_line1?: string;
	address_line2?: string;
	postal_code?: string;
	state?: string;
	tax_issuing_date?: Date;
	tax_expiry_date?: Date;
	
	// Step 2: Contact Details
	contact_full_name?: string;
	contact_job_title?: string;
	contact_work_email?: string;
	contact_id_document_url?: string;
	contact_mobile?: string;
	contact_mobile_country_code?: string;
	terms_accepted?: boolean;
	terms_accepted_at?: Date;
	
	// Step 3: Business & Compliance
	nature_of_business?: string[];
	controlled_items?: boolean;
	license_types?: string[];
	end_use_markets?: string[];
	operating_countries?: string[];
	
	// Legacy Single Fields
	end_use_market?: string;
	license_type?: string;
	license_number?: string;
	license_expiry?: Date;

    procurement_purpose?: number;
    end_user_type?: number;

	is_on_sanctions_list?: boolean;
	business_license_url?: string;
	defense_approval_url?: string;
    eocn_approval_url?: string;
    itar_registration_url?: string;
    local_authority_approval_url?: string;
	company_profile_url?: string;
	compliance_terms_accepted?: boolean;
	compliance_terms_accepted_at?: Date;
	
	// Step 4: Account Preferences
	selling_categories?: string[];
	register_as?: string;
	preferred_currency?: string;
	sponsor_content?: boolean;
	
	// Step 5: Bank Details
	payment_method?: string;
	bank_country?: string;
	financial_institution?: string;
	swift_code?: string;
	bank_account_number?: string;
	proof_type?: string;
	bank_proof_url?: string;
	
	// Verification
	verification_method?: string;
	submitted_for_approval?: boolean;
	submitted_at?: Date;
	
	// Status tracking
	current_step?: number | null;
	onboarding_status?: 'not_started' | 'in_progress' | 'pending_verification' | 'rejected' | 'approved_general' | 'approved_controlled' | 'update_needed';
    rejection_reason?: string;
    reviewed_at?: Date;
    reviewed_by?: string;
    review_note?: string;
	
	created_at?: Date;
	updated_at?: Date;
}

interface UserProfileCreationAttributes extends Optional<UserProfileAttributes, 'id' | 'current_step' | 'onboarding_status' | 'created_at' | 'updated_at'> {}

export class UserProfile extends Model<UserProfileAttributes, UserProfileCreationAttributes> implements UserProfileAttributes {
	public declare id: string;
	public declare user_id: string;
	
	// All optional fields
	public declare country?: string;
	public declare company_name?: string;
	public declare company_email?: string;
	public declare company_phone?: string;
	public declare company_phone_country_code?: string;
	public declare company_website?: string;
	public declare company_size?: string;
	public declare company_type?: string;
	public declare type_of_buyer?: string;
	public declare country_of_registration?: string;
	public declare registered_company_name?: string;
	public declare trade_brand_name?: string;
	public declare registration_type?: string;
	public declare legal_name?: string;
	public declare registration_number?: string;
	public declare year_of_establishment?: number;
	public declare legal_entity_id?: string;
	public declare legal_entity_issue_date?: Date;
	public declare legal_entity_expiry_date?: Date;
	public declare city_office_address?: string;
	public declare official_website?: string;
	public declare entity_type?: string;
	public declare duns_number?: string;
	public declare vat_certificate_url?: string;
	public declare tax_vat_number?: string;
	public declare tax_id?: string;
	public declare vat_number?: string;
	public declare company_registration_number?: string;
	public declare company_registration_expiry?: Date;
	public declare founded_year?: number;
	public declare website?: string;
	public declare description?: string;
	public declare city?: string;
	public declare address_line1?: string;
	public declare address_line2?: string;
	public declare postal_code?: string;
	public declare state?: string;
	public declare tax_issuing_date?: Date;
	public declare tax_expiry_date?: Date;
	public declare contact_full_name?: string;
	public declare contact_job_title?: string;
	public declare contact_work_email?: string;
	public declare contact_id_document_url?: string;
	public declare contact_mobile?: string;
	public declare contact_mobile_country_code?: string;
	public declare terms_accepted?: boolean;
	public declare terms_accepted_at?: Date;
	public declare nature_of_business?: string[];
	public declare controlled_items?: boolean;
	public declare license_types?: string[];
	public declare end_use_markets?: string[];
	public declare operating_countries?: string[];
	public declare end_use_market?: string;
	public declare license_type?: string;
	public declare license_number?: string;
	public declare license_expiry?: Date;
    public declare procurement_purpose?: number;
    public declare end_user_type?: number;
	public declare is_on_sanctions_list?: boolean;
	public declare business_license_url?: string;
	public declare defense_approval_url?: string;
    public declare eocn_approval_url?: string;
    public declare itar_registration_url?: string;
    public declare local_authority_approval_url?: string;
	public declare company_profile_url?: string;
	public declare compliance_terms_accepted?: boolean;
	public declare compliance_terms_accepted_at?: Date;
	public declare selling_categories?: string[];
	public declare register_as?: string;
	public declare preferred_currency?: string;
	public declare sponsor_content?: boolean;
	public declare payment_method?: string;
	public declare bank_country?: string;
	public declare financial_institution?: string;
	public declare swift_code?: string;
	public declare bank_account_number?: string;
	public declare proof_type?: string;
	public declare bank_proof_url?: string;
	public declare verification_method?: string;
	public declare submitted_for_approval?: boolean;
	public declare submitted_at?: Date;
	public declare current_step?: number;
	public declare onboarding_status?: 'not_started' | 'in_progress' | 'pending_verification' | 'rejected' | 'approved_general' | 'approved_controlled' | 'update_needed';
    public declare rejection_reason?: string;
    public declare reviewed_at?: Date;
    public declare reviewed_by?: string;
    public declare review_note?: string;
	
	public declare readonly created_at: Date;
	public declare readonly updated_at: Date;
}

UserProfile.init(
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		user_id: {
			type: DataTypes.UUID,
			allowNull: false,
			unique: true,
		},
		
		// Step 0
		country: { type: DataTypes.TEXT },
		company_name: { type: DataTypes.TEXT },
		company_email: { type: DataTypes.TEXT },
		company_phone: { type: DataTypes.TEXT },
		company_phone_country_code: { type: DataTypes.TEXT },
		company_website: { type: DataTypes.TEXT },
		company_size: { type: DataTypes.TEXT },
		company_type: { type: DataTypes.TEXT },
		type_of_buyer: { type: DataTypes.INTEGER },
		
		// Step 1
		country_of_registration: { type: DataTypes.TEXT },
		registered_company_name: { type: DataTypes.TEXT },
		trade_brand_name: { type: DataTypes.TEXT },
		registration_type: { type: DataTypes.TEXT },
		legal_name: { type: DataTypes.TEXT },
		registration_number: { type: DataTypes.TEXT },
		year_of_establishment: { type: DataTypes.INTEGER },
		legal_entity_id: { type: DataTypes.TEXT },
		legal_entity_issue_date: { type: DataTypes.DATE },
		legal_entity_expiry_date: { type: DataTypes.DATE },
		city_office_address: { type: DataTypes.TEXT },
		official_website: { type: DataTypes.TEXT },
		entity_type: { type: DataTypes.TEXT },
		duns_number: { type: DataTypes.TEXT },
		govt_compliance_reg_url: { type: DataTypes.TEXT },
		vat_certificate_url: { type: DataTypes.TEXT },
		tax_vat_number: { type: DataTypes.TEXT },
		tax_id: { type: DataTypes.TEXT },
		vat_number: { type: DataTypes.TEXT },
		company_registration_number: { type: DataTypes.TEXT },
		company_registration_expiry: { type: DataTypes.DATE },
		founded_year: { type: DataTypes.INTEGER },
		website: { type: DataTypes.TEXT },
		description: { type: DataTypes.TEXT },
		city: { type: DataTypes.TEXT },
		address_line1: { type: DataTypes.TEXT },
		address_line2: { type: DataTypes.TEXT },
		postal_code: { type: DataTypes.TEXT },
		state: { type: DataTypes.TEXT },
		tax_issuing_date: { type: DataTypes.DATE },
		tax_expiry_date: { type: DataTypes.DATE },
		
		// Step 2
		contact_full_name: { type: DataTypes.TEXT },
		contact_job_title: { type: DataTypes.TEXT },
		contact_work_email: { type: DataTypes.TEXT },
		contact_id_document_url: { type: DataTypes.TEXT },
		contact_mobile: { type: DataTypes.TEXT },
		contact_mobile_country_code: { type: DataTypes.TEXT },
		terms_accepted: { type: DataTypes.BOOLEAN, defaultValue: false },
		terms_accepted_at: { type: DataTypes.DATE },
		
		// Step 3
		nature_of_business: { type: DataTypes.ARRAY(DataTypes.TEXT) },
		controlled_items: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
		license_types: { type: DataTypes.ARRAY(DataTypes.TEXT) },
		end_use_markets: { type: DataTypes.ARRAY(DataTypes.TEXT) },
		operating_countries: { type: DataTypes.ARRAY(DataTypes.TEXT) },
		end_use_market: { type: DataTypes.TEXT },
		license_type: { type: DataTypes.TEXT },
		license_number: { type: DataTypes.TEXT },
		license_expiry: { type: DataTypes.DATE },
        procurement_purpose: { type: DataTypes.INTEGER },
        end_user_type: { type: DataTypes.INTEGER },
		is_on_sanctions_list: { type: DataTypes.BOOLEAN, defaultValue: false },
		business_license_url: { type: DataTypes.TEXT },
		defense_approval_url: { type: DataTypes.TEXT },
        eocn_approval_url: { type: DataTypes.TEXT },
        itar_registration_url: { type: DataTypes.TEXT },
        local_authority_approval_url: { type: DataTypes.TEXT },
		company_profile_url: { type: DataTypes.TEXT },
		compliance_terms_accepted: { type: DataTypes.BOOLEAN, defaultValue: false },
		compliance_terms_accepted_at: { type: DataTypes.DATE },
		
		// Step 4
		selling_categories: { type: DataTypes.ARRAY(DataTypes.TEXT) },
		register_as: { type: DataTypes.TEXT, defaultValue: 'Verified Supplier' },
		preferred_currency: { type: DataTypes.TEXT },
		sponsor_content: { type: DataTypes.BOOLEAN, defaultValue: false },
		
		// Step 5
		payment_method: { type: DataTypes.TEXT },
		bank_country: { type: DataTypes.TEXT },
		financial_institution: { type: DataTypes.TEXT },
		swift_code: { type: DataTypes.TEXT },
		bank_account_number: { type: DataTypes.TEXT },
		proof_type: { type: DataTypes.TEXT },
		bank_proof_url: { type: DataTypes.TEXT },
		
		// Verification
		verification_method: { type: DataTypes.TEXT },
		submitted_for_approval: { type: DataTypes.BOOLEAN, defaultValue: false },
		submitted_at: { type: DataTypes.DATE },
		
		// Status
		current_step: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
		onboarding_status: {
			type: DataTypes.ENUM('not_started', 'in_progress', 'pending_verification', 'rejected', 'approved_general', 'approved_controlled', 'update_needed'),
			defaultValue: 'not_started',
		},
        rejection_reason: { type: DataTypes.TEXT },
        reviewed_at: { type: DataTypes.DATE },
        reviewed_by: { type: DataTypes.UUID },
        review_note: { type: DataTypes.TEXT },
	},
	{
		sequelize,
		tableName: 'user_profiles',
		underscored: true,
		timestamps: true,
		createdAt: 'created_at',
		updatedAt: 'updated_at',
		paranoid: false,
	}
);
