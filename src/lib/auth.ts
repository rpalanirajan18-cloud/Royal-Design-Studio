/**
 * NextAuth.js v5 configuration for Royal Design Studio
 * Credentials-based authentication with bcrypt password hashing
 * Includes high-reliability fallback for the Master Studio Admin
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserRole } from "@prisma/client";

const loginSchema = z.object({
  username: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  password: z.string().min(1),
});

export interface AdminUserConfig {
  username: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

export const ADMIN_USERS: AdminUserConfig[] = [
  {
    username: "palanirajan",
    name: "Palanirajan",
    email: "palanirajan@royaldesignstudio.com",
    role: UserRole.OWNER,
    password: "royal@design2026",
  },
  {
    username: "ramya",
    name: "Ramya",
    email: "ramya@royaldesignstudio.com",
    role: UserRole.OWNER,
    password: "royal@design2026",
  },
  {
    username: "ranjith",
    name: "Ranjith",
    email: "ranjith@royaldesignstudio.com",
    role: UserRole.OWNER,
    password: "royal@design2026",
  },
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const rawUser = (parsed.data.username || parsed.data.email || "").trim().toLowerCase();
        const password = parsed.data.password;

        // 1. Authenticate against designated 3 Admin users
        const adminMatch = ADMIN_USERS.find(
          (a) =>
            a.username.toLowerCase() === rawUser ||
            a.email.toLowerCase() === rawUser
        );

        if (adminMatch) {
          if (password !== adminMatch.password) {
            return null;
          }

          // Ensure admin user exists in DB for foreign key / relation consistency
          try {
            const dbUser = await prisma.user.upsert({
              where: { email: adminMatch.email },
              update: {
                name: adminMatch.name,
                role: adminMatch.role,
                status: "ACTIVE",
                lastLoginAt: new Date(),
              },
              create: {
                id: `admin-${adminMatch.username}`,
                name: adminMatch.name,
                email: adminMatch.email,
                passwordHash: await bcrypt.hash(adminMatch.password, 10),
                role: adminMatch.role,
                status: "ACTIVE",
                lastLoginAt: new Date(),
              },
            });

            return {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              role: dbUser.role,
            };
          } catch (dbErr) {
            console.warn("Database sync during admin login skipped (using session fallback):", dbErr);
          }

          return {
            id: `admin-${adminMatch.username}`,
            name: adminMatch.name,
            email: adminMatch.email,
            role: adminMatch.role,
          };
        }

        // 2. Legacy Master Admin fallback
        if (
          rawUser === "royaldesignstudioofficial@gmail.com" &&
          password === "Admin@RDS2026"
        ) {
          return {
            id: "admin-master-rds",
            name: "Royal Design Studio Admin",
            email: "royaldesignstudioofficial@gmail.com",
            role: UserRole.OWNER,
          };
        }

        // 3. Database users by username / email
        try {
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: rawUser },
                { name: { equals: rawUser, mode: "insensitive" } },
              ],
            },
          });

          if (!user || user.status === "INACTIVE") return null;

          const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
          if (!passwordsMatch) return null;

          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          }).catch(() => {});

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (err) {
          console.error("Authentication DB error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
