"use server";

import { signIn } from "@/lib/auth/config";
import { z } from "zod";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { db } from "@db/index";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
