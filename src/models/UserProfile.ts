import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * UserProfileAttributes Interface
 * Matches the optimized user_profiles table schema
 */
export interface UserProfileAttributes {
	id: string;
	user_id: string;

	// STEP 0: Company Basics (Initial Onboarding)
	country?: string;
	city?: string;
	postal_code?: string;
	company_name?: string;
	company_email?: string;
	company_phone?: string;
	company_phone_country_code?: string;
	type_of_buyer?: number;
	year_of_establishment?: number;
	city_office_address?: string;
	address_line1?: string;
	address_line2?: string;
	state?: string;
	official_website?: string;
	govt_compliance_reg_url?: string;

	// STEP 1: Company Registration Details
	country_of_registration?: string;
	registered_company_name?: string;
	trade_brand_name?: string;
	entity_type?: number;
	legal_entity_id?: string;
	legal_entity_issue_date?: Date;
	legal_entity_expiry_date?: Date;
	duns_number?: string;
	vat_certificate_url?: string;
	tax_vat_number?: string;
	tax_issuing_date?: Date;
	tax_expiry_date?: Date;

	// STEP 2: Contact Person Details
	contact_full_name?: string;
	contact_job_title?: string;
	contact_work_email?: string;
	contact_id_document_url?: string;
	contact_mobile?: string;
	contact_mobile_country_code?: string;
	terms_accepted?: boolean;
	terms_accepted_at?: Date;

	// STEP 3: Business Activity & Compliance
	nature_of_business?: string[];
	controlled_items: boolean;
	license_types?: string[];
	end_use_markets?: string[];
	operating_countries?: string[];
	procurement_purpose?: number;
	end_user_type?: number;
	is_on_sanctions_list?: boolean;
	business_license_url?: string;
	defense_approval_url?: string;
	mod_license_url?: string;
	eocn_approval_url?: string;
	itar_registration_url?: string;
	local_authority_approval_url?: string;
	company_profile_url?: string;
	compliance_terms_accepted?: boolean;
	compliance_terms_accepted_at?: Date;

	// STEP 4: Account Preferences
	selling_categories?: string[];
	register_as?: string;
	preferred_currency?: string;
	sponsor_content?: boolean;

	// STEP 5: Bank Details
	payment_method?: string;
	bank_country?: string;
	financial_institution?: string;
	swift_code?: string;
	bank_account_number?: string;
	proof_type?: string;
	bank_proof_url?: string;

	// VERIFICATION & WORKFLOW
	submitted_for_approval?: boolean;
	submitted_at?: Date;
	current_step: number | null;
	onboarding_status: 'not_started' | 'in_progress' | 'pending_verification' | 'rejected' | 'approved_general' | 'approved_controlled' | 'update_needed';
	rejection_reason?: string;
	reviewed_at?: Date;
	reviewed_by?: string;
	review_note?: string;

	// TIMESTAMPS & SOFT DELETE
	created_at?: Date;
	updated_at?: Date;
	deleted_at?: Date | null;
	delete_reason?: string | null;

	// SPECIALIZED DISCOUNT
	discount?: number;
}

/**
 * UserProfile Creation Attributes
 */
export interface UserProfileCreationAttributes extends Optional<UserProfileAttributes, 'id' | 'controlled_items' | 'current_step' | 'onboarding_status' | 'created_at' | 'updated_at' | 'deleted_at' | 'delete_reason'> { }

/**
 * UserProfile Model
 * Implements the optimized schema with soft deletes and UUIDs
 */
export class UserProfile extends Model<UserProfileAttributes, UserProfileCreationAttributes> implements UserProfileAttributes {
	public declare id: string;
	public declare user_id: string;

	public declare country?: string;
	public declare city?: string;
	public declare postal_code?: string;
	public declare company_name?: string;
	public declare company_email?: string;
	public declare company_phone?: string;
	public declare company_phone_country_code?: string;
	public declare type_of_buyer?: number;
	public declare year_of_establishment?: number;
	public declare city_office_address?: string;
	public declare address_line1?: string;
	public declare address_line2?: string;
	public declare state?: string;
	public declare official_website?: string;
	public declare govt_compliance_reg_url?: string;

	public declare country_of_registration?: string;
	public declare registered_company_name?: string;
	public declare trade_brand_name?: string;
	public declare entity_type?: number;
	public declare legal_entity_id?: string;
	public declare legal_entity_issue_date?: Date;
	public declare legal_entity_expiry_date?: Date;
	public declare duns_number?: string;
	public declare vat_certificate_url?: string;
	public declare tax_vat_number?: string;
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
	public declare controlled_items: boolean;
	public declare license_types?: string[];
	public declare end_use_markets?: string[];
	public declare operating_countries?: string[];
	public declare procurement_purpose?: number;
	public declare end_user_type?: number;
	public declare is_on_sanctions_list?: boolean;
	public declare business_license_url?: string;
	public declare defense_approval_url?: string;
	public declare mod_license_url?: string;
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

	public declare submitted_for_approval?: boolean;
	public declare submitted_at?: Date;
	public declare current_step: number | null;
	public declare onboarding_status: 'not_started' | 'in_progress' | 'pending_verification' | 'rejected' | 'approved_general' | 'approved_controlled' | 'update_needed';
	public declare rejection_reason?: string;
	public declare reviewed_at?: Date;
	public declare reviewed_by?: string;
	public declare review_note?: string;

	public declare readonly created_at: Date;
	public declare readonly updated_at: Date;
	public declare readonly deleted_at: Date | null;
	public declare delete_reason: string | null;

	public declare discount?: number;
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
			references: {
				model: 'users',
				key: 'id'
			},
			onDelete: 'CASCADE'
		},

		// STEP 0: Company Basics
		country: { type: DataTypes.TEXT },
		city: { type: DataTypes.TEXT },
		postal_code: { type: DataTypes.TEXT },
		company_name: { type: DataTypes.TEXT },
		company_email: { type: DataTypes.TEXT },
		company_phone: { type: DataTypes.TEXT },
		company_phone_country_code: { type: DataTypes.TEXT },
		type_of_buyer: { type: DataTypes.INTEGER },
		year_of_establishment: { type: DataTypes.INTEGER },
		city_office_address: { type: DataTypes.TEXT },
		address_line1: { type: DataTypes.TEXT },
		address_line2: { type: DataTypes.TEXT },
		state: { type: DataTypes.TEXT },
		official_website: { type: DataTypes.TEXT },
		govt_compliance_reg_url: { type: DataTypes.TEXT },

		// STEP 1: Company Registration Details
		country_of_registration: { type: DataTypes.TEXT },
		registered_company_name: { type: DataTypes.TEXT },
		trade_brand_name: { type: DataTypes.TEXT },
		entity_type: {
			type: DataTypes.INTEGER,
			references: {
				model: 'ref_entity_types',
				key: 'id'
			},
			onDelete: 'SET NULL'
		},
		legal_entity_id: { type: DataTypes.TEXT },
		legal_entity_issue_date: { type: DataTypes.DATE },
		legal_entity_expiry_date: { type: DataTypes.DATE },
		duns_number: { type: DataTypes.TEXT },
		vat_certificate_url: { type: DataTypes.TEXT },
		tax_vat_number: { type: DataTypes.TEXT },
		tax_issuing_date: { type: DataTypes.DATE },
		tax_expiry_date: { type: DataTypes.DATE },

		// STEP 2: Contact Person Details
		contact_full_name: { type: DataTypes.TEXT },
		contact_job_title: { type: DataTypes.TEXT },
		contact_work_email: { type: DataTypes.TEXT },
		contact_id_document_url: { type: DataTypes.TEXT },
		contact_mobile: { type: DataTypes.TEXT },
		contact_mobile_country_code: { type: DataTypes.TEXT },
		terms_accepted: { type: DataTypes.BOOLEAN, defaultValue: false },
		terms_accepted_at: { type: DataTypes.DATE },

		// STEP 3: Business Activity & Compliance
		nature_of_business: { type: DataTypes.ARRAY(DataTypes.TEXT) },
		controlled_items: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
		license_types: { type: DataTypes.ARRAY(DataTypes.TEXT) },
		end_use_markets: { type: DataTypes.ARRAY(DataTypes.TEXT) },
		operating_countries: { type: DataTypes.ARRAY(DataTypes.TEXT) },
		procurement_purpose: { type: DataTypes.INTEGER },
		end_user_type: { type: DataTypes.INTEGER },
		is_on_sanctions_list: { type: DataTypes.BOOLEAN, defaultValue: false },
		business_license_url: { type: DataTypes.TEXT },
		defense_approval_url: { type: DataTypes.TEXT },
		mod_license_url: { type: DataTypes.TEXT },
		eocn_approval_url: { type: DataTypes.TEXT },
		itar_registration_url: { type: DataTypes.TEXT },
		local_authority_approval_url: { type: DataTypes.TEXT },
		company_profile_url: { type: DataTypes.TEXT },
		compliance_terms_accepted: { type: DataTypes.BOOLEAN, defaultValue: false },
		compliance_terms_accepted_at: { type: DataTypes.DATE },

		// STEP 4: Account Preferences
		selling_categories: { type: DataTypes.ARRAY(DataTypes.TEXT) },
		register_as: { type: DataTypes.TEXT, defaultValue: 'Verified Supplier' },
		preferred_currency: { type: DataTypes.TEXT },
		sponsor_content: { type: DataTypes.BOOLEAN, defaultValue: false },

		// STEP 5: Bank Details
		payment_method: { type: DataTypes.TEXT },
		bank_country: { type: DataTypes.TEXT },
		financial_institution: { type: DataTypes.TEXT },
		swift_code: { type: DataTypes.TEXT },
		bank_account_number: { type: DataTypes.TEXT },
		proof_type: { type: DataTypes.TEXT },
		bank_proof_url: { type: DataTypes.TEXT },

		// VERIFICATION & WORKFLOW
		submitted_for_approval: { type: DataTypes.BOOLEAN, defaultValue: false },
		submitted_at: { type: DataTypes.DATE },
		current_step: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
		onboarding_status: {
			type: DataTypes.ENUM('not_started', 'in_progress', 'pending_verification', 'rejected', 'approved_general', 'approved_controlled', 'update_needed'),
			defaultValue: 'not_started',
		},
		rejection_reason: { type: DataTypes.TEXT },
		reviewed_at: { type: DataTypes.DATE },
		reviewed_by: {
			type: DataTypes.UUID,
			references: {
				model: 'users',
				key: 'id'
			},
			onDelete: 'SET NULL'
		},
		review_note: { type: DataTypes.TEXT },

		// SOFT DELETE
		deleted_at: { type: DataTypes.DATE },
		delete_reason: { type: DataTypes.TEXT },

		// SPECIALIZED DISCOUNT
		discount: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 }
	},
	{
		sequelize,
		tableName: 'user_profiles',
		modelName: 'UserProfile',
		underscored: true,
		timestamps: true,
		createdAt: 'created_at',
		updatedAt: 'updated_at',
		deletedAt: 'deleted_at',
		paranoid: true,
	}
);
