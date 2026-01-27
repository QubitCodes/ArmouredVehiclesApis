import { NextResponse } from 'next/server';

type MetaData = Record<string, unknown>;

interface ApiResponse<T> {
  status: boolean;
  message: string;
  code: number;
  data: T | null;
  misc?: MetaData;
  errors?: unknown[];
}

export const responseHandler = {
  success: <T>(
    data: T,
    message: string = 'Success',
    code: number = 200,
    misc?: MetaData
  ) => {
    const response: ApiResponse<T> = {
      status: true,
      message,
      code, // Internal Application Code
      data,
      misc,
    };
    // Return NextResponse with standard HTTP status (usually matches internal code if standard)
    // Map internal codes to HTTP status if needed, but for now assuming 1-to-1 for basics
    const httpStatus = code >= 100 && code < 600 ? code : 200;
    return NextResponse.json(response, { status: httpStatus });
  },

  error: (
    message: string = 'Error',
    code: number = 400,
    errors: unknown[] = [],
    misc?: MetaData
  ) => {
    const response: ApiResponse<null> = {
      status: false,
      message,
      code,
      data: null,
      errors,
      misc,
    };
    const httpStatus = code >= 100 && code < 600 ? code : 500;
    return NextResponse.json(response, { status: httpStatus });
  },
};
