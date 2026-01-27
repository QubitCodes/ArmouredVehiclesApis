import { NextRequest, NextResponse } from 'next/server';
import { BaseController } from './BaseController';
import { 
    User, 
    Product, 
    Order, 
    OrderItem,
    WithdrawalRequest, 
    PlatformSetting, 
    AuthSession,
    UserProfile
} from '../models';
import { z } from 'zod';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import { verifyAccessToken } from '../utils/jwt';
import { getFileUrl } from '../utils/fileUrl';
import { PermissionService } from '../services/PermissionService';
import { responseHandler } from '../utils/responseHandler';

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
   */
  private static formatVendorProfile(profile: any): any {
      if (!profile) return null;
      const formatted = profile.toJSON ? profile.toJSON() : { ...profile };
      
      // Convert document URLs to full absolute URLs
      PROFILE_URL_FIELDS.forEach(field => {
          if (formatted[field]) {
              formatted[field] = getFileUrl(formatted[field]);
          }
      });
      
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
        const user = await User.findByPk(decoded.userId);

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
                exclude: ['password'],
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

  static async createAdmin(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const decoded: any = verifyAccessToken(token);
        const user = await User.findByPk(decoded.userId);

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

        // Create Admin User
        const newAdmin = await User.create({
            name,
            email,
            phone,
            country_code,
            password: null as any, // Explicitly null as no password is set
            user_type: 'admin',
            // Default verifications as requested
            email_verified: true,
            phone_verified: true,
            is_active: true,
        });

        // Handle Permissions Assignment
        if (validation.data.permissions && validation.data.permissions.length > 0) {
            // Strict check: Only allow if user has admin.permissions
            let canAssign = false;
            if (user.user_type === 'super_admin') {
                canAssign = true;
            } else {
                canAssign = await new PermissionService().hasPermission(user.id, 'admin.permissions');
            }

            if (canAssign) {
                await new PermissionService().syncUserPermissions(newAdmin.id, validation.data.permissions);
            } else {
                // Determine behavior: Error or Ignore?
                // For better security feedback, let's warn or just ignore. 
                // Plan said "ignore or error". Ignoring prevents crashing if frontend sends it by default permissions
                console.warn(`User ${user.id} tried to assign permissions without admin.permissions right.`);
            }
        }

        const { password, ...adminData } = newAdmin.toJSON();

        return NextResponse.json({
            success: true,
            message: 'Admin created successfully',
            data: adminData
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
        const user = await User.findByPk(decoded.userId);

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

        // Prevent updating non-admins via this endpoint
        if (!['admin', 'super_admin'].includes(targetAdmin.user_type)) {
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
        
        // Apply updates
        if (updates.name) targetAdmin.name = updates.name;
        if (updates.email) targetAdmin.email = updates.email;
        if (updates.phone) targetAdmin.phone = updates.phone;
        if (updates.country_code) targetAdmin.country_code = updates.country_code;
        if (updates.is_active !== undefined) targetAdmin.is_active = updates.is_active;

        await targetAdmin.save();

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
             // If not authorized, we simply skip the permission update (preserving existing ones)
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
        const user = await User.findByPk(decoded.userId);

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

        await targetAdmin.destroy(); // Soft delete

        return NextResponse.json({ success: true, message: 'Admin deleted successfully' });

    } catch (error: any) {
        console.error('Delete Admin Error:', error);
        return NextResponse.json({ success: false, message: 'Failed to delete admin' }, { status: 500 });
    }
  }


  // --- Dashboard ---

  async getDashboardStats(req: NextRequest) {
    try {
        const { user, error } = await this.verifyAuth(req);
        if (error) return error;

        if (!user) {
            return responseHandler.error('User not found', 404);
        }

        const data: any = {};

        if (user.user_type === 'vendor') {
            // Vendor Dashboard (Matches legacy getVendorAnalytics roughly)
             data.totalProducts = await Product.count({ where: { vendor_id: user.id } });
             data.totalOrders = await Order.count({
                 include: [{
                     model: OrderItem,
                     as: 'items',
                     required: true,
                     include: [{ 
                         model: Product, 
                         as: 'product', 
                         where: { vendor_id: user.id },
                         required: true
                     }]
                 }],
                 distinct: true
             });
             data.totalRevenue = 0; // TODO: Implement revenue calc
             data.totalCustomers = 0; // Distinct customers who bought my products
             
             // Legacy properties ensuring no breakage if frontend expects them
             data.revenue = data.totalRevenue;
             data.orders = data.totalOrders;
             data.products = data.totalProducts;

        } else {
            // Admin Dashboard
            data.totalSellers = await User.count({ where: { user_type: 'vendor' } });
            data.activeSellers = await User.count({ where: { user_type: 'vendor', is_active: true } });
            data.pendingApprovals = await User.count({ where: { user_type: 'vendor', is_active: false } }); 
            
            data.totalCustomers = await User.count({ where: { user_type: 'customer' } });
            data.totalProducts = await Product.count();
            data.totalOrders = await Order.count();
            
            const revenue = await Order.sum('total_amount', { where: { payment_status: 'paid' } });
            data.totalRevenue = revenue || 0;
            
            data.totalRefunds = 0; // Not implemented yet
            data.totalUsers = await User.count();
        }
        
        return responseHandler.success(data);

    } catch (error: any) {
        console.error('Dashboard Stats Error:', error);
        return responseHandler.error(error.message, 500);
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

      // --- Apply Visibility Filter ---
      // If Admin doesn't have 'VIEW ALL', they are restricted.
      if (user.user_type === 'admin' && !canViewAll) {
          // If they only have Controlled View, they see ONLY controlled items.
          if (canViewControlled) {
             profileWhere.controlled_items = true;
          }
      }
      // If they have canViewAll, we don't apply any extra filter (they see true and false).

      const vendors = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password'] },
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

      const formattedVendors = vendors.rows.map((vendor: any) => {
          const v = vendor.toJSON ? vendor.toJSON() : { ...vendor };
          if (v.profile) {
              v.profile = this.formatVendorProfile(v.profile);
          }
          return v;
      });

      return NextResponse.json({
        success: true,
        data: formattedVendors,
        misc: {
            total: vendors.count,
            page,
            pages: Math.ceil(vendors.count / limit)
        }
      });
    } catch (error: any) {
      console.error('Get Vendors Error:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to fetch vendors', 
        code: 300,
        debug: error?.message || String(error)
      }, { status: 500 });
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

        if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        // Permission Check
        if (user.user_type === 'admin') {
             const hasPerm = await new PermissionService().hasPermission(user.id, 'vendor.view');
             if (!hasPerm) return NextResponse.json({ success: false, message: 'Forbidden: Missing vendor.view Permission' }, { status: 403 });
        }

        const vendor = await User.findOne({
            where: { id: params.id, user_type: 'vendor' },
            attributes: { exclude: ['password'] },
            include: [{ model: UserProfile, as: 'profile' }]
        });

        if (!vendor) {
            return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
        }

        const v: any = vendor.toJSON ? vendor.toJSON() : { ...vendor };
        if (v.profile) {
            v.profile = this.formatVendorProfile(v.profile);
        }

        return NextResponse.json({
            success: true,
            data: v
        });

    } catch (error: any) {
        console.error('Get Vendor Error Details:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch vendor details', debug: error.message }, { status: 500 });
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
      const user = await User.findByPk(decoded.userId);

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
        const user = await User.findByPk(decoded.userId);
  
        if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }
  
        const body = await req.json();
        const { status, note } = body;
        
        const validStatuses = ['approved_general', 'approved_controlled', 'rejected'];
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
        // Requirement: Strict Controlled Permission ONLY if (Target is Controlled AND Target is in UAE)
        if (user.user_type === 'admin') {
             const permissionService = new PermissionService();

             // Check if strict permission is required
             const isUAE = ['UAE', 'United Arab Emirates', 'United Arab Emirates (UAE)'].includes(profile.country);
             const isControlled = profile.controlled_items === true;
             
             let requiredPermission = 'vendor.approve';
             if (isControlled && isUAE) {
                 requiredPermission = 'vendor.controlled.approve';
             }

             // Special Case: Even if NOT UAE/Controlled, if you try to approve as "approved_controlled", 
             // does it require logic? 
             // Logic: "Normal approval permission CAN use approved_controlled IF THE USER IS NOT IN UAE"
             // So relying on the (isControlled && isUAE) check above matches that exactly.
             // Wait, what if I am approving a new vendor who IS UAE but doesn't have controlled_items set yet? 
             // (They might set it during onboarding).
             // If they don't have controlled_items=true, then they are a General vendor, so 'vendor.approve' is fine.
             // If later they want to be controlled, they must switch `controlled_items` to true.
             
             // However, what if the Admin sets status to `approved_controlled` for a UAE user? 
             // That effectively makes them valid for controlled items.
             // The prompt implies: "Can see all records that have controlled ENABLED".
             // If I approve as `approved_controlled`, I am enabling it? No, `controlled_items` is a requested flag usually.
             
             // Let's stick to the prompt:
             // "Strict condition met -> *.controlled.approve"
             // If I am setting `onboarding_status` to `approved_controlled` for a UAE user, 
             // they probably HAVE `controlled_items=true`.
             // If they DON'T have `controlled_items=true` but are in UAE, does `approved_controlled` make sense?
             // Maybe. But technically `controlled_items` boolean is the flag. 
             // I will enforce strictly based on profile state + country.
             
             const hasPerm = await permissionService.hasPermission(user.id, requiredPermission);
             if (!hasPerm) {
                 return NextResponse.json({ success: false, message: `Forbidden: Missing ${requiredPermission} Permission` }, { status: 403 });
             }
        }
  
        const updateData: any = {
            onboarding_status: status,
            reviewed_at: new Date(),
            reviewed_by: user.id,
        };

        if (status === 'rejected') {
            updateData.rejection_reason = note;
            vendor.is_active = false;
            await vendor.save();
        } else {
            updateData.review_note = note;
            vendor.is_active = true;
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
       const user = await User.findByPk(decoded.userId);
 
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
      const user = await User.findByPk(decoded.userId);

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
             canViewAll = await permissionService.hasPermission(user.id, 'customer.view');
             canViewControlled = await permissionService.hasPermission(user.id, 'customer.controlled.approve'); // Assuming visibility is tied to this

             if (!canViewAll && !canViewControlled) {
                  return NextResponse.json({ success: false, message: 'Forbidden: Missing customer.view or customer.controlled.approve Permission' }, { status: 403 });
             }
        }


      const searchParams = req.nextUrl.searchParams;
      const search = searchParams.get('search');
      const status = searchParams.get('status');
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

      // --- Apply Visibility Filter (Admin) ---
      let include: any[] = [];
      
      if (user.user_type === 'admin') {
          // If restricted view
          if (!canViewAll) {
               // Must be Controlled access only
               include.push({
                   model: UserProfile,
                   as: 'profile',
                   where: { controlled_items: true },
                   required: true
               });
          } else {
             // Can view all, but we might want to include profile anyway?
             // Usually getCustomers might not return profile info to keep light? 
             // Original code didn't join Profile likely.
             // But if we need to filter on Profile attributes, we must include it if filtering.
             // But if Viewing All, we don't *need* the filter, so we don't strictly need the join *unless* 
             // we want to display controlled status.
          }
      }

      const attributes = isVendor 
        ? this.VENDOR_VISIBLE_CUSTOMER_FIELDS
        : { exclude: ['password'] };

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
      return NextResponse.json({ success: false, message: 'Failed to fetch customers', debug: error?.message }, { status: 500 });
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
             canViewAll = await permissionService.hasPermission(user.id, 'customer.view');
             canViewControlled = await permissionService.hasPermission(user.id, 'customer.controlled.approve');

             if (!canViewAll && !canViewControlled) {
                  return NextResponse.json({ success: false, message: 'Forbidden: Missing customer.view or customer.controlled.approve Permission' }, { status: 403 });
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
        : { exclude: ['password'] };

      const include = isAdmin ? [{ model: UserProfile, as: 'profile' }] : [];

      const customer: any = await User.findOne({
        where: { id: params.id, user_type: 'customer' },
        attributes,
        include
      });
      
      // Enforce Controlled Visibility if needed
      if (user.user_type === 'admin' && !canViewAll) {
          const profile = customer?.profile;
          const profileData = profile ? (profile.dataValues || profile) : {};
          
          console.log('[DEBUG] getCustomer Deep Dive:', { 
              is_model: profile instanceof UserProfile,
              keys: Object.keys(profileData),
              controlled_val: profileData.controlled_items,
              status_val: profileData.onboarding_status,
              raw_profile: JSON.stringify(profileData)
          });

          // Check both direct access and dataValues
          const isControlled = (profileData.controlled_items === true) || (profileData.onboarding_status === 'approved_controlled');
          
          if (!isControlled) {
               return NextResponse.json({ 
                   success: false, 
                   message: 'Forbidden: Access restricted to Controlled Customers',
                   debug_info: { 
                       controlled_raw: profileData.controlled_items,
                       status_raw: profileData.onboarding_status,
                       profile_keys: Object.keys(profileData)
                   } 
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
          c.profile = this.formatVendorProfile(c.profile);
        }
        responseData = c;
      }

      return NextResponse.json({
        success: true,
        data: responseData
      });
    } catch (error: any) {
      console.error('Get Customer Error:', error);
      return NextResponse.json({ success: false, message: 'Failed to fetch customer', debug: error?.message }, { status: 500 });
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

        console.log('[DEBUG] Token Decoded:', decoded);
        console.log('[DEBUG] Resolved UserId:', userId);

        const user = await User.findByPk(userId);
  
        if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }
  
        const body = await req.json();
        const { status, note } = body;
        
        const validStatuses = ['approved_general', 'approved_controlled', 'rejected', 'in_progress', 'pending_verification'];
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
             
             // If setting to controlled status OR user is already controlled+UAE
             // Actually, if we are setting 'approved_controlled', we are essentially granting Controlled status.
             // If we are setting 'approved_general', we are NOT.
             
             let requiredPermission = 'customer.approve';
             
             if (status === 'approved_controlled') {
                  // Must have strict perm to approve as controlled
                  // AND (If UAE logic applies? The prompt says "Strict condition... only if... Target is Controlled AND Target is in UAE")
                  // But if I make them 'approved_controlled', I am SAYING they are controlled.
                  // If they are NOT in UAE, maybe I can approve controlled without strict perm? 
                  // "A person with this permission (controlled.approve) will be able to view all vendors/customers with controlled_items is true... But for example, a user with vendor.approve can also approve a vendor, but only upto approved_general".
                  // This suggests that `vendor.approve` CANNOT do `approved_controlled`.
                  // Regardless of location? 
                  // "Strict condition... only if... Target is Controlled AND Target is in UAE"
                  // This logic was for *requiring* the permission to even ACT. 
                  
                  // Let's implement: 
                  // 1. To set 'approved_controlled', you MUST have 'customer.controlled.approve' IF logic dictates.
                  // If prompt implies "vendor.approve can only upto approved_general", then `controlled.approve` is ALWAYS needed for `approved_controlled`.
                  requiredPermission = 'customer.controlled.approve';
             } else {
                  // approved_general or rejected
                  // If the USER is ALREADY Controlled + UAE, do I need strict perm to REJECT them?
                  if (isControlledIsSet && isUAE) {
                      requiredPermission = 'customer.controlled.approve'; 
                  }
             }

             const hasPerm = await permissionService.hasPermission(user.id, requiredPermission);
             if (!hasPerm) {
                 return NextResponse.json({ success: false, message: `Forbidden: Missing ${requiredPermission} Permission` }, { status: 403 });
             }
        }
  
        const updateData: any = {
            onboarding_status: status,
            reviewed_at: new Date(),
            reviewed_by: user.id,
        };

        if (status === 'rejected') {
            updateData.rejection_reason = note;
            customer.is_active = false;
            await customer.save();
        } else {
            updateData.review_note = note;
            customer.is_active = true;
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
            attributes: isVendor ? this.VENDOR_VISIBLE_CUSTOMER_FIELDS : { exclude: ['password'] }
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
}
