
import { FileUploadService } from './FileUploadService';
import { UserProfile, FrontendSlider, FrontendAd } from '../models'; // Import other models as needed

/**
 * Configuration for File Uploads
 * Maps a unique label to the target table, column, and upload path.
 */
export const UPLOAD_CONFIG = {
    // Step 1: Registration File (Buyer) / Business License (Vendor Step 0)
    CUSTOMER_REGISTRATION_FILE: {
        label: "Company Registration / Business License",
        model: UserProfile,
        column: "govt_compliance_reg_url",
        form: "customer.onboarding.step_1",
        path: "users/{user_id}/documents",
        lookupField: "user_id"
    },

    // Step 1 (Vendor Only): VAT Certificate
    VENDOR_VAT_CERTIFICATE: {
        label: "VAT Certificate",
        model: UserProfile,
        column: "govt_compliance_reg_url",
        form: "vendor.onboarding.step_1",
        path: "users/{user_id}/documents",
        lookupField: "user_id"
    },

    // Step 2: Contact Person ID
    CONTACT_ID_DOCUMENT: {
        label: "Contact Person Passport / ID",
        model: UserProfile,
        column: "contact_id_document_url",
        form: "customer.onboarding.step_2",
        path: "users/{user_id}/documents",
        lookupField: "user_id"
    },

    // Step 3: Business License (Explicit Step for Buyers)
    CUSTOMER_BUSINESS_LICENSE: {
        label: "Business License",
        model: UserProfile,
        column: "business_license_url",
        form: "customer.onboarding.step_3",
        path: "users/{user_id}/documents",
        lookupField: "user_id"
    },

    // Step 3 (Optional): Defense Approval
    DEFENSE_APPROVAL: {
        label: "Defense Approval Document",
        model: UserProfile,
        column: "defense_approval_url",
        form: "customer.onboarding.step_3",
        path: "users/{user_id}/documents",
        lookupField: "user_id"
    },

    // Step 3 (Optional): Company Profile
    COMPANY_PROFILE: {
        label: "Company Profile Document",
        model: UserProfile,
        column: "company_profile_url",
        form: "customer.onboarding.step_3",
        path: "users/{user_id}/documents",
        lookupField: "user_id"
    },
    
    // Step 3 (Optional): MOD License
    MOD_LICENSE: {
        label: "MOD License",
        model: UserProfile,
        column: "defense_approval_url", // Updated to map to existing column
        form: "vendor.onboarding.step_3",
        path: "users/{user_id}/documents",
        lookupField: "user_id"
    },

     // Step 3 (Optional): EOCN Approval
    EOCN_APPROVAL: {
        label: "EOCN Approval",
        model: UserProfile,
        column: "eocn_approval_url", 
        form: "vendor.onboarding.step_3",
        path: "users/{user_id}/documents",
        lookupField: "user_id"
    },
    
     // Step 3 (Optional): ITAR Registration
    ITAR_REGISTRATION: {
        label: "ITAR Registration",
        model: UserProfile,
        column: "itar_registration_url", 
        form: "vendor.onboarding.step_3",
        path: "users/{user_id}/documents",
        lookupField: "user_id"
    },
    
     // Step 3 (Optional): Local Authority Approval
    LOCAL_AUTHORITY_APPROVAL: {
        label: "Local Authority Approval",
        model: UserProfile,
        column: "local_authority_approval_url", 
        form: "vendor.onboarding.step_3",
        path: "users/{user_id}/documents",
        lookupField: "user_id"
    },

    // Step 5 (Vendor Only): Bank Proof
    VENDOR_BANK_PROOF: {
        label: "Bank Account Proof",
        model: UserProfile,
        column: "bank_proof_url",
        form: "vendor.onboarding.step_5",
        path: "users/{user_id}/documents",
        lookupField: "user_id"
    },

    // Product Description Media (Admin)
    PRODUCT_DESCRIPTION_MEDIA: {
        label: "Product Description Media",
        model: null, 
        column: null,
        form: "admin.product.description",
        path: "products/{product_id}/description",
        lookupField: "product_id"
    },

    // Frontend Sliders
    FRONTEND_SLIDER: {
        label: "Frontend Slider",
        model: FrontendSlider,
        column: "image_url",
        form: "admin.web-frontend.slider",
        path: "frontend/sliders",
        lookupField: "id"
    },

    // Frontend Ads
    FRONTEND_AD: {
        label: "Frontend Ad",
        model: FrontendAd,
        column: "image_url",
        form: "admin.web-frontend.ad",
        path: "frontend/ads",
        lookupField: "id"
    }
};

export type UploadConfigLabel = keyof typeof UPLOAD_CONFIG;

export class UploadHandler {

    /**
     * Handles file upload and optional database update.
     * 
     * @param files - The file object or array of file objects to upload.
     * @param label - The configuration label defining where to upload and mapped DB column.
     * @param data - Context data containing variables for path replacement (e.g., { user_id: '123' }).
     * @param updateDb - Whether to automatically update the database record. Default is false.
     * @returns Standard response format: { status, message, code, data, misc, errors }
     */
    static async handle(
        files: File | File[],
        label: UploadConfigLabel,
        data: Record<string, any>,
        updateDb: boolean = false
    ) {
        try {
            const config = UPLOAD_CONFIG[label];

            if (!config) {
                return {
                    status: false,
                    message: `Invalid upload configuration label: ${label}`,
                    code: 400,
                    data: null,
                    misc: data,
                    errors: ["Invalid configuration label"]
                };
            }

            // 1. Resolve Upload Path
            let uploadPath = config.path;
            // Replace variables in path (e.g., {user_id}) with data values
            for (const key in data) {
                uploadPath = uploadPath.replace(`{${key}}`, data[key]);
            }
            
            // Check if any variables were left unreplaced
            if (uploadPath.includes('{') && uploadPath.includes('}')) {
                 return {
                    status: false,
                    message: "Missing required data for upload path variables",
                    code: 400,
                    data: null,
                    misc: data,
                    errors: [`Unresolved path variables in: ${uploadPath}`]
                };
            }

            // 2. Handle Upload(s)
            const fileArray = Array.isArray(files) ? files : [files];
            const uploadedPaths: string[] = [];

            if (fileArray.length === 0 || !files) { // Handle case where no file is actually passed
                 return {
                    status: false,
                    message: "No files provided",
                    code: 400,
                    data: null,
                    misc: data,
                    errors: ["No files provided to upload"]
                };
            }
            
            for (const file of fileArray) {
                 // Skip if file is empty or invalid (optional check, dependent on File object structure)
                 if(!file.name) continue; 
                 
                 const savedPath = await FileUploadService.saveFile(file, uploadPath);
                 uploadedPaths.push(savedPath);
            }

            // 3. Update Database (Optional)
            if (updateDb && uploadedPaths.length > 0) {
                if (!config.model || !config.column) {
                     // If no model/column defined (e.g. just uploading file for rich text editor), skip DB update
                     // but return success with file paths
                     return {
                        status: true,
                        message: "Files uploaded successfully (No DB update required)",
                        code: 200,
                        data: uploadedPaths,
                        misc: data,
                        errors: []
                    };
                }

                const Model = config.model;
                const lookupValue = data[config.lookupField];

                if (!lookupValue) {
                    return {
                        status: false,
                        message: `Missing lookup value for field: ${config.lookupField}`,
                        code: 400,
                        data: uploadedPaths, // Files uploaded but DB not updated
                        misc: data,
                        errors: [`Reference for ${config.lookupField} not found in data`]
                    };
                }

                const record = await (Model as any).findOne({ where: { [config.lookupField]: lookupValue } });

                if (record) {
                    const valueToSave = uploadedPaths.length === 1 ? uploadedPaths[0] : uploadedPaths.join(','); // Simple join for now
                    
                    await record.update({
                        [config.column]: valueToSave
                    });
                } else {
                     return {
                        status: false,
                        message: "Record not found for database update",
                        code: 404,
                        data: uploadedPaths,
                        misc: data,
                        errors: [`Record with ${config.lookupField} = ${lookupValue} not found`]
                    };
                }
            }

            return {
                status: true,
                message: "Files uploaded successfully",
                code: 200,
                data: uploadedPaths,
                misc: data,
                errors: []
            };

        } catch (error: any) {
            console.error("UploadHandler Error:", error);
            return {
                status: false,
                message: error.message || "File upload failed",
                code: 500,
                data: null,
                misc: data,
                errors: [error.message]
            };
        }
    }
}
