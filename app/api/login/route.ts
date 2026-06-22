import { type NextRequest, NextResponse } from "next/server";
import { db } from "@db/index";
import { users, sessions } from "@db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function isSafePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

/**
 * Custom credentials login via a top-level form POST.
 *
 * The default next-auth/react signIn() flow fetches a CSRF token over XHR and
 * relies on the cookie set by that fetch. Privacy-aggressive browsers (notably
 * Edge with Tracking Prevention / InPrivate) block that XHR-set cookie, so the
 * follow-up POST fails with `MissingCSRF`. By validating credentials and setting
 * the session cookie ourselves on a top-level navigation response, the cookie is
 * accepted reliably across all browsers.
 */
export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const form = await req.formData();

  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const password = String(form.get("password") ?? "");
  let callbackUrl = String(form.get("callbackUrl") ?? "/dashboard");
  if (!isSafePath(callbackUrl)) callbackUrl = "/dashboard";

  const fail = () =>
    NextResponse.redirect(new URL("/login?error=CredentialsSignin", origin), { status: 303 });

  // Basic login-CSRF mitigation: reject cross-origin form posts.
  const reqOrigin = req.headers.get("origin");
  if (reqOrigin && reqOrigin !== origin) return fail();

  if (!email || !password) return fail();

  const [user] = await db
    .select({ id: users.id, password: users.password })
    .from(users)
    .where(eq(users.email, email));

  if (!user?.password) return fail();

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return fail();

  // Create a database session (matches the Credentials encode workaround).
  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  await db.insert(sessions).values({ sessionToken, userId: user.id, expires });

  // Match Auth.js v5 cookie naming: secure (https) uses the __Secure- prefix.
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const secure = proto === "https";
  const cookieName = secure ? "__Secure-authjs.session-token" : "authjs.session-token";

  const res = NextResponse.redirect(new URL(callbackUrl, origin), { status: 303 });
  res.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    expires,
  });
  return res;
}
