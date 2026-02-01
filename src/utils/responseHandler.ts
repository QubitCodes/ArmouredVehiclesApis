import { NextResponse, NextRequest } from 'next/server';
import { verifyAccessToken } from './jwt';

type MetaData = Record<string, unknown>;

interface ApiResponse<T> {
  status: boolean;
  message: string;
  code: number;
  data: T | null;
  misc?: MetaData;
  errors?: unknown[];
}

/**
 * Check Auth Status for Header
 * Returns: 'valid' | 'invalid' | 'missing'
 */
const getAuthStatus = (req: NextRequest): string => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return 'missing';
    }
    
    try {
        const token = authHeader.split(' ')[1];
        verifyAccessToken(token);
        return 'valid';
    } catch (e) {
        return 'invalid';
    }
};

export const responseHandler = {
  success: <T>(
    data: T,
    message: string = 'Success',
    code: number = 100, // Default to OK (100)
    misc?: MetaData,
    req?: NextRequest // Optional Request for Header Injection
  ) => {
    const response: ApiResponse<T> = {
      status: true,
      message,
      code,
      data,
      misc,
    };
    
    // Rule 5: Header must be standard. Code is internal reference.
    // Map internal success codes (1xx) to HTTP 200
    let httpStatus = 200;
    if (code === 101) httpStatus = 201; // Created
    
    const headers: Record<string, string> = {};
    if (req) {
        headers['X-Auth-Status'] = getAuthStatus(req);
    }

    return NextResponse.json(response, { status: httpStatus, headers });
  },

  error: (
    message: string = 'Error',
    code: number = 200, // Default to General Client Error (200)
    errors: unknown[] = [],
    misc?: MetaData,
    req?: NextRequest // Optional Request for Header Injection
  ) => {
    const response: ApiResponse<null> = {
      status: false,
      message,
      code,
      data: null,
      errors,
      misc,
    };

    // Rule 5: Header vs Body
    let httpStatus = 400; // Default Client Error
    
    // Internal 2xx are Client Errors (400)
    // Internal 3xx are Server Errors (500)
    // Internal 4xx/9xx are Business/System Errors (usually 400 or 500)
    if (code >= 300 && code < 400) {
        httpStatus = code === 310 ? 404 : 500;
    } else if (code >= 900) {
        httpStatus = 500;
    } else if (code >= 200 && code < 300) {
        httpStatus = 400;
        if (code === 210 || code === 211) httpStatus = 401; // Auth
        if (code === 212) httpStatus = 403; // Permission
    }

    const headers: Record<string, string> = {};
    if (req) {
        headers['X-Auth-Status'] = getAuthStatus(req);
    }
    
    return NextResponse.json(response, { status: httpStatus, headers });
  },

  handleError: (error: any, req?: NextRequest) => {
      // JWT / Auth Errors
      if (
          error.name === 'TokenExpiredError' || 
          error.name === 'JsonWebTokenError' || 
          error?.message?.includes('jwt expired') ||
          (error.constructor && error.constructor.name === 'TokenExpiredError')
      ) {
           return responseHandler.error('Unauthorized: Token expired', 210, [], undefined, req);
      }

      // Default Server Error
      const msg = error?.message || 'Internal Server Error';
      // If code is present in error object, reuse it?
      const code = error?.code && typeof error.code === 'number' ? error.code : 300;
      
      return responseHandler.error(msg, code, [], { debug: String(error) }, req);
  }
};
