export {
  authCredentialsSchema,
  type AuthCredentials,
} from "@pakfactory/auth-ui/auth-credentials-schema";

import { z } from "zod";
import { authCredentialsSchema } from "@pakfactory/auth-ui/auth-credentials-schema";

export const forgotPasswordSchema = z.object({
  email: authCredentialsSchema.shape.email,
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
