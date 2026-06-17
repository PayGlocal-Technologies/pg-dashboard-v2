import { z } from "zod";

export const OTP_LENGTH = 4;

/** Individual password rules — also rendered live by <PasswordRules>. */
export const PASSWORD_RULES = [
  { label: "12 to 64 characters", test: (v: string) => /^.{12,64}$/.test(v) },
  { label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
  {
    label: "One special character (!@#$%^&*-?)",
    test: (v: string) => /[#?!@$%^&*-]/.test(v),
  },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{10,15}$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,}$/;

/** Username OR email OR phone number — mirrors identifierValidator. */
export const identifierSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Please enter your email, phone number, or username")
    .refine(
      (v) => EMAIL_RE.test(v) || PHONE_RE.test(v) || USERNAME_RE.test(v),
      "Enter a valid email address, phone number, or username"
    ),
});
export type IdentifierValues = z.infer<typeof identifierSchema>;

export const passwordSchema = z.object({
  password: z.string().min(1, "Please enter your password"),
});
export type PasswordValues = z.infer<typeof passwordSchema>;

export const otpSchema = z.object({
  otp: z.string().length(OTP_LENGTH, "Enter the complete OTP"),
});
export type OtpValues = z.infer<typeof otpSchema>;

/** Strong password used for create/change/reset flows. */
const strongPassword = z
  .string()
  .refine((v) => PASSWORD_RULES.every((r) => r.test(v)), "Password does not meet the requirements");

/** Change password (logged-in, password expired): current + new + confirm. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Please enter your current password"),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "The passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/** Reset password (forgot-password flow): new + confirm. */
export const resetPasswordSchema = z
  .object({
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "The passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
