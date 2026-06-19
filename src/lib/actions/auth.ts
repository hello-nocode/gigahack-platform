"use server";

import { signIn } from "@/lib/auth/config";
import { z } from "zod";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { db } from "@db/index";
import { users, verificationTokens } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomBytes, createHash } from "crypto";
import { env } from "@/lib/validations/env";
import { sendEmail, passwordResetEmailHtml } from "@/lib/email";

const emailSchema = z.string().email();

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export type SignInEmailState =
  | { success: true; error?: never }
  | { success?: never; error: string };

export async function signInWithEmail(
  _prevState: SignInEmailState,
  formData: FormData,
): Promise<SignInEmailState> {
  const raw = formData.get("email");
  const parsed = emailSchema.safeParse(raw);
  const callbackUrl = (formData.get("callbackUrl") as string | null) || "/dashboard";

  if (!parsed.success) {
    return { error: "Invalid email address" };
  }

  try {
    await signIn("nodemailer", {
      email: parsed.data,
      redirect: false,
      redirectTo: callbackUrl,
    });
    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "An error occurred during sign in. Please try again." };
    }
    throw err;
  }
}

// Password Authentication
const passwordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignInPasswordState =
  | { success: true; error?: never }
  | { success?: never; error: string };

export async function signInWithPassword(
  _prevState: SignInPasswordState,
  formData: FormData,
): Promise<SignInPasswordState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = passwordSchema.safeParse(raw);
  const callbackUrl = (formData.get("callbackUrl") as string | null) || "/dashboard";

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Invalid input" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirect: true,
      redirectTo: callbackUrl,
    });
    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    // For redirects, this is expected behavior
    if (err instanceof Error && err.message.includes("redirect")) {
      return { success: true };
    }
    return { error: "Invalid email or password" };
  }
}

// Set/Change Password
const setPasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
});

export type SetPasswordState =
  | { success: true; error?: never; message?: string }
  | { success?: never; error: string };

export async function setPassword(
  userId: string,
  _prevState: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const raw = {
    currentPassword: formData.get("currentPassword") || undefined,
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = setPasswordSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Invalid input" };
  }

  const { currentPassword, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  // Get user with current password
  const [user] = await db
    .select({ id: users.id, password: users.password })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return { error: "User not found" };
  }

  // If user already has a password, verify current password
  if (user.password) {
    if (!currentPassword) {
      return { error: "Current password is required" };
    }
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return { error: "Current password is incorrect" };
    }
  }

  // Hash and save new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, userId));

  revalidatePath("/profile");

  return {
    success: true,
    message: user.password ? "Password updated successfully" : "Password set successfully",
  };
}

export async function hasPassword(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ password: users.password })
    .from(users)
    .where(eq(users.id, userId));

  return !!user?.password;
}

// Sign Up - create a brand new account with email + password only.
// Profile details are collected afterwards in the /onboarding wizard.
const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
});

export type SignUpState =
  | { success: true; error?: never }
  | { success?: never; error: string };

export async function signUpWithPassword(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = signUpSchema.safeParse(raw);
  // New accounts always go through onboarding first.
  const callbackUrl = (formData.get("callbackUrl") as string | null) || "/onboarding";

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Invalid input" };
  }

  const d = parsed.data;

  if (d.password !== d.confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const email = d.email.toLowerCase();

  // Check if user already exists
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existing) {
    return { error: "An account with this email already exists. Try signing in instead." };
  }

  // Hash password and create user (profile fields filled in onboarding)
  const hashedPassword = await bcrypt.hash(d.password, 12);

  await db.insert(users).values({
    email,
    password: hashedPassword,
    emailVerified: new Date(),
  });

  // Sign the new user in
  try {
    await signIn("credentials", {
      email,
      password: d.password,
      redirect: true,
      redirectTo: callbackUrl,
    });
    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("redirect")) {
      throw err;
    }
    if (err instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Please log in manually." };
    }
    throw err;
  }
}

// ── Password reset ────────────────────────────────────────────────────────────

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESET_IDENTIFIER_PREFIX = "pwreset:";
const GENERIC_RESET_MESSAGE =
  "If an account with a password exists for that email, we've sent a reset link.";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type RequestPasswordResetState =
  | { success: true; message: string; error?: never }
  | { success?: never; error: string };

export async function requestPasswordReset(
  _prevState: RequestPasswordResetState,
  formData: FormData,
): Promise<RequestPasswordResetState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: "Invalid email address" };
  }

  const email = parsed.data.toLowerCase();

  const [user] = await db
    .select({ id: users.id, password: users.password })
    .from(users)
    .where(eq(users.email, email));

  // Only accounts that already have a password are eligible. Always return the
  // same generic message to avoid leaking which emails exist.
  if (user?.password) {
    const identifier = RESET_IDENTIFIER_PREFIX + email;

    // Invalidate any previous reset tokens for this email.
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));

    const rawToken = randomBytes(32).toString("hex");
    await db.insert(verificationTokens).values({
      identifier,
      token: hashToken(rawToken),
      expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const link = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    // In development (or whenever SMTP is unconfigured) log the link so it can
    // be tested without a real email.
    if (env.NODE_ENV !== "production" || !env.SMTP_HOST) {
      console.info(`[password-reset] Reset link for ${email}: ${link}`);
    }

    await sendEmail({
      to: email,
      subject: "Reset your GigaHack password",
      html: passwordResetEmailHtml(link),
      text: `Reset your GigaHack password using this link (expires in 1 hour): ${link}`,
    });
  }

  return { success: true, message: GENERIC_RESET_MESSAGE };
}

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
});

export type ResetPasswordState =
  | { success: true; error?: never }
  | { success?: never; error: string };

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    email: formData.get("email"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Invalid input" };
  }

  const { token, email, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const identifier = RESET_IDENTIFIER_PREFIX + email.toLowerCase();
  const tokenHash = hashToken(token);

  const [record] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, identifier),
        eq(verificationTokens.token, tokenHash),
      ),
    );

  if (!record) {
    return { error: "This reset link is invalid or has already been used." };
  }

  if (record.expires < new Date()) {
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.token, tokenHash),
        ),
      );
    return { error: "This reset link has expired. Please request a new one." };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.email, email.toLowerCase()));

  // Single-use: remove the token after a successful reset.
  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, identifier),
        eq(verificationTokens.token, tokenHash),
      ),
    );

  return { success: true };
}
