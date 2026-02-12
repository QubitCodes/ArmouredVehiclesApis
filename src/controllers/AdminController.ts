import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { BaseController } from './BaseController';
import {
    User,
    Product,
    Order,
    OrderItem,
    WithdrawalRequest,
    PlatformSetting,
    AuthSession,
    UserProfile,
    RefEntityType,
    ReferenceModels
} from '../models';
import { z } from 'zod';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import { verifyAccessToken } from '../utils/jwt';
import { getFileUrl } from '../utils/fileUrl';
import { PermissionService } from '../services/PermissionService';
import { responseHandler } from '../utils/responseHandler';
import { firebaseAdmin } from '../config/firebase';

// Document URL fields in UserProfile that need absolute URL formatting
const PROFILE_URL_FIELDS = [
    'vat_certificate_url',
    'contact_id_document_url',
    'business_license_url',
    'defense_approval_url',
    'company_profile_url',
    'bank_proof_url'
];

export class AdminController extends BaseController {

    /**
     * Helper: Format vendor profile with full absolute URLs for documents
     * and human-readable country names from codes.
     */
    private static async formatVendorProfile(profile: any): Promise<any> {
        if (!profile) return null;
        const formatted = profile.toJSON ? profile.toJSON() : { ...profile };

        // Convert document URLs to full absolute URLs
        PROFILE_URL_FIELDS.forEach(field => {
            if (formatted[field]) {
                formatted[field] = getFileUrl(formatted[field]);
            }
        });

        // Map Relation Names (Flatten nested objects)
        if (formatted.buyerType?.name) {
            formatted.type_of_buyer = formatted.buyerType.name;
        }
        if (formatted.procurementPurpose?.name) {
            formatted.procurement_purpose = formatted.procurementPurpose.name;
        }
        if (formatted.endUserType?.name) {
            formatted.end_user_type = formatted.endUserType.name;
        }
        if (formatted.entityType?.description) {
            formatted.entity_type = formatted.entityType.description;
        }

        // Map Country Codes to Names
        // Fields that store country codes (CCA2)
        const countryFields = ['country_of_registration', 'bank_country', 'country'];

        // Fetch countries for mapping if any field is provided as a code (usually 2 chars)
        const needsMapping = countryFields.some(f => formatted[f] && formatted[f].length <= 3);

        if (needsMapping) {
            try {
                const countries = await ReferenceModels.RefCountry.findAll({
                    attributes: ['code', 'name']
                });
                const countryMap = new Map(countries.map((c: any) => [c.code.toLowerCase(), c.name]));

                countryFields.forEach(field => {
                    const code = formatted[field];
                    if (code && code.length <= 3) {
                        const name = countryMap.get(code.toLowerCase());
                        if (name) {
                            formatted[field] = name;
                        }
                    }
                });
            } catch (err) {
                console.error('[AdminController] Country mapping failed:', err);
            }
        }


        return formatted;
    }

    // --- Admin Management ---

    static async getAdmins(req: NextRequest) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded.userId || decoded.sub;
            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            // Permission Check
            if (user.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'admin.view');
                if (!hasPerm) return NextResponse.json({ success: false, message: 'Forbidden: Missing admin.view Permission' }, { status: 403 });
            }

            const isSuperAdmin = user.user_type === 'super_admin';

            const where: any = {};
            if (isSuperAdmin) {
                where.user_type = ['admin', 'super_admin'];
            } else {
                where.user_type = 'admin';
            }

            const searchParams = req.nextUrl.searchParams;
            const search = searchParams.get('search') || searchParams.get('q');
            if (search) {
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } }
                ];
            }

            // Controlled Filter
            const controlledParam = searchParams.get('controlled');
            if (controlledParam !== null) {
                const isControlled = controlledParam === 'true';

                // Logic: Super Admin OR Has %controlled% permission
                // Using subquery for permissions
                const permissionSubquery = sequelize.literal(`(
                SELECT COUNT(*) FROM user_permissions 
                WHERE user_permissions.user_id = "User"."id" 
                AND user_permissions.permission_name LIKE '%controlled%'
            ) > 0`);

                if (isControlled) {
                    where[Op.or] = [
                        { user_type: 'super_admin' },
                        permissionSubquery
                    ];
                } else {
                    // Not controlled: Must NOT be super_admin AND NOT have permissions
                    where[Op.and] = [
                        { user_type: { [Op.ne]: 'super_admin' } },
                        sequelize.literal(`(
                        SELECT COUNT(*) FROM user_permissions 
                        WHERE user_permissions.user_id = "User"."id" 
                        AND user_permissions.permission_name LIKE '%controlled%'
                    ) = 0`)
                    ];
                }
            }

            const page = Number(searchParams.get('page')) || 1;
            const limit = Number(searchParams.get('limit')) || 20;
            const offset = (page - 1) * limit;

            const admins = await User.findAndCountAll({
                where,
                attributes: {

                    include: [
                        [
                            sequelize.literal(`(
                            CASE 
                                WHEN "User"."user_type" = 'super_admin' THEN true
                                WHEN (SELECT COUNT(*) FROM user_permissions WHERE user_permissions.user_id = "User"."id" AND user_permissions.permission_name LIKE '%controlled%') > 0 THEN true
                                ELSE false
                            END
                        )`),
                            'is_controlled'
                        ]
                    ]
                },
                limit,
                offset,
                order: [['created_at', 'DESC']]
            });

            const formattedAdmins = admins.rows.map(admin => {
                const json = admin.toJSON();
                // Ensure is_controlled is present and boolean
                return {
                    ...json,
                    is_controlled: admin.getDataValue('is_controlled' as any) === true || admin.getDataValue('is_controlled' as any) === 'true'
                };
            });

            return NextResponse.json({
                success: true,
                data: formattedAdmins,
                misc: {
                    total: admins.count,
                    page,
                    pages: Math.ceil(admins.count / limit)
                }
            });

        } catch (error: any) {
            if (
                error.name === 'TokenExpiredError' ||
                error.name === 'JsonWebTokenError' ||
                error.message?.includes('jwt expired') ||
                (error.constructor && error.constructor.name === 'TokenExpiredError')
            ) {
                return NextResponse.json({ success: false, message: 'Unauthorized: Token expired' }, { status: 401 });
            }
            console.error('Get Admins Error:', error);
            return NextResponse.json({ success: false, message: 'Failed to fetch admins' }, { status: 500 });
        }
    }

    static async getAdmin(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded.userId || decoded.sub;
            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            // Permission Check: Allow if self or has admin.view
            if (user.id !== params.id && user.user_type !== 'super_admin') {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'admin.view');
                if (!hasPerm) return NextResponse.json({ success: false, message: 'Forbidden: Missing admin.view Permission' }, { status: 403 });
            }

            const admin = await User.findOne({
                where: {
                    id: params.id,
                    user_type: { [Op.in]: ['admin', 'super_admin'] }
                },
                attributes: {

                    include: [
                        [
                            sequelize.literal(`(
                            CASE 
                                WHEN "User"."user_type" = 'super_admin' THEN true
                                WHEN (SELECT COUNT(*) FROM user_permissions WHERE user_permissions.user_id = "User"."id" AND user_permissions.permission_name LIKE '%controlled%') > 0 THEN true
                                ELSE false
                            END
                        )`),
                            'is_controlled'
                        ]
                    ]
                }
            });

            if (!admin) {
                return NextResponse.json({ success: false, message: 'Admin not found' }, { status: 404 });
            }

            const json = admin.toJSON();
            const data = {
                ...json,
                is_controlled: admin.getDataValue('is_controlled' as any) === true || admin.getDataValue('is_controlled' as any) === 'true'
            };

            return NextResponse.json({
                success: true,
                data
            });

        } catch (error: any) {
            console.error('Get Admin Error:', error);
            return NextResponse.json({ success: false, message: 'Failed to fetch admin' }, { status: 500 });
        }
    }

    static async createAdmin(req: NextRequest) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded.userId || decoded.sub;
            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            // Permission Check
            if (user.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'admin.manage');
                if (!hasPerm) return NextResponse.json({ success: false, message: 'Forbidden: Missing admin.manage Permission' }, { status: 403 });
            }

            const body = await req.json();

            // Validation Schema
            const schema = z.object({
                name: z.string().min(1, "Name is required"),
                email: z.string().email("Invalid email format"),
                phone: z.string().min(1, "Phone number is required"),
                country_code: z.string().min(1, "Country code is required"),
                permissions: z.array(z.string()).optional() // Add permissions to schema
            });

            const validation = schema.safeParse(body);
            if (!validation.success) {
                return NextResponse.json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.error.issues
                }, { status: 400 });
            }

            const { name, email, phone, country_code } = validation.data;

            // Check if email already exists
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return NextResponse.json({ success: false, message: 'User with this email already exists' }, { status: 409 });
            }

            // Check if phone already exists
            const existingPhone = await User.findOne({ where: { phone } });
            if (existingPhone) {
                return NextResponse.json({ success: false, message: 'User with this phone number already exists' }, { status: 409 });
            }

            // Standardize Phone for Firebase
            const formattedPhone = `${country_code}${phone}`.replace(/[\s-]/g, '');
            // Ensure it starts with +
            const firebasePhone = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`;

            // Create in Firebase First
            let firebaseUid = null;
            try {
                const firebaseUser = await firebaseAdmin.auth().createUser({
                    email: email,
                    phoneNumber: firebasePhone,
                    emailVerified: true,
                    displayName: name,
                    disabled: false
                });
                firebaseUid = firebaseUser.uid;
            } catch (error: any) {
                console.error('Firebase Create Error:', error);
                // If user already exists in Firebase, we might want to check why.
                // Error codes: 'auth/email-already-exists', 'auth/phone-number-already-exists'
                if (error.code === 'auth/email-already-exists' || error.code === 'auth/phone-number-already-exists') {
                    // Try to retrieve the existing user to get UID
                    try {
                        const existingFbUser = await firebaseAdmin.auth().getUserByEmail(email);
                        firebaseUid = existingFbUser.uid;
                        // Optional: Update their details to match
                        await firebaseAdmin.auth().updateUser(firebaseUid, {
                            phoneNumber: firebasePhone,
                            displayName: name,
                            emailVerified: true,
                            disabled: false
                        });
                    } catch (innerError) {
                        // Could be phone exists?
                        if (error.code === 'auth/phone-number-already-exists') {
                            try {
                                const existingFbUserPhone = await firebaseAdmin.auth().getUserByPhoneNumber(firebasePhone);
                                firebaseUid = existingFbUserPhone.uid;

                                if (existingFbUserPhone.email !== email) {
                                    // This is risky, but required to sync.
                                    await firebaseAdmin.auth().updateUser(firebaseUid, {
                                        email: email,
                                        displayName: name,
                                        emailVerified: true,
                                        disabled: false
                                    });
                                }
                            } catch (e) {
                                return NextResponse.json({ success: false, message: 'Firebase Sync Failed: Phone exists but could not retrieve/update user.' }, { status: 409 });
                            }
                        } else {
                            return NextResponse.json({ success: false, message: 'Firebase Sync Failed: User exists but could not be linked.' }, { status: 409 });
                        }
                    }
                } else {
                    return NextResponse.json({ success: false, message: `Firebase Create Failed: ${error.message}` }, { status: 500 });
                }
            }

            // Create Admin User in DB
            const newAdmin = await User.create({
                name,
                email,
                phone,
                country_code,

                user_type: 'admin',
                email_verified: true, // Auto-verified
                phone_verified: true, // Auto-verified
                is_active: true,
                firebase_uid: firebaseUid
            });

            // ... permissions logic ...

            return NextResponse.json({
                success: true,
                message: 'Admin created successfully',
                data: newAdmin
            }, { status: 201 });

        } catch (error: any) {
            console.error('Create Admin Error:', error);
            return NextResponse.json({ success: false, message: error.message || 'Failed to create admin' }, { status: 500 });
        }
    }

    static async updateAdmin(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded.userId || decoded.sub;
            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin', 'vendor'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            const adminId = params.id;

            // Permission Check (Allow Self-Update)
            if (user.user_type === 'admin' && user.id !== adminId) {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'admin.manage');
                if (!hasPerm) return NextResponse.json({ success: false, message: 'Forbidden: Missing admin.manage Permission' }, { status: 403 });
            }

            // Vendors can only update themselves
            if (user.user_type === 'vendor' && user.id !== adminId) {
                return NextResponse.json({ success: false, message: 'Forbidden: Vendors can only update their own profile' }, { status: 403 });
            }

            const targetAdmin = await User.findByPk(adminId);
            if (!targetAdmin) {
                return NextResponse.json({ success: false, message: 'Admin not found' }, { status: 404 });
            }

            // Prevent updating non-admins/non-self via this endpoint
            if (!['admin', 'super_admin'].includes(targetAdmin.user_type) && user.id !== targetAdmin.id) {
                return NextResponse.json({ success: false, message: 'Target user is not an admin' }, { status: 400 });
            }

            // Authority Check
            if (user.user_type !== 'super_admin' && targetAdmin.user_type === 'super_admin') {
                return NextResponse.json({ success: false, message: 'Forbidden: Cannot edit Super Admin' }, { status: 403 });
            }

            const body = await req.json();
            // Validation Schema
            const schema = z.object({
                name: z.string().optional(),
                email: z.string().email("Invalid email format").optional(),
                phone: z.string().optional(),
                country_code: z.string().optional(),
                is_active: z.boolean().optional(),
                permissions: z.array(z.string()).optional()
            });

            const validation = schema.safeParse(body);
            if (!validation.success) {
                return NextResponse.json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.error.issues
                }, { status: 400 });
            }

            const updates = validation.data;

            // Apply updates to DB Object
            if (updates.name) targetAdmin.name = updates.name;
            if (updates.email) targetAdmin.email = updates.email;
            if (updates.phone) targetAdmin.phone = updates.phone;
            if (updates.country_code) targetAdmin.country_code = updates.country_code;
            if (updates.is_active !== undefined) targetAdmin.is_active = updates.is_active;

            await targetAdmin.save();

            // Sync with Firebase
            if (targetAdmin.firebase_uid) {
                try {
                    const firebaseUpdates: any = {};

                    if (updates.name) firebaseUpdates.displayName = updates.name;
                    if (updates.email) {
                        firebaseUpdates.email = updates.email;
                        firebaseUpdates.emailVerified = true;
                    }

                    if (updates.phone || updates.country_code) {
                        const phone = updates.phone || targetAdmin.phone;
                        const code = updates.country_code || targetAdmin.country_code;
                        let formatted = `${code}${phone}`.replace(/[\s-]/g, '');
                        if (!formatted.startsWith('+')) formatted = `+${formatted}`;
                        firebaseUpdates.phoneNumber = formatted;
                    }

                    if (updates.is_active !== undefined) {
                        firebaseUpdates.disabled = !updates.is_active;
                    }

                    if (Object.keys(firebaseUpdates).length > 0) {
                        await firebaseAdmin.auth().updateUser(targetAdmin.firebase_uid, firebaseUpdates);
                    }
                } catch (error: any) {
                    console.error('Firebase Update Error:', error);
                }
            }

            // Handle Permissions Update
            if (updates.permissions) {
                // Strict check: Only allow if user has admin.permissions
                let canAssign = false;
                if (user.user_type === 'super_admin') {
                    canAssign = true;
                } else {
                    canAssign = await new PermissionService().hasPermission(user.id, 'admin.permissions');
                }

                if (canAssign) {
                    await new PermissionService().syncUserPermissions(targetAdmin.id, updates.permissions);
                }
            }

            return NextResponse.json({ success: true, message: 'Admin updated successfully', data: targetAdmin });

        } catch (error: any) {
            console.error('Update Admin Error:', error);
            return NextResponse.json({ success: false, message: 'Failed to update admin' }, { status: 500 });
        }
    }

    static async deleteAdmin(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded.userId || decoded.sub;
            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            // Permission Check
            if (user.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'admin.manage');
                if (!hasPerm) return NextResponse.json({ success: false, message: 'Forbidden: Missing admin.manage Permission' }, { status: 403 });
            }

            const adminId = params.id;
            const targetAdmin = await User.findByPk(adminId);
            if (!targetAdmin) {
                return NextResponse.json({ success: false, message: 'Admin not found' }, { status: 404 });
            }

            if (!['admin', 'super_admin'].includes(targetAdmin.user_type)) {
                return NextResponse.json({ success: false, message: 'Target user is not an admin' }, { status: 400 });
            }

            // Authority Check
            if (user.user_type !== 'super_admin' && targetAdmin.user_type === 'super_admin') {
                return NextResponse.json({ success: false, message: 'Forbidden: Cannot delete Super Admin' }, { status: 403 });
            }

            // Self-delete check
            if (user.id === targetAdmin.id) {
                return NextResponse.json({ success: false, message: 'Cannot delete yourself' }, { status: 400 });
            }

            // Delete from Firebase first
            if (targetAdmin.firebase_uid) {
                try {
                    await firebaseAdmin.auth().deleteUser(targetAdmin.firebase_uid);
                } catch (error: any) {
                    console.error('Firebase Delete Error:', error);
                    if (error.code !== 'auth/user-not-found') {
                        return NextResponse.json({ success: false, message: 'Failed to delete user from Firebase (Auth Sync)' }, { status: 500 });
                    }
                }
            }

            await targetAdmin.destroy(); // Soft delete

            return NextResponse.json({ success: true, message: 'Admin deleted successfully' });

        } catch (error: any) {
            console.error('Delete Admin Error:', error);
            return NextResponse.json({ success: false, message: 'Failed to delete admin' }, { status: 500 });
        }
    }


    // --- Dashboard ---

    // Helper to get start of current month
    private static getStartOfMonth() {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    /**
     * Get Dashboard Stats - Returns SDUI (Server-Driven UI) format
     * Widgets are conditionally added based on user permissions
     */
    static async getDashboardStats(req: NextRequest) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return responseHandler.error('Unauthorized', 401);
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded.userId || decoded.sub;
            const user = await User.findByPk(userId);

            if (!user) {
                return responseHandler.error('User not found', 404);
            }

            // SDUI Widget Interface
            interface DashboardWidget {
                type: 'stat_card';
                width: number;
                title: string;
                value: string | number;
                subValue?: string;
                icon: string;
                theme: string;
                category?: string;
                description?: string;
            }

            const items: DashboardWidget[] = [];
            const startOfMonth = this.getStartOfMonth();

            // Helper to format currency
            const formatCurrency = (val: number) => `AED ${val.toFixed(2)}`;

            if (user.user_type === 'vendor') {
                // --- VENDOR DASHBOARD (SDUI) ---

                // Revenue
                const revenueTotal = await Order.sum('total_amount', {
                    where: { vendor_id: user.id, payment_status: 'paid' }
                }) || 0;
                const revenueMonthly = await Order.sum('total_amount', {
                    where: { vendor_id: user.id, payment_status: 'paid', created_at: { [Op.gte]: startOfMonth } }
                }) || 0;
                items.push({
                    type: 'stat_card', width: 1, title: 'Total Revenue',
                    value: formatCurrency(revenueTotal), subValue: `${formatCurrency(revenueMonthly)} this month`,
                    icon: 'DollarSign', theme: 'emerald',
                    category: 'Revenue',
                    description: 'Gross revenue calculated as the sum of (Subtotal + Shipping + Packing + VAT) for all paid orders.'
                });

                // Orders
                const ordersTotal = await Order.count({ where: { vendor_id: user.id } });
                const ordersMonthly = await Order.count({ where: { vendor_id: user.id, created_at: { [Op.gte]: startOfMonth } } });
                items.push({
                    type: 'stat_card', width: 1, title: 'Total Orders',
                    value: ordersTotal, subValue: `${ordersMonthly} this month`,
                    icon: 'ShoppingCart', theme: 'orange',
                    category: 'Orders',
                    description: 'All orders received, including pending and completed.'
                });

                // Customers
                const customersTotal = await Order.count({ distinct: true, col: 'user_id', where: { vendor_id: user.id } });
                const customersMonthly = await Order.count({ distinct: true, col: 'user_id', where: { vendor_id: user.id, created_at: { [Op.gte]: startOfMonth } } });
                items.push({
                    type: 'stat_card', width: 1, title: 'Total Customers',
                    value: customersTotal, subValue: `${customersMonthly} served this month`,
                    icon: 'Users', theme: 'blue',
                    category: 'Customers',
                    description: 'Unique customers who have purchased from your store.'
                });

                // Products
                const productsTotal = await Product.count({ where: { vendor_id: user.id } });
                items.push({
                    type: 'stat_card', width: 1, title: 'Total Products',
                    value: productsTotal, icon: 'Package', theme: 'purple',
                    category: 'Products',
                    description: 'Total number of products listed in your catalog.'
                });

                // Low Stock
                const lowStock = await Product.count({ where: { vendor_id: user.id, stock: { [Op.lt]: 5 } } });
                items.push({
                    type: 'stat_card', width: 1, title: 'Low Stock Products',
                    value: lowStock, icon: 'AlertCircle', theme: 'red',
                    category: 'Products',
                    description: 'Products with less than 5 units in stock.'
                });

            } else {
                // --- ADMIN DASHBOARD (SDUI with Permissions) ---

                const permissionService = new PermissionService();
                const isSuperAdmin = user.user_type === 'super_admin';

                // Fetch all permissions at once for efficiency
                const userPermissions = isSuperAdmin ? [] : await permissionService.getUserPermissionNames(user.id);
                const hasPerm = (perm: string) => isSuperAdmin || userPermissions.includes(perm);

                // Base Filters
                const vendorWhere: any = { user_type: 'vendor' };
                const customerWhere: any = { user_type: 'customer' };

                // --- VENDOR WIDGETS ---
                if (hasPerm('vendor.view')) {
                    const profileFilter = {
                        model: UserProfile,
                        as: 'profile',
                        where: { onboarding_status: { [Op.ne]: 'in_progress' } },
                        required: true
                    };

                    const totalVendors = await User.count({
                        where: vendorWhere,
                        include: [profileFilter]
                    });

                    const monthlyVendors = await User.count({
                        where: { ...vendorWhere, created_at: { [Op.gte]: startOfMonth } },
                        include: [profileFilter]
                    });

                    items.push({
                        type: 'stat_card', width: 1, title: 'Total Vendors',
                        value: totalVendors, subValue: `${monthlyVendors} new this month`,
                        icon: 'Store', theme: 'blue',
                        category: 'Vendors',
                        description: 'Total vendors with submitted profiles. Excludes "in-progress" / draft applications.'
                    });

                    const activeVendors = await User.count({
                        where: { ...vendorWhere, is_active: true },
                        include: [{
                            model: UserProfile, as: 'profile',
                            where: { onboarding_status: { [Op.in]: ['approved_general', 'approved_controlled'] } },
                            required: true
                        }]
                    });
                    items.push({
                        type: 'stat_card', width: 1, title: 'Active Vendors',
                        value: activeVendors, icon: 'UserCheck', theme: 'green',
                        category: 'Vendors',
                        description: 'Vendors with Approved status and Active account.'
                    });
                }

                // Vendor Approvals (Pending/In-Progress)
                if (hasPerm('vendor.manage') || hasPerm('vendor.approve')) {
                    const pendingVendors = await User.count({
                        where: vendorWhere,
                        include: [{ model: UserProfile, as: 'profile', where: { onboarding_status: 'pending_verification' }, required: true }]
                    });
                    items.push({
                        type: 'stat_card', width: 1, title: 'Pending Vendors',
                        value: pendingVendors, icon: 'Clock', theme: 'amber',
                        category: 'Vendors',
                        description: 'Vendors awaiting admin verification.'
                    });

                    const inProgressVendors = await User.count({
                        where: vendorWhere,
                        include: [{ model: UserProfile, as: 'profile', where: { onboarding_status: 'in_progress' }, required: true }]
                    });
                    items.push({
                        type: 'stat_card', width: 1, title: 'In-Progress Vendors',
                        value: inProgressVendors, icon: 'Loader', theme: 'yellow',
                        category: 'Vendors',
                        description: 'Vendors currently in the drafting stage (profile not submitted).'
                    });
                }

                // Controlled Vendor Stats
                if (hasPerm('vendor.controlled.approve')) {
                    const controlledFilter = { model: UserProfile, as: 'profile', where: { controlled_items: true }, required: true };

                    const controlledTotal = await User.count({ where: vendorWhere, include: [controlledFilter] });
                    items.push({
                        type: 'stat_card', width: 1, title: 'Controlled Vendors',
                        value: controlledTotal, icon: 'Shield', theme: 'indigo', category: 'Controlled Area',
                        description: 'Vendors dealing with Controlled Items (Sensitive Goods).'
                    });

                    const controlledPending = await User.count({
                        where: vendorWhere,
                        include: [{ ...controlledFilter, where: { ...controlledFilter.where, onboarding_status: 'pending_verification' } }]
                    });
                    items.push({
                        type: 'stat_card', width: 1, title: 'Pending Controlled Vendors',
                        value: controlledPending, icon: 'ShieldAlert', theme: 'amber', category: 'Controlled Area',
                        description: 'Controlled Vendors awaiting specialized verification.'
                    });
                }


                // --- CUSTOMER WIDGETS ---
                if (hasPerm('customer.view')) {
                    const profileFilter = {
                        model: UserProfile,
                        as: 'profile',
                        where: { onboarding_status: { [Op.ne]: 'in_progress' } },
                        required: true
                    };

                    const totalCustomers = await User.count({
                        where: customerWhere,
                        include: [profileFilter]
                    });

                    const monthlyCustomers = await User.count({
                        where: { ...customerWhere, created_at: { [Op.gte]: startOfMonth } },
                        include: [profileFilter]
                    });

                    items.push({
                        type: 'stat_card', width: 1, title: 'Total Customers',
                        value: totalCustomers, subValue: `${monthlyCustomers} new this month`,
                        icon: 'Users', theme: 'indigo',
                        category: 'Customers',
                        description: 'Total customers with submitted profiles. Excludes incomplete registrations.'
                    });
                }

                if (hasPerm('customer.manage') || hasPerm('customer.approve')) {
                    const pendingCustomers = await User.count({
                        where: customerWhere,
                        include: [{ model: UserProfile, as: 'profile', where: { onboarding_status: 'pending_verification' }, required: true }]
                    });
                    items.push({
                        type: 'stat_card', width: 1, title: 'Pending Customers',
                        value: pendingCustomers, icon: 'UserPlus', theme: 'amber', category: 'Customers',
                        description: 'Customers awaiting admin verification.'
                    });

                    const inProgressCustomers = await User.count({
                        where: customerWhere,
                        include: [{ model: UserProfile, as: 'profile', where: { onboarding_status: 'in_progress' }, required: true }]
                    });
                    items.push({
                        type: 'stat_card', width: 1, title: 'In-Progress Customers',
                        value: inProgressCustomers, icon: 'Loader', theme: 'yellow', category: 'Customers',
                        description: 'Customers incomplete/draft registrations.'
                    });
                }

                // Controlled Customer Stats (if admin has controlled.approve permission)
                if (hasPerm('customer.controlled.approve')) {
                    const controlledFilter = { model: UserProfile, as: 'profile', where: { controlled_items: true }, required: true };

                    // Total Controlled Customers
                    const controlledTotalCustomers = await User.count({ where: customerWhere, include: [controlledFilter] });
                    items.push({
                        type: 'stat_card', width: 1, title: 'Controlled Customers',
                        value: controlledTotalCustomers, icon: 'Shield', theme: 'indigo', category: 'Controlled Area',
                        description: 'Customers purchasing Controlled Items.'
                    });

                    // Pending Controlled Customers
                    const controlledPendingCustomers = await User.count({
                        where: customerWhere,
                        include: [{ ...controlledFilter, where: { ...controlledFilter.where, onboarding_status: 'pending_verification' } }]
                    });
                    items.push({
                        type: 'stat_card', width: 1, title: 'Pending Controlled Customers',
                        value: controlledPendingCustomers, icon: 'ShieldAlert', theme: 'amber', category: 'Controlled Area',
                        description: 'Controlled Customers awaiting specialized verification.'
                    });
                }

                // --- PRODUCT WIDGETS ---
                if (hasPerm('product.view')) {
                    const totalProducts = await Product.count();
                    items.push({
                        type: 'stat_card', width: 1, title: 'Total Products',
                        value: totalProducts, icon: 'Package', theme: 'purple', category: 'Products',
                        description: 'Total number of products across all vendors.'
                    });
                }

                // --- ORDER / REVENUE WIDGETS ---
                if (hasPerm('order.view')) {
                    const totalOrders = await Order.count();
                    const monthlyOrders = await Order.count({ where: { created_at: { [Op.gte]: startOfMonth } } });
                    items.push({
                        type: 'stat_card', width: 1, title: 'Total Orders',
                        value: totalOrders, subValue: `${monthlyOrders} this month`,
                        icon: 'ShoppingCart', theme: 'orange',
                        category: 'Orders & Revenue',
                        description: 'Total number of orders placed on the platform.'
                    });

                    const totalRevenue = await Order.sum('total_amount', { where: { payment_status: 'paid' } }) || 0;
                    const monthlyRevenue = await Order.sum('total_amount', { where: { payment_status: 'paid', created_at: { [Op.gte]: startOfMonth } } }) || 0;
                    items.push({
                        type: 'stat_card', width: 1, title: 'Total Revenue',
                        value: formatCurrency(totalRevenue), subValue: `${formatCurrency(monthlyRevenue)} this month`,
                        icon: 'DollarSign', theme: 'emerald',
                        category: 'Orders & Revenue',
                        description: 'Total platform revenue calculated as the sum of (Subtotal + Shipping + Packing + VAT) for all paid orders.'
                    });
                }
            }

            return responseHandler.success({ items });

        } catch (error: any) {
            console.error('Dashboard Stats Error:', error);
            return responseHandler.handleError(error);
        }
    }

    // --- Vendor Management ---

    static async getVendors(req: NextRequest) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded?.userId || decoded?.sub;
            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            // --- Permission & Visibility Logic ---
            const permissionService = new PermissionService();
            let canViewAll = true;
            let canViewControlled = false;

            if (user.user_type === 'admin') {
                canViewAll = await permissionService.hasPermission(user.id, 'vendor.view');
                canViewControlled = await permissionService.hasPermission(user.id, 'vendor.controlled.approve');

                if (!canViewAll && !canViewControlled) {
                    return NextResponse.json({ success: false, message: 'Forbidden: Missing vendor.view or vendor.controlled.approve Permission' }, { status: 403 });
                }
            }

            const searchParams = req.nextUrl.searchParams;
            const status = searchParams.get('status');
            const onboardingStatus = searchParams.get('onboarding_status');
            const page = Number(searchParams.get('page')) || 1;
            const limit = Number(searchParams.get('limit')) || 20;
            const offset = (page - 1) * limit;

            const where: any = { user_type: 'vendor' };

            // Status filter
            if (status) {
                if (status === 'active') where.is_active = true;
                if (status === 'suspended') where.is_active = false;
            }

            // Search filter
            const search = searchParams.get('search') || searchParams.get('q');
            if (search) {
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } }
                ];
            }

            // Build profile where clause
            let profileWhere: any = {};
            const validOnboardingStatuses = ['not_started', 'in_progress', 'pending_verification', 'rejected', 'approved_general', 'approved_controlled'];

            if (onboardingStatus) {
                if (onboardingStatus === 'approved') {
                    profileWhere.onboarding_status = { [Op.in]: ['approved_general', 'approved_controlled'] };
                } else if (validOnboardingStatuses.includes(onboardingStatus)) {
                    profileWhere.onboarding_status = onboardingStatus;
                } else {
                    return NextResponse.json({ success: true, data: [], misc: { total: 0, page, pages: 0 } });
                }
            } else {
                profileWhere.onboarding_status = { [Op.in]: ['approved_general', 'approved_controlled', 'pending_verification'] };
            }

            // Controlled filter
            const controlled = searchParams.get('controlled');
            if (controlled === 'true') {
                profileWhere.controlled_items = true;
                profileWhere.onboarding_status = { [Op.ne]: 'approved_general' };
            } else if (controlled === 'false') {
                profileWhere[Op.or] = [
                    { controlled_items: { [Op.or]: [false, null] } },
                    { [Op.and]: [{ controlled_items: true }, { onboarding_status: 'approved_general' }] }
                ];
            }

            // --- Apply Visibility Filter ---
            // If Admin doesn't have 'VIEW ALL', they are restricted.
            if (user.user_type === 'admin' && !canViewAll) {
                // If they only have Controlled View, they see ONLY controlled items.
                if (canViewControlled) {
                    profileWhere.controlled_items = true;
                    // Ensure strict visibility if they only have controlled access
                    profileWhere.onboarding_status = { [Op.ne]: 'approved_general' };
                }
            }
            // If they have canViewAll, we don't apply any extra filter (they see true and false).

            const vendors = await User.findAndCountAll({
                where,
                attributes: {

                    include: [
                        [
                            sequelize.literal(`(
                        SELECT COUNT(*)::int
                        FROM products AS p
                        WHERE p.vendor_id = "User"."id"
                        AND p.status = 'published'
                        AND p.deleted_at IS NULL
                    )`),
                            'product_count'
                        ],
                        [
                            sequelize.literal(`(
                        SELECT COUNT(*)::int
                        FROM products AS p
                        WHERE p.vendor_id = "User"."id"
                        AND p.approval_status = 'pending'
                        AND p.status != 'draft'
                        AND p.deleted_at IS NULL
                    )`),
                            'pending_product_count'
                        ]
                    ]
                },
                include: [
                    {
                        model: UserProfile,
                        as: 'profile',
                        where: profileWhere,
                        required: true
                    }
                ],
                limit,
                offset,
                order: [['created_at', 'DESC']]
            });

            const formattedVendors = await Promise.all(vendors.rows.map(async (vendor: any) => {
                const v = vendor.toJSON ? vendor.toJSON() : { ...vendor };
                if (v.profile) {
                    v.profile = await AdminController.formatVendorProfile(v.profile);
                }
                return v;
            }));

            // Calculate pending count for frontend auto-filter
            const pendingCount = await User.count({
                where: { user_type: 'vendor' },
                include: [{
                    model: UserProfile,
                    as: 'profile',
                    where: { onboarding_status: 'pending_verification' },
                    required: true
                }]
            });

            return NextResponse.json({
                success: true,
                data: formattedVendors,
                misc: {
                    total: vendors.count,
                    page,
                    pages: Math.ceil(vendors.count / limit),
                    pending_count: pendingCount
                }
            });
        } catch (error: any) {
            console.error('Get Vendors Error:', error);
            return responseHandler.handleError(error);
        }
    }

    static async getVendor(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded?.userId || decoded?.sub;
            const user = await User.findByPk(userId);

            // Allow if admin, super_admin, OR if user is viewing their own profile
            const isSelf = user && (user.id === params.id);
            const isAdmin = user && ['admin', 'super_admin'].includes(user.user_type);

            if (!user || (!isAdmin && !isSelf)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            // Permission Check (Only for Admins viewing others)
            if (isAdmin && !isSelf && user.user_type !== 'super_admin') {
                const hasPerm = await new PermissionService().hasAnyPermission(user.id, [
                    'vendor.view',
                    'vendor.manage',
                    'vendor.approve',
                    'vendor.controlled.approve'
                ]);
                if (!hasPerm) return NextResponse.json({ success: false, message: 'Forbidden: Missing required vendor permission' }, { status: 403 });
            }

            const vendor = await User.findOne({
                where: { id: params.id, user_type: 'vendor' },
                attributes: undefined,
                include: [{
                    model: UserProfile,
                    as: 'profile',
                    include: [{ model: RefEntityType, as: 'entityType' }]
                }]
            });

            if (!vendor) {
                return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
            }

            const v: any = vendor.toJSON ? vendor.toJSON() : { ...vendor };
            if (v.profile) {
                v.profile = await AdminController.formatVendorProfile(v.profile);
            }

            return NextResponse.json({
                success: true,
                data: v
            });

        } catch (error: any) {
            console.error('Get Vendor Error Details:', error);
            return responseHandler.handleError(error);
        }
    }

    static async updateVendorStatus(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded.userId || decoded.sub;
            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            // Permission Check
            if (user.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'vendor.manage');
                if (!hasPerm) return NextResponse.json({ success: false, message: 'Forbidden: Missing vendor.manage Permission' }, { status: 403 });
            }

            const body = await req.json();
            const { action } = body;

            const vendor = await User.findByPk(params.id);
            if (!vendor) return NextResponse.json({ success: false, message: 'Vendor not found', code: 310 }, { status: 404 });

            if (action === 'activate') {
                vendor.is_active = true;
                vendor.suspended_at = null as any;
                vendor.suspended_by = null as any;
                vendor.suspended_reason = null as any;
            } else if (action === 'suspend') {
                vendor.is_active = false;
                vendor.suspended_at = new Date();
                vendor.suspended_by = 'Admin';
                vendor.suspended_reason = body.reason || 'Admin suspended';
            }

            await vendor.save();
            return NextResponse.json({ success: true, message: `Vendor ${action}d successfully` });
        } catch (error) {
            console.error('Update Vendor Status Error:', error);
            return NextResponse.json({ success: false, message: 'Failed to update status', code: 300 }, { status: 500 });
        }
    }

    static async updateVendorOnboarding(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded.userId || decoded.sub;
            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            const body = await req.json();
            const { status, note, fields_to_clear, target_step } = body;

            const validStatuses = ['approved_general', 'approved_controlled', 'rejected', 'update_needed'];
            if (!validStatuses.includes(status)) {
                return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
            }

            const vendor = await User.findByPk(params.id, {
                include: [{ model: UserProfile, as: 'profile' }]
            });

            if (!vendor || !vendor.profile) {
                return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
            }

            const profile: any = vendor.profile;

            // --- Permission Logic (Universal UAE Rule) ---
            if (user.user_type === 'admin') {
                const permissionService = new PermissionService();
                const isUAE = ['UAE', 'United Arab Emirates', 'United Arab Emirates (UAE)'].includes(profile.country);
                const isControlled = profile.controlled_items === true;

                let requiredPermission = 'vendor.approve';
                if (status === 'approved_controlled') {
                    requiredPermission = 'vendor.controlled.approve';
                } else if (isControlled && isUAE) {
                    requiredPermission = 'vendor.controlled.approve';
                }

                console.log(`[AdminController] Vendor Onboarding Update: User=${user.id}, Status=${status}, IsControlled=${isControlled}, IsUAE=${isUAE}, RequiredPerm=${requiredPermission}`);

                let hasPerm = await permissionService.hasPermission(user.id, requiredPermission);

                // Fallback: If 'vendor.approve' is required but missing, check if they have 'vendor.controlled.approve'
                if (!hasPerm && requiredPermission === 'vendor.approve') {
                    const hasControlled = await permissionService.hasPermission(user.id, 'vendor.controlled.approve');
                    if (hasControlled) {
                        console.log('[AdminController] Fallback: User has vendor.controlled.approve, allowing.');
                        hasPerm = true;
                    }
                }

                if (!hasPerm) {
                    console.log(`[AdminController] Forbidden: User ${user.id} missing ${requiredPermission}`);
                    return NextResponse.json({ success: false, message: `Forbidden: Missing ${requiredPermission} Permission` }, { status: 403 });
                }
            }

            const updateData: any = {
                onboarding_status: status,
                reviewed_at: new Date(),
                reviewed_by: user.id,
            };

            if (status === 'rejected' || status === 'update_needed') {
                updateData.rejection_reason = note;
                // vendor.is_active = false; // Do not deactivate user on rejection, so they can login to fix profile

                // --- Field Clearing & File Deletion Logic ---
                if (Array.isArray(fields_to_clear) && fields_to_clear.length > 0) {
                    const fieldStepMap: Record<string, number> = {
                        // Step 1: Company Info
                        'registered_company_name': 1,
                        'country_of_registration': 1,
                        'year_of_establishment': 1,
                        'entity_type': 1,
                        'official_website': 1,
                        'trade_brand_name': 1,
                        'city_office_address': 1,
                        // Step 2: Contact Person
                        'contact_full_name': 2,
                        'contact_work_email': 2,
                        'contact_mobile': 2,
                        'contact_job_title': 2,
                        'contact_id_document_url': 2,
                        // Step 3: Declaration
                        'nature_of_business': 3,
                        'license_types': 3,
                        'end_use_markets': 3,
                        'operating_countries': 3,
                        'business_license_url': 3,
                        'company_profile_url': 3,
                        // Step 5: Bank Details
                        'bank_account_number': 5,
                        'iban': 5,
                        'swift_code': 5,
                        'bank_proof_url': 5,
                        'preferred_currency': 5
                    };

                    const NON_NULLABLE_FIELDS = new Set(['controlled_items']);

                    let minStep = 99;

                    for (const field of fields_to_clear) {
                        // Update Step
                        const step = fieldStepMap[field];
                        if (step !== undefined && step < minStep) {
                            minStep = step;
                        }

                        // Delete File
                        if (field.endsWith('_url') && profile[field]) {
                            try {
                                const fileUrl = profile[field];
                                // Attempt to extract local path. Assumption: URL structure matches static path
                                // If absolute URL, extract path component.
                                let relativePath = fileUrl;
                                if (fileUrl.startsWith('http')) {
                                    try {
                                        const urlObj = new URL(fileUrl);
                                        relativePath = decodeURIComponent(urlObj.pathname.substring(1)); // Remove leading /
                                    } catch (e) {
                                        // invalid url, unlikely if from system
                                    }
                                }

                                const filePath = path.join(process.cwd(), relativePath);
                                if (fs.existsSync(filePath)) {
                                    fs.unlinkSync(filePath);
                                    console.log(`[AdminController] Deleted file: ${filePath}`);
                                }
                            } catch (err) {
                                console.error(`[AdminController] Failed to delete file for field ${field}:`, err);
                            }
                        }

                        // Clear Field in Update Data (only if nullable)
                        if (!NON_NULLABLE_FIELDS.has(field)) {
                            if (field === 'nature_of_business' || field === 'license_types' || field === 'end_use_markets' || field === 'operating_countries') {
                                updateData[field] = [];
                            } else {
                                updateData[field] = null;
                            }
                        }
                    }

                    // Reset Onboarding Step (Prioritize Manual Override)
                    if (target_step !== undefined && target_step !== null) {
                        vendor.onboarding_step = target_step;
                        updateData.current_step = target_step;
                    } else if (minStep !== 99) {
                        // Ensure we are tracking step. If minStep < current step, revert.
                        // Even if current step is null (completed), revert to minStep.
                        if (vendor.onboarding_step === null || vendor.onboarding_step > minStep) {
                            vendor.onboarding_step = minStep;
                            updateData.current_step = minStep; // Sync both fields
                        }
                    }
                }

                await vendor.save();
            } else {
                updateData.review_note = note;
                updateData.review_note = note;
                // vendor.is_active = true;
                await vendor.save();
            }

            const [updatedRows] = await UserProfile.update(updateData, {
                where: { user_id: vendor.id }
            });

            if (updatedRows === 0) {
                return NextResponse.json({ success: false, message: 'Failed to persist updates to profile' }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: `Vendor onboarding status updated to ${status}` });
        } catch (error: any) {
            console.error('Update Vendor Onboarding Error:', error);
            return NextResponse.json({ success: false, message: 'Failed to update onboarding status', debug: error.message }, { status: 500 });
        }
    }


    // --- Settings ---

    static async getSettings(req: NextRequest) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded.userId || decoded.sub;
            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            // Permission Check
            if (user.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'settings.manage');
                if (!hasPerm) return NextResponse.json({ success: false, message: 'Forbidden: Missing settings.manage Permission' }, { status: 403 });
            }

            const settings = await PlatformSetting.findAll();
            const map: any = {};
            settings.forEach(s => map[s.key] = s.value);
            return NextResponse.json({ success: true, data: map });
        } catch (error) {
            return NextResponse.json({ success: false, message: 'Failed to fetch settings' }, { status: 500 });
        }
    }

    static async updateSettings(req: NextRequest) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded.userId || decoded.sub;
            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            // Permission Check
            if (user.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'settings.manage');
                if (!hasPerm) return NextResponse.json({ success: false, message: 'Forbidden: Missing settings.manage Permission' }, { status: 403 });
            }

            const body = await req.json();
            for (const [key, value] of Object.entries(body)) {
                await PlatformSetting.upsert({ key, value: String(value) });
            }
            return NextResponse.json({ success: true, message: 'Settings updated' });
        } catch (error) {
            return NextResponse.json({ success: false, message: 'Failed to update settings' }, { status: 500 });
        }
    }

    // ==================== Customer Management ====================

    /**
     * Fields visible to vendors (order-level info only)
     */
    private static VENDOR_VISIBLE_CUSTOMER_FIELDS = ['id', 'name', 'email', 'phone', 'country_code', 'created_at'];

    /**
     * GET /api/v1/admin/customers
     * List all customers (Admin: all, Vendor: only customers who bought their products)
     */
    static async getCustomers(req: NextRequest) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded?.userId || decoded?.sub;
            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin', 'vendor'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            const isVendor = user.user_type === 'vendor';

            // --- Permission & Visibility Logic ---
            let canViewAll = true;
            let canViewControlled = false;

            if (user.user_type === 'admin') {
                const permissionService = new PermissionService();
                // View All allowed if user has View, Manage, or Approve (General) permissions
                const hasView = await permissionService.hasPermission(user.id, 'customer.view');
                const hasManage = await permissionService.hasPermission(user.id, 'customer.manage');
                const hasApprove = await permissionService.hasPermission(user.id, 'customer.approve');

                canViewAll = hasView || hasManage || hasApprove;
                canViewControlled = await permissionService.hasPermission(user.id, 'customer.controlled.approve');

                if (!canViewAll && !canViewControlled) {
                    return NextResponse.json({ success: false, message: 'Forbidden: Missing customer.view/manage/approve or customer.controlled.approve Permission' }, { status: 403 });
                }
            }


            const searchParams = req.nextUrl.searchParams;
            const search = searchParams.get('search');
            const status = searchParams.get('status');
            const onboardingStatus = searchParams.get('onboarding_status');
            const controlled = searchParams.get('controlled');
            const page = Number(searchParams.get('page')) || 1;
            const limit = Number(searchParams.get('limit')) || 20;
            const offset = (page - 1) * limit;

            let customerIds: string[] = [];

            // For vendors, first find customers who ordered their products
            if (isVendor) {
                const vendorOrders = await Order.findAll({
                    include: [{
                        model: OrderItem,
                        as: 'items',
                        required: true,
                        where: { vendor_id: user.id },
                        attributes: []
                    }],
                    attributes: ['user_id'],
                    group: ['Order.id', 'Order.user_id']
                });
                customerIds = [...new Set(vendorOrders.map((o: any) => o.user_id))];

                if (customerIds.length === 0) {
                    return NextResponse.json({
                        success: true,
                        data: [],
                        misc: { total: 0, page, pages: 0 }
                    });
                }
            }

            // Build where clause
            const where: any = { user_type: 'customer' };

            if (isVendor) {
                where.id = { [Op.in]: customerIds };
            }

            if (status) {
                if (status === 'active') where.is_active = true;
                if (status === 'suspended') where.is_active = false;
            }

            if (search) {
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                    { phone: { [Op.iLike]: `%${search}%` } }
                ];
            }

            // Build profile where clause
            let profileWhere: any = {};
            const validOnboardingStatuses = ['not_started', 'in_progress', 'pending_verification', 'rejected', 'approved_general', 'approved_controlled'];

            if (onboardingStatus) {
                if (onboardingStatus === 'approved') {
                    profileWhere.onboarding_status = { [Op.in]: ['approved_general', 'approved_controlled'] };
                } else if (validOnboardingStatuses.includes(onboardingStatus)) {
                    profileWhere.onboarding_status = onboardingStatus;
                }
            }

            // Controlled filter
            if (controlled === 'true') {
                profileWhere.controlled_items = true;
                profileWhere.onboarding_status = { [Op.ne]: 'approved_general' };
            } else if (controlled === 'false') {
                profileWhere[Op.or] = [
                    { controlled_items: { [Op.or]: [false, null] } },
                    { [Op.and]: [{ controlled_items: true }, { onboarding_status: 'approved_general' }] }
                ];
            }

            // --- Apply Visibility Filter (Admin) ---
            let include: any[] = [];

            if (user.user_type === 'admin') {
                // If restricted view
                if (!canViewAll) {
                    // Must be Controlled access only
                    include.push({
                        model: UserProfile,
                        as: 'profile',
                        where: {
                            ...profileWhere,
                            controlled_items: true,
                            onboarding_status: { [Op.ne]: 'approved_general' }
                        },
                        required: true
                    });
                } else {
                    // Can view all, but we need profile for onboarding_status display
                    include.push({
                        model: UserProfile,
                        as: 'profile',
                        where: Object.keys(profileWhere).length > 0 ? profileWhere : undefined,
                        attributes: ['onboarding_status', 'controlled_items'],
                        required: Object.keys(profileWhere).length > 0
                    });
                }
            } else if (user.user_type === 'super_admin') {
                // Super admin sees all, include profile
                include.push({
                    model: UserProfile,
                    as: 'profile',
                    where: Object.keys(profileWhere).length > 0 ? profileWhere : undefined,
                    attributes: ['onboarding_status', 'controlled_items'],
                    required: Object.keys(profileWhere).length > 0
                });
            }

            const attributes = isVendor
                ? this.VENDOR_VISIBLE_CUSTOMER_FIELDS
                : undefined;

            const customers = await User.findAndCountAll({
                where,
                attributes,
                include,
                limit,
                offset,
                order: [['created_at', 'DESC']]
            });

            return NextResponse.json({
                success: true,
                data: customers.rows,
                misc: {
                    total: customers.count,
                    page,
                    pages: Math.ceil(customers.count / limit)
                }
            });
        } catch (error: any) {
            console.error('Get Customers Error:', error);
            return responseHandler.handleError(error);
        }
    }

    /**
     * GET /api/v1/admin/customers/:id
     * Get single customer details (Admin: full, Vendor: limited to order-visible info)
     */
    static async getCustomer(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded?.userId || decoded?.sub;
            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin', 'vendor'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            const isAdmin = ['admin', 'super_admin'].includes(user.user_type);
            const isVendor = user.user_type === 'vendor';

            // --- Permission & Visibility Logic ---
            let canViewAll = true;
            let canViewControlled = false;

            if (user.user_type === 'admin') {
                const permissionService = new PermissionService();
                canViewAll = await permissionService.hasAnyPermission(user.id, ['customer.view', 'customer.manage', 'customer.approve']);
                canViewControlled = await permissionService.hasPermission(user.id, 'customer.controlled.approve');

                if (!canViewAll && !canViewControlled) {
                    return NextResponse.json({ success: false, message: 'Forbidden: Missing customer.view/manage/approve or customer.controlled.approve Permission' }, { status: 403 });
                }
            }

            // For vendors, verify customer has bought their products
            if (isVendor) {
                const hasOrder = await Order.findOne({
                    where: { user_id: params.id },
                    include: [{
                        model: OrderItem,
                        as: 'items',
                        required: true,
                        where: { vendor_id: user.id }
                    }]
                });
                if (!hasOrder) {
                    return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
                }
            }

            const attributes = isVendor
                ? this.VENDOR_VISIBLE_CUSTOMER_FIELDS
                : undefined;

            const include = isAdmin ? [{
                model: UserProfile,
                as: 'profile',
                include: [
                    { model: RefEntityType, as: 'entityType' },
                    { model: ReferenceModels.RefBuyerType, as: 'buyerType' },
                    { model: ReferenceModels.RefProcurementPurpose, as: 'procurementPurpose' },
                    { model: ReferenceModels.RefEndUserType, as: 'endUserType' }
                ]
            }] : [];

            const customer: any = await User.findOne({
                where: { id: params.id, user_type: 'customer' },
                attributes,
                include
            });

            // Enforce Controlled Visibility if needed
            if (user.user_type === 'admin' && !canViewAll) {
                const profile = customer?.profile;
                const profileData = profile ? (profile.dataValues || profile) : {};


                // Check both direct access and dataValues
                const isControlled = (profileData.controlled_items === true) || (profileData.onboarding_status === 'approved_controlled');

                if (!isControlled) {
                    return NextResponse.json({
                        success: false,
                        message: 'Forbidden: Access restricted to Controlled Customers'
                    }, { status: 403 });
                }
            }

            if (!customer) {
                return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
            }

            let responseData: any = customer;
            if (isAdmin) {
                const c: any = customer.toJSON ? customer.toJSON() : { ...customer };
                if (c.profile) {
                    // Pass the MODEL instance if available in memory, but here we likely have plain object if toJSON was called on customer.
                    // Ideally we should pass customer.profile (the model) to formatVendorProfile if formatVendorProfile expects model.
                    // But formatVendorProfile handles plain object too. 
                    // However, toJSON() of customer includes profile which includes relations. 
                    // So c.profile has buyerType object.
                    c.profile = await AdminController.formatVendorProfile(c.profile);
                }
                responseData = c;
            }

            return NextResponse.json({
                success: true,
                data: responseData
            });
        } catch (error: any) {
            console.error('Get Customer Error:', error);
            return responseHandler.handleError(error);
        }
    }

    /**
     * PATCH /api/v1/admin/customers/:id/status
     * Update customer status (Admin only)
     */
    static async updateCustomerStatus(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded?.userId || decoded?.sub;
            const user = await User.findByPk(userId);

            // Admin only
            if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            // Permission Check for Admins
            if (user.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'customer.manage');
                if (!hasPerm) return NextResponse.json({ success: false, message: 'Forbidden: Missing customer.manage Permission' }, { status: 403 });
            }

            const body = await req.json();
            const { action, reason } = body;

            if (!action || !['activate', 'suspend'].includes(action)) {
                return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
            }

            const customer = await User.findOne({ where: { id: params.id, user_type: 'customer' } });
            if (!customer) {
                return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
            }

            if (action === 'activate') {
                customer.is_active = true;
                customer.suspended_at = null as any;
                customer.suspended_by = null as any;
                customer.suspended_reason = null as any;
            } else if (action === 'suspend') {
                customer.is_active = false;
                customer.suspended_at = new Date();
                customer.suspended_by = user.id;
                customer.suspended_reason = reason || 'Suspended by admin';
            }

            await customer.save();

            return NextResponse.json({
                success: true,
                message: `Customer ${action}d successfully`
            });
        } catch (error: any) {
            console.error('Update Customer Status Error:', error);
            return NextResponse.json({ success: false, message: 'Failed to update customer status', debug: error?.message }, { status: 500 });
        }
    }

    /**
     * PATCH /api/v1/admin/customers/:id/onboarding
     * Update customer onboarding status (e.g. approve controlled)
     */
    static async updateCustomerOnboarding(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded?.userId || decoded?.sub;


            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            const body = await req.json();
            const { status, note, fields_to_clear, target_step } = body;

            const validStatuses = ['approved_general', 'approved_controlled', 'rejected', 'in_progress', 'pending_verification', 'update_needed'];
            if (!validStatuses.includes(status)) {
                return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
            }

            const customer = await User.findOne({
                where: { id: params.id, user_type: 'customer' },
                include: [{ model: UserProfile, as: 'profile' }]
            });

            if (!customer) {
                return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
            }

            const profile: any = customer.profile;
            if (!profile) {
                // Create profile if missing? Or error?
                return NextResponse.json({ success: false, message: 'Customer profile missing' }, { status: 404 });
            }

            // --- Permission Logic (Universal UAE Rule) ---
            if (user.user_type === 'admin') {
                const permissionService = new PermissionService();

                // Check if strict permission is required
                const isUAE = ['UAE', 'United Arab Emirates', 'United Arab Emirates (UAE)'].includes(profile.country);
                const isControlledIsSet = profile.controlled_items === true;

                let requiredPermission = 'customer.approve';

                if (status === 'approved_controlled') {
                    requiredPermission = 'customer.controlled.approve';
                } else {
                    // approved_general or rejected
                    if (isControlledIsSet && isUAE) {
                        requiredPermission = 'customer.controlled.approve';
                    }
                }

                let hasPerm = await permissionService.hasPermission(user.id, requiredPermission);

                console.log(`[AdminController] Customer Onboarding Update: User=${user.id}, Status=${status}, IsControlled=${isControlledIsSet}, IsUAE=${isUAE}, RequiredPerm=${requiredPermission}`);

                // Fallback: If 'customer.approve' is required but missing, check if they have 'customer.controlled.approve' (Superset)
                if (!hasPerm && requiredPermission === 'customer.approve') {
                    const hasControlled = await permissionService.hasPermission(user.id, 'customer.controlled.approve');
                    if (hasControlled) {
                        console.log('[AdminController] Fallback: User has customer.controlled.approve, allowing.');
                        hasPerm = true;
                    }
                }

                if (!hasPerm) {
                    console.log(`[AdminController] Forbidden: User ${user.id} missing ${requiredPermission}`);
                    return NextResponse.json({ success: false, message: `Forbidden: Missing ${requiredPermission} Permission` }, { status: 403 });
                }
            }

            const updateData: any = {
                onboarding_status: status,
                reviewed_at: new Date(),
                reviewed_by: user.id,
            };

            if (status === 'rejected' || status === 'update_needed') {
                updateData.rejection_reason = note;
                updateData.rejection_reason = note;
                // customer.is_active = false;

                // --- Field Clearing & File Deletion Logic ---
                if (Array.isArray(fields_to_clear) && fields_to_clear.length > 0) {
                    const fieldStepMap: Record<string, number> = {
                        // Step 1: Buyer Info (mapped to step 0/1 in controller)
                        'company_name': 1,
                        'country': 1,
                        'company_email': 1,
                        'company_phone': 1,
                        'type_of_buyer': 1,
                        'year_of_establishment': 1,
                        'city_office_address': 1,
                        'official_website': 1,
                        'govt_compliance_reg_url': 1,
                        // Step 2: Contact Person
                        'contact_full_name': 2,
                        'contact_job_title': 2,
                        'contact_work_email': 2,
                        'contact_id_document_url': 2,
                        'contact_mobile': 2,
                        'terms_accepted': 2,
                        // Step 3: Declaration
                        'nature_of_business': 3,
                        'license_types': 3,
                        'end_use_markets': 3,
                        'operating_countries': 3,
                        'controlled_items': 3,
                        'procurement_purpose': 3,
                        'end_user_type': 3,
                        'business_license_url': 3,
                        'compliance_terms_accepted': 3,
                        // Step 4: Account Setup
                        'selling_categories': 4,
                        'register_as': 4,
                        'preferred_currency': 4,
                        'sponsor_content': 4
                    };

                    let minStep = 99;

                    for (const field of fields_to_clear) {
                        const step = fieldStepMap[field];
                        if (step !== undefined && step < minStep) {
                            minStep = step;
                        }

                        // Delete File
                        if (field.endsWith('_url') && profile[field]) {
                            try {
                                const fileUrl = profile[field];
                                let relativePath = fileUrl;
                                if (fileUrl.startsWith('http')) {
                                    try {
                                        const urlObj = new URL(fileUrl);
                                        relativePath = decodeURIComponent(urlObj.pathname.substring(1));
                                    } catch (e) { }
                                }

                                const filePath = path.join(process.cwd(), relativePath);
                                if (fs.existsSync(filePath)) {
                                    fs.unlinkSync(filePath);
                                }
                            } catch (err) {
                                console.error(`[AdminController] Failed to delete customer file ${field}:`, err);
                            }
                        }

                        // Clear Field (only if nullable)
                        const NON_NULLABLE_FIELDS = new Set(['controlled_items']);
                        if (!NON_NULLABLE_FIELDS.has(field)) {
                            if (field === 'nature_of_business' || field === 'license_types' || field === 'end_use_markets' || field === 'operating_countries' || field === 'selling_categories') {
                                updateData[field] = [];
                            } else {
                                updateData[field] = null;
                            }
                        }
                    }


                    if (target_step !== undefined && target_step !== null) {
                        customer.onboarding_step = target_step;
                        updateData.current_step = target_step;
                    } else if (minStep !== 99) {
                        if (customer.onboarding_step === null || customer.onboarding_step > minStep) {
                            customer.onboarding_step = minStep;
                            updateData.current_step = minStep; // Sync both
                        }
                    }
                }


                await customer.save();
            } else {
                updateData.review_note = note;
                updateData.review_note = note;
                // customer.is_active = true;
                await customer.save();
            }

            await UserProfile.update(updateData, {
                where: { user_id: customer.id }
            });

            return NextResponse.json({ success: true, message: `Customer onboarding status updated to ${status}` });
        } catch (error: any) {
            console.error('Update Customer Onboarding Error:', error);
            return NextResponse.json({ success: false, message: 'Failed to update onboarding status', debug: error.message }, { status: 500 });
        }
    }

    /**
     * GET /api/v1/admin/customers/:id/orders
     * Get customer's orders (Admin: all, Vendor: only orders with their products)
     */
    static async getCustomerOrders(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded?.userId || decoded?.sub;
            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin', 'vendor'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            const isVendor = user.user_type === 'vendor';

            // Permission Check for Admins
            if (user.user_type === 'admin') {
                // Viewing orders of a customer essentially requires view access to customer
                const hasPerm = await new PermissionService().hasPermission(user.id, 'customer.view');
                if (!hasPerm) return NextResponse.json({ success: false, message: 'Forbidden: Missing customer.view Permission' }, { status: 403 });
            }

            const searchParams = req.nextUrl.searchParams;
            const status = searchParams.get('status');
            const page = Number(searchParams.get('page')) || 1;
            const limit = Number(searchParams.get('limit')) || 20;
            const offset = (page - 1) * limit;

            const customer = await User.findOne({ where: { id: params.id, user_type: 'customer' } });
            if (!customer) {
                return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
            }

            const where: any = { user_id: params.id };
            if (status) where.status = status;

            const include: any[] = [
                {
                    model: OrderItem,
                    as: 'items',
                    ...(isVendor ? { where: { vendor_id: user.id }, required: true } : {}),
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'sku', 'vendor_id']
                    }]
                }
            ];

            const orders = await Order.findAndCountAll({
                where,
                include,
                limit,
                offset,
                order: [['created_at', 'DESC']],
                distinct: true
            });

            return NextResponse.json({
                success: true,
                data: orders.rows,
                misc: {
                    total: orders.count,
                    page,
                    pages: Math.ceil(orders.count / limit)
                }
            });
        } catch (error: any) {
            console.error('Get Customer Orders Error:', error);
            return NextResponse.json({ success: false, message: 'Failed to fetch orders', debug: error?.message }, { status: 500 });
        }
    }

    /**
     * GET /api/v1/admin/customers/:id/orders/:orderId
     * Get specific order details (Admin: full, Vendor: only if contains their products)
     */
    static async getCustomerOrder(req: NextRequest, { params }: { params: { id: string; orderId: string } }) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            }
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded?.userId || decoded?.sub;
            const user = await User.findByPk(userId);

            if (!user || !['admin', 'super_admin', 'vendor'].includes(user.user_type)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            const isVendor = user.user_type === 'vendor';

            // Permission Check for Admins
            if (user.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'customer.view');
                if (!hasPerm) return NextResponse.json({ success: false, message: 'Forbidden: Missing customer.view Permission' }, { status: 403 });
            }

            if (isVendor) {
                const hasVendorProduct = await OrderItem.findOne({
                    where: { order_id: params.orderId, vendor_id: user.id }
                });
                if (!hasVendorProduct) {
                    return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
                }
            }

            const order = await Order.findOne({
                where: { id: params.orderId, user_id: params.id },
                include: [
                    {
                        model: OrderItem,
                        as: 'items',
                        include: [{
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'name', 'sku', 'vendor_id']
                        }]
                    },
                    {
                        model: User,
                        as: 'user',
                        attributes: isVendor ? this.VENDOR_VISIBLE_CUSTOMER_FIELDS : undefined
                    }
                ]
            });

            if (!order) {
                return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                data: order
            });
        } catch (error: any) {
            console.error('Get Customer Order Error:', error);
            return NextResponse.json({ success: false, message: 'Failed to fetch order', debug: error?.message }, { status: 500 });
        }
    }
    // PATCH /api/v1/admin/customers/:id/profile
    // Update customer profile fields (Admin only, e.g. specialized discount)
    static async updateCustomerProfile(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const customerId = params.id;
            if (!customerId) return responseHandler.error('Invalid ID', 200, [], undefined, req);

            const body = await req.json();

            // Validate specialized discount
            if (body.discount !== undefined) {
                const discount = Number(body.discount);
                if (isNaN(discount) || discount < 0 || discount > 3) {
                    return responseHandler.error('Specialized discount must be between 0 and 3%', 200, [], undefined, req);
                }
                body.discount = discount;
            }

            // Fetch profile
            const profile = await UserProfile.findOne({ where: { user_id: customerId } });
            if (!profile) return responseHandler.error('Customer profile not found', 310, [], undefined, req);

            // Update allowed fields
            const allowedFields = ['discount'];
            const updateData: any = {};
            allowedFields.forEach(field => {
                if (body[field] !== undefined) {
                    updateData[field] = body[field];
                }
            });

            await profile.update(updateData);

            return responseHandler.success(profile, 'Customer profile updated successfully', 103, undefined, req);

        } catch (error: any) {
            return responseHandler.handleError(error, req);
        }
    }
}
