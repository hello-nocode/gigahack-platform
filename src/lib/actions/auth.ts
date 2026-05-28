"use server";

import { signIn } from "@/lib/auth/config";
import { z } from "zod";
import { AuthError } from "next-auth";

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
