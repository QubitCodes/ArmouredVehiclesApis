import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),

});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  user_type: z.enum(['customer', 'vendor']).default('customer'),
  register_as: z.string().optional(), // For vendor flow
});
