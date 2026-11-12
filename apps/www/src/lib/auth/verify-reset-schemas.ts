import {z} from 'zod';
import {authCredentialsSchema} from '@pakfactory/auth-ui/auth-credentials-schema';

export const verifyEmailSchema = z.object({
    email: authCredentialsSchema.shape.email,
    token: z.string().trim().min(1, 'Enter the code from your email'),
});

export type VerifyEmailValues = z.infer<typeof verifyEmailSchema>;

export const resendCodeSchema = z.object({
    email: authCredentialsSchema.shape.email,
});

export type ResendCodeValues = z.infer<typeof resendCodeSchema>;

export const resetPasswordSchema = z.object({
    email: z.string(),
    token: z.string().trim().min(1, 'Enter the code from your email'),
    password: authCredentialsSchema.shape.password,
});

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
