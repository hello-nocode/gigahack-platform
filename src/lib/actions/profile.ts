"use server";

import { db } from "@db/index";
import { users } from "@db/schema";
import { auth } from "@/lib/auth/config";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const profileSchema = z.object({
  firstName: z.string().max(60).optional().or(z.literal("")),
  lastName: z.string().max(60).optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional().or(z.literal("")),
  phone: z
    .string()
    .max(30)
    .regex(/^[+\d\s\-()]*$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  linkedin: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  avatarUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

export type ProfileState =
  | { success: true; error?: never }
  | { success?: never; error: string };

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const raw = Object.fromEntries(formData);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const d = parsed.data;

  await db
    .update(users)
    .set({
      firstName: d.firstName || null,
      lastName: d.lastName || null,
      gender: (d.gender as "male" | "female" | "other" | "prefer_not_to_say" | null) || null,
      phone: d.phone || null,
      linkedin: d.linkedin || null,
      avatarUrl: d.avatarUrl || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  revalidatePath("/profile");
  return { success: true };
}

export async function getProfile(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      globalRole: users.globalRole,
      firstName: users.firstName,
      lastName: users.lastName,
      gender: users.gender,
      phone: users.phone,
      linkedin: users.linkedin,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  return user ?? null;
}
