import { NextRequest } from 'next/server';
import { responseHandler } from '@/utils/responseHandler';
import { verifyAccessToken } from '@/utils/jwt';
import { User, Product, Category, UserProfile, ProductStatus } from '@/models';

export abstract class BaseController {
  // Helpers to ensure consistency across all controllers
  protected sendSuccess<T>(data: T, message?: string, code = 200, misc?: any, req?: NextRequest) {
    return responseHandler.success(data, message, code, misc, req);
  }

  protected sendError(message: string, code = 400, errors: any[] = [], misc?: any, req?: NextRequest) {
    return responseHandler.error(message, code, errors, misc, req);
  }

  /**
   * Centralized Auth Verification
   * Returns user or error response
   */
  protected async verifyAuth(req: NextRequest): Promise<{ user: User | null; error: Response | null }> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: this.sendError('Unauthorized: Missing or invalid header', 210, [], undefined, req) };
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded: any = verifyAccessToken(token);

      const userId = decoded.userId || decoded.sub;

      if (!userId) {
        console.error('VerifyAuth: Decoded token missing userId/sub');
        return { user: null, error: this.sendError('Invalid Token Structure', 210, [], undefined, req) };
      }

      const user = await User.findByPk(userId);

      if (!user) {
        console.error('VerifyAuth: User not found for ID', userId);
        return { user: null, error: this.sendError('User not found', 210, [], undefined, req) };
      }

      return { user, error: null };
    } catch (e: any) {
      console.error('VerifyAuth Token Error:', e.message);
      // Return specific error if possible
      const msg = e.name === 'TokenExpiredError' ? 'Token Expired' : 'Invalid Token';
      return { user: null, error: this.sendError(msg, 210, [], { originalError: e.message }, req) };
    }
  }

  /**
   * Enforce Onboarding Status
   * Returns error response if user has not completed onboarding or is not approved
   */
  protected async checkOnboarding(user: any): Promise<Response | null> {
    // Admins bypass onboarding checks
    if (['admin', 'super_admin'].includes(user.user_type)) {
      return null;
    }

    // Onboarding step must be null (completed)
    if (user.onboarding_step !== null) {
      return this.sendError('Please complete your onboarding process first.', 212, [], {
        code: 'ONBOARDING_INCOMPLETE',
        step: user.onboarding_step
      });
    }

    // Must have a profile with approved status
    // Ensure profile is loaded (controllers should handle this, but we check)
    let profile = user.profile;
    if (!profile) {
      const { UserProfile } = await import('@/models/UserProfile');
      profile = await UserProfile.findOne({ where: { user_id: user.id } });
    }

    if (!profile) {
      return this.sendError('User profile not found. Please complete onboarding.', 212, [], { code: 'PROFILE_MISSING' });
    }

    const approvedStatuses = ['approved_general', 'approved_controlled'];
    if (!approvedStatuses.includes(profile.onboarding_status)) {
      let message = 'Your account is pending verification.';

      if (profile.onboarding_status === 'rejected') {
        message = `Your account was rejected. Reason: ${profile.rejection_reason || 'Policy violation'}`;
      } else if (profile.onboarding_status === 'update_needed') {
        message = `Action required: Please update your profile. Reason: ${profile.rejection_reason || 'Admin request'}`;
      }

      return this.sendError(message, 212, [], {
        code: profile.onboarding_status === 'update_needed' ? 'ONBOARDING_UPDATE_REQUIRED' : 'ONBOARDING_NOT_APPROVED',
        status: profile.onboarding_status,
        reason: profile.rejection_reason
      });
    }

    return null;
  }

  /**
   * Check if a product is eligible for purchase
   * Checks status, approval, and vendor onboarding (including controlled categories)
   */
  protected async checkProductPurchaseEligibility(productId: string): Promise<{ eligible: boolean; error?: string; product?: Product }> {
    const product = await Product.findByPk(productId, {
      include: [
        { model: Category, as: 'category' },
        { model: Category, as: 'main_category' },
        { model: Category, as: 'sub_category' },
        {
          model: User,
          as: 'vendor',
          include: [{ model: UserProfile, as: 'profile' }]
        }
      ]
    });

    if (!product) {
      return { eligible: false, error: 'Product not found' };
    }

    // 1. Product Status & Approval Check
    if (product.status !== ProductStatus.PUBLISHED || product.approval_status !== 'approved') {
      return { eligible: false, error: 'This product is not currently available for purchase (pending review or unpublished).' };
    }

    console.log("=======Product=======");
    console.log(product);

    // 2. Vendor Onboarding Check
    // const vendor = product.vendor;
    // const profile = vendor?.profile;
    // if (!vendor || !profile) {
    //   return { eligible: false, error: 'Vendor profile not found or inactive.' };
    // }

    // const approvedStatuses = ['approved_general', 'approved_controlled'];
    // if (!approvedStatuses.includes(profile.onboarding_status)) {
    //   return { eligible: false, error: 'This product is currently unavailable as the vendor is undergoing verification.' };
    // }

    // 3. Controlled Category Check
    // const isControlled = (
    //   product.category?.is_controlled === true ||
    //   product.main_category?.is_controlled === true ||
    //   product.sub_category?.is_controlled === true
    // );

    // if (isControlled && profile.onboarding_status !== 'approved_controlled') {
    //   return { eligible: false, error: 'Direct purchase of this controlled item is restricted. Please contact us for procurement.' };
    // }

    return { eligible: true, product };
  }
}
