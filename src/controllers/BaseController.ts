import { NextRequest } from 'next/server';
import { responseHandler } from '@/utils/responseHandler';
import { verifyAccessToken } from '@/utils/jwt';
import { User } from '@/models';

export abstract class BaseController {
  // Helpers to ensure consistency across all controllers
  protected sendSuccess<T>(data: T, message?: string, code = 200, misc?: any) {
    return responseHandler.success(data, message, code, misc);
  }

  protected sendError(message: string, code = 400, errors: any[] = [], misc?: any) {
    return responseHandler.error(message, code, errors, misc);
  }

  /**
   * Centralized Auth Verification
   * Returns user or error response
   */
  protected async verifyAuth(req: NextRequest): Promise<{ user: User | null; error: Response | null }> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: this.sendError('Unauthorized: Missing or invalid header', 401) };
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded: any = verifyAccessToken(token);
      
      const userId = decoded.userId || decoded.sub;
      
      if (!userId) {
         console.error('VerifyAuth: Decoded token missing userId/sub');
         return { user: null, error: this.sendError('Invalid Token Structure', 401) };
      }

      const user = await User.findByPk(userId);

      if (!user) {
        console.error('VerifyAuth: User not found for ID', userId);
        return { user: null, error: this.sendError('User not found', 401) };
      }

      return { user, error: null };
    } catch (e: any) {
      console.error('VerifyAuth Token Error:', e.message);
      // Return specific error if possible
      const msg = e.name === 'TokenExpiredError' ? 'Token Expired' : 'Invalid Token';
      return { user: null, error: this.sendError(msg, 401, [], { originalError: e.message }) };
    }
  }
}
