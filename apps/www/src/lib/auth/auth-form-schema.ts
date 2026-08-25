import {z} from 'zod';

export const authCredentialsSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'Email is required')
        .email('Enter a valid email'),
    password: z
        .string()
        .min(1, 'Password is required')
        .min(8, 'Password must be at least 8 characters'),
});

export type AuthCredentials = z.infer<typeof authCredentialsSchema>;

export const forgotPasswordSchema = z.object({
    email: authCredentialsSchema.shape.email,
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
