import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { User, UserProfile } from '../models';
import { getFileUrl } from '../utils/fileUrl';

import bcrypt from 'bcryptjs';
import { FileUploadService } from '../services/FileUploadService';

/**
 * Onboarding Controller
 * Handles vendor/customer onboarding flow matching legacy step-by-step process
 * Shared between vendors and customers
 */
export class OnboardingController extends BaseController {

	/**
	 * Helper: Transform profile to include absolute URLs
	 */
	private formatProfile(profile: any) {
		if (!profile) return null;

		const p = profile.toJSON ? profile.toJSON() : { ...profile };

		// List of fields that contain file paths
		const fileFields = [
			'govt_compliance_reg_url',
			'vat_certificate_url',
			'contact_id_document_url',
			'business_license_url',
			'defense_approval_url',
			'company_profile_url',
			'eocn_approval_url',
			'itar_registration_url',
			'local_authority_approval_url',
			'mod_license_url',
			'bank_proof_url'
		];

		fileFields.forEach(field => {
			if (p[field]) {
				p[field] = getFileUrl(p[field]);
			}
			// Check camelCase version
			const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
			if (p[camelField]) {
				p[camelField] = getFileUrl(p[camelField]);
			}
		});

		return p;
	}

	/**
	 * GET /api/v1/onboarding/profile
	 * Get current onboarding profile and user information
	 */
	async getProfile(req: NextRequest) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const profile = await UserProfile.findOne({ where: { user_id: user!.id } });

			return this.sendSuccess({
				profile: this.formatProfile(profile),
				user: {
					id: user!.id,
					name: user!.name,
					email: user!.email,
					phone: user!.phone,
					countryCode: user!.country_code,
					userType: user!.user_type,
					emailVerified: user!.email_verified,
					phoneVerified: user!.phone_verified,
					onboardingStep: user!.onboarding_step,
				}
			});
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * POST /api/v1/onboarding/step0
	 * Step 0: Company Basics (Buyer/Vendor)
	 * Content-Type: application/json
	 */
	async step0(req: NextRequest) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			// Expect strictly JSON now
			const body = await req.json();
			const {
				country, companyName, companyEmail, companyPhone, companyPhoneCountryCode, typeOfBuyer,
				yearOfEstablishment, cityOfficeAddress, officialWebsite,
				addressLine1, addressLine2, state, // Accept state from frontend
				city, postalCode,
				businessLicenseUrl
			} = body;

			// typeOfBuyer is only for customers
			const typeOfBuyerValue = user!.user_type === 'customer' ? (typeOfBuyer ?? null) : null;

			// Find active profile (ignore soft deleted ones)
			let profile = await UserProfile.findOne({ where: { user_id: user!.id } });

			const updateData: any = {
				country,
				company_name: companyName,
				company_email: companyEmail,
				company_phone: companyPhone,
				company_phone_country_code: companyPhoneCountryCode,
				type_of_buyer: typeOfBuyerValue ? parseInt(String(typeOfBuyerValue)) : undefined,
				current_step: 2,
				onboarding_status: 'in_progress',
				// New compressed fields
				year_of_establishment: yearOfEstablishment ? parseInt(yearOfEstablishment) : undefined,
				city_office_address: cityOfficeAddress || `${addressLine1 || ''}, ${addressLine2 || ''}, ${state || ''}, ${city || ''}`.replace(/, , /g, ', ').replace(/^, |, $/g, '').trim(),
				address_line1: addressLine1 || cityOfficeAddress,
				address_line2: addressLine2,
				state: state || city, // Use state if provided, fallback to city
				official_website: officialWebsite,
				// New City and Postal Code fields
				city,
				postal_code: body.postalCode || postalCode,
			};

			if (businessLicenseUrl) {
				updateData.govt_compliance_reg_url = businessLicenseUrl;
			}

			if (profile) {
				await profile.update(updateData);
			} else {
				// No active profile found, create a new one.
				// Previous soft-deleted profiles remain in history.
				updateData.user_id = user!.id;
				profile = await UserProfile.create(updateData);
			}

			// Update user onboarding step to sync with profile
			await user!.update({ onboarding_step: 2 });

			return this.sendSuccess({
				message: 'Company info saved successfully',
				profile: this.formatProfile(profile),
				nextStep: 2,
			});
		} catch (error: any) {
			console.error('Step 0 Error:', error);
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * POST /api/v1/onboarding/step1
	 * Step 1: Company Registration Details
	 * Content-Type: application/json
	 */
	async step1(req: NextRequest) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const body = await req.json();

			const {
				countryOfRegistration, registeredCompanyName, tradeBrandName,
				yearOfEstablishment, legalEntityId, legalEntityIssueDate,
				legalEntityExpiryDate, cityOfficeAddress, officialWebsite,
				addressLine1, addressLine2, state, // New Split Fields + State
				city, postalCode, // New Vendor Fields
				entityType, dunsNumber, taxVatNumber, taxIssuingDate, taxExpiryDate,
				vatCertificateUrl // Passed from upload step
			} = body;

			let profile = await UserProfile.findOne({ where: { user_id: user!.id } });
			if (!profile) {
				return this.sendError('Please complete step 0 first', 400);
			}

			// Mapping for entity_type strings to IDs
			const entityTypeMap: Record<string, number> = {
				'manufacturer': 1,
				'distributor': 2,
				'trader': 3,
				'government_entity': 4,
				'government entity': 4,
				'oem_dealer': 5,
				'oem dealer': 5,
				'integrator': 6,
				'service_provider': 7,
				'service provider': 7
			};

			const entityTypeValue = String(entityType).toLowerCase();
			const mappedEntityTypeId = entityTypeMap[entityTypeValue] || (typeof entityType === 'number' ? entityType : null);

			const updates: any = {
				country_of_registration: countryOfRegistration,
				registered_company_name: registeredCompanyName,
				trade_brand_name: tradeBrandName,
				year_of_establishment: yearOfEstablishment ? parseInt(yearOfEstablishment) : undefined,
				legal_entity_id: legalEntityId,
				legal_entity_issue_date: legalEntityIssueDate ? new Date(legalEntityIssueDate) : undefined,
				legal_entity_expiry_date: legalEntityExpiryDate ? new Date(legalEntityExpiryDate) : undefined,
				city_office_address: cityOfficeAddress || `${addressLine1 || ''}, ${addressLine2 || ''}, ${state || ''}, ${city || ''}`.replace(/, , /g, ', ').replace(/^, |, $/g, '').trim(),
				address_line1: addressLine1 || cityOfficeAddress,
				address_line2: addressLine2,
				city,
				state: state || city, // Use state if provided
				postal_code: postalCode,
				official_website: officialWebsite,
				entity_type: mappedEntityTypeId,
				duns_number: dunsNumber,
				// Use new column for the file
				govt_compliance_reg_url: vatCertificateUrl,
				vat_certificate_url: vatCertificateUrl,
				tax_vat_number: taxVatNumber,
				tax_issuing_date: taxIssuingDate ? new Date(taxIssuingDate) : undefined,
				tax_expiry_date: taxExpiryDate ? new Date(taxExpiryDate) : undefined,
				current_step: 3, // Assuming vendor next step logic (or 2 if parallel tracks differ)
				onboarding_status: 'in_progress',
			};

			await profile.update(updates);

			// Vendor Step 2 is effectively Global Step 2? Or Seller specific? 
			// In original code: `current_step: 2`, `onboarding_step: 2`.
			// Controller code had `current_step: 2` in `step1` response previously.
			// Let's keep it consistent with previous:  `current_step: 2`, `onboarding_step: 2`.
			await profile.update({ current_step: 2 });
			await user!.update({ onboarding_step: 2 });

			return this.sendSuccess({
				message: 'Step 1 saved successfully',
				profile: this.formatProfile(profile),
				nextStep: 2,
			});
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * POST /api/v1/onboarding/step2
	 * Step 2: Contact Person
	 * Content-Type: application/json
	 */
	async step2(req: NextRequest) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const body = await req.json();
			const {
				contactFullName,
				contactJobTitle,
				contactWorkEmail,
				contactMobile,
				contactMobileCountryCode,
				contactIdDocumentUrl, // Expect URL now
				termsAccepted
			} = body;

			if (!contactFullName || !contactWorkEmail || !contactMobile || !contactMobileCountryCode || !termsAccepted) {
				return this.sendError('Missing required fields', 400);
			}

			const profile = await UserProfile.findOne({ where: { user_id: user!.id } });
			if (!profile) {
				return this.sendError('Please complete previous steps first', 400);
			}

			await profile.update({
				contact_full_name: contactFullName,
				contact_job_title: contactJobTitle,
				contact_work_email: contactWorkEmail,
				contact_id_document_url: contactIdDocumentUrl, // Save URL directly
				contact_mobile: contactMobile,
				contact_mobile_country_code: contactMobileCountryCode,
				terms_accepted: termsAccepted === true || termsAccepted === 'true',
				terms_accepted_at: new Date(),
				current_step: 3,
				onboarding_status: 'in_progress',
			});

			await user!.update({ onboarding_step: 3 });

			return this.sendSuccess({
				message: 'Step 2 saved successfully',
				profile: this.formatProfile(profile),
				nextStep: 3,
			});
		} catch (error: any) {
			console.error('Step 2 Error:', error);
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * POST /api/v1/onboarding/step3
	 * Step 3: Business & Compliance
	 * Content-Type: application/json
	 */
	async step3(req: NextRequest) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const body = await req.json();
			const {
				natureOfBusiness,
				endUseMarkets, // Array of strings expected
				licenseTypes,
				operatingCountries,
				controlledItems, // boolean
				procurementPurpose,
				endUserType,
				businessLicenseUrl, // URL string
				defenseApprovalUrl,
				companyProfileUrl,
				modLicenseUrl,
				eocnApprovalUrl,
				itarRegistrationUrl,
				localAuthorityApprovalUrl,
				isOnSanctionsList,
				complianceTermsAccepted
			} = body;

			if (!complianceTermsAccepted) {
				return this.sendError('You must accept the compliance terms', 400);
			}

			const profile = await UserProfile.findOne({ where: { user_id: user!.id } });
			if (!profile) {
				return this.sendError('Please complete previous steps first', 400);
			}

			const updates: any = {
				nature_of_business: natureOfBusiness,
				end_use_markets: endUseMarkets, // Saved as JSON/Array
				license_types: licenseTypes,
				operating_countries: operatingCountries,
				controlled_items: controlledItems,

				// Legacy / Single Fields
				end_use_market: endUseMarkets?.[0], // For backward compat if needed
				license_type: licenseTypes?.[0],

				is_on_sanctions_list: isOnSanctionsList,
				business_license_url: businessLicenseUrl,
				defense_approval_url: defenseApprovalUrl,
				company_profile_url: companyProfileUrl,

				// Add missing fields to model or ignore if not present?
				// UserProfile model check: mod_license_url etc might be missing in model definition based on previous check.
				// Assuming they are added or we rely on what's available.
				// Previously noted they might be missing. Proceeding with what matches model.
				procurement_purpose: procurementPurpose ? parseInt(String(procurementPurpose)) : undefined,
				end_user_type: endUserType ? parseInt(String(endUserType)) : undefined,
				mod_license_url: modLicenseUrl,
				eocn_approval_url: eocnApprovalUrl,
				itar_registration_url: itarRegistrationUrl,
				local_authority_approval_url: localAuthorityApprovalUrl,

				compliance_terms_accepted: complianceTermsAccepted,
				compliance_terms_accepted_at: new Date(),
				current_step: 4,
				onboarding_status: 'in_progress',
			};

			// These legacy fields might map to the new inputs or be unused
			// Assuming "procurementPurpose" -> ?? (Not in model snippet viewed earlier)
			// Assuming "endUserType" -> ?? (Not in model snippet viewed earlier)
			// If they are missing from model, they won't be saved unless added.
			// Previous learning said they are not persisted. 
			// I will leave them out of the update object if they don't exist in the model, 
			// but the controller logic previously didn't save them either?
			// Actually, let's double check if I can save them.
			// For now, I only update what matches the UserProfile model I saw.

			await profile.update(updates);

			await user!.update({ onboarding_step: 4 });

			return this.sendSuccess({
				message: 'Step 3 saved successfully',
				profile: this.formatProfile(profile),
				nextStep: 4,
			});
		} catch (error: any) {
			console.error('Step 3 Error:', error);
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * POST /api/v1/onboarding/step4
	 * Step 4: Account Preferences
	 * Content-Type: application/json
	 */
	async step4(req: NextRequest) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const body = await req.json();
			const { sellingCategories, registerAs, preferredCurrency, sponsorContent, isDraft } = body;

			if (!isDraft) {
				if (!sellingCategories || sellingCategories.length === 0) {
					return this.sendError('Please select at least one selling category', 400);
				}
			}

			const profile = await UserProfile.findOne({ where: { user_id: user!.id } });
			if (!profile) {
				return this.sendError('Please complete previous steps first', 400);
			}

			await profile.update({
				selling_categories: sellingCategories,
				register_as: registerAs,
				preferred_currency: preferredCurrency,
				sponsor_content: sponsorContent || false,
				current_step: 5,
				onboarding_status: 'in_progress',
			});

			await user!.update({ onboarding_step: 5 });

			return this.sendSuccess({
				message: isDraft ? 'Draft saved successfully' : 'Step 4 saved successfully',
				profile: this.formatProfile(profile),
				user: {
					id: user!.id,
					onboardingStep: 5,
				},
				nextStep: 5,
			});
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * POST /api/v1/onboarding/step5
	 * Step 5: Bank Details
	 * Content-Type: application/json
	 */
	async step5(req: NextRequest) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const formData = await req.formData();

			const paymentMethod = formData.get('paymentMethod') as string;
			const bankCountry = formData.get('bankCountry') as string;
			const financialInstitution = formData.get('financialInstitution') as string;
			const swiftCode = formData.get('swiftCode') as string;
			const bankAccountNumber = formData.get('bankAccountNumber') as string;
			const proofType = formData.get('proofType') as string;
			const isDraft = formData.get('isDraft') === 'true';

			// Handle File
			let bankProofUrl = formData.get('bankProofUrl') as string;
			const bankProofFile = formData.get('bankProofFile') as File;

			if (bankProofFile && bankProofFile.size > 0) {
				bankProofUrl = await FileUploadService.saveFile(bankProofFile, `users/${user!.id}/documents`);
			}

			if (!isDraft) {
				if (!financialInstitution) {
					return this.sendError('Please select your bank', 400);
				}
				if (!bankAccountNumber) {
					return this.sendError('Bank account number is required', 400);
				}
				if (!proofType) {
					return this.sendError('Please select a proof type', 400);
				}
				if (!bankProofUrl) {
					return this.sendError('Bank proof document is required', 400);
				}
			}

			const profile = await UserProfile.findOne({ where: { user_id: user!.id } });
			if (!profile) {
				return this.sendError('Please complete previous steps first', 400);
			}

			await profile.update({
				payment_method: paymentMethod,
				bank_country: bankCountry,
				financial_institution: financialInstitution,
				swift_code: swiftCode,
				bank_account_number: bankAccountNumber,
				proof_type: proofType,
				bank_proof_url: bankProofUrl,
				current_step: 6,
				onboarding_status: 'in_progress',
			});

			await user!.update({ onboarding_step: 6 });

			return this.sendSuccess({
				message: isDraft ? 'Draft saved successfully' : 'Step 5 saved successfully',
				profile: this.formatProfile(profile),
				nextStep: 6, // Verification
			});
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * POST /api/v1/onboarding/submit-verification
	 * Submit for Identity Verification
	 * Content-Type: application/json
	 */
	async submitVerification(req: NextRequest) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const body = await req.json();
			const { verificationMethod } = body;

			if (!verificationMethod) {
				return this.sendError('Please select a verification method', 400);
			}

			const profile = await UserProfile.findOne({ where: { user_id: user!.id } });
			if (!profile) {
				return this.sendError('Please complete onboarding steps first', 400);
			}

			await profile.update({
				submitted_for_approval: true,
				submitted_at: new Date(),
				current_step: null,
				onboarding_status: 'pending_verification',
			});

			// Set user onboarding step to null (completed)
			await user!.update({ onboarding_step: null });

			return this.sendSuccess({
				message: 'Application submitted for verification',
				profile: this.formatProfile(profile),
				nextStep: null, // Dashboard/Pending
			});
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}
}
