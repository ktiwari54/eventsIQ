import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

// NextAuth (Auth.js) configuration providing Google SSO, Microsoft (Azure AD)
// SSO and email/password credentials. JWT sessions carry role + orgId for RBAC.
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
      tenantId: process.env.AZURE_AD_TENANT_ID ?? "common",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user?.password) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok || user.status !== "ACTIVE") return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // On first sign-in (user object is present), resolve the DB record.
      // For SSO providers, the user may not exist yet — flag needsOnboarding
      // so the app can redirect them to the org-creation step.
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
        });
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
          token.orgId = dbUser.orgId;
          token.needsOnboarding = false;
        } else if (account?.provider && account.provider !== "credentials") {
          // First-time SSO user — store identity, flag for onboarding
          token.needsOnboarding = true;
          // Preserve name/email/image from the OAuth profile for the setup page
          token.name = user.name ?? token.name;
          token.email = user.email;
          token.picture = (user as { image?: string }).image ?? token.picture;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.role = token.role as Role;
        session.user.orgId = (token.orgId as string) ?? "";
        session.user.needsOnboarding = token.needsOnboarding ?? false;
      }
      return session;
    },
  },
};
