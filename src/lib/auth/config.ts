import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { encode as defaultEncode } from "next-auth/jwt";
import { db } from "@db/index";
import { accounts, sessions, users, verificationTokens } from "@db/schema";
import { env } from "@/lib/validations/env";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

const adapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            password: users.password,
          })
          .from(users)
          .where(eq(users.email, credentials.email.toLowerCase()))
          .then((res) => res[0]);

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
    ...(env.SMTP_HOST && env.EMAIL_FROM
      ? [
          Nodemailer({
            server: {
              host: env.SMTP_HOST,
              port: env.SMTP_PORT,
              auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              },
            },
            from: env.EMAIL_FROM,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "database",
    maxAge: SESSION_MAX_AGE,
  },
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/login?verify=1",
  },
  callbacks: {
    // Flag credentials logins so jwt.encode can create a DB session for them
    async jwt({ token, account }) {
      if (account?.provider === "credentials") {
        token.credentials = true;
      }
      return token;
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  jwt: {
    // Auth.js v5 does not create DB sessions for the Credentials provider.
    // For credentials logins we manually create a database session and
    // return its token so it is stored in the session cookie.
    async encode(params) {
      if (params.token?.credentials) {
        const sessionToken = crypto.randomUUID();
        if (!params.token.sub) {
          throw new Error("No user ID found in token");
        }
        const createdSession = await adapter?.createSession?.({
          sessionToken,
          userId: params.token.sub,
          expires: new Date(Date.now() + SESSION_MAX_AGE * 1000),
        });
        if (!createdSession) {
          throw new Error("Failed to create session");
        }
        return sessionToken;
      }
      return defaultEncode(params);
    },
  },
});
