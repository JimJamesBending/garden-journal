/**
 * Authentication Configuration Stub
 *
 * Current: Simple password auth (GARDEN_PASSWORD env var).
 * Future: NextAuth.js with Google/email providers.
 *
 * DO NOT build registration/login pages yet.
 * This file defines the auth architecture for when
 * the app moves to multi-user SaaS.
 */

// Future auth provider configuration
export const AUTH_PROVIDERS = {
  google: {
    enabled: false,
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },
  email: {
    enabled: false,
    // Magic link / passwordless via email
    from: "noreply@growwise.co.uk",
  },
} as const;

// Session configuration
export const SESSION_CONFIG = {
  strategy: "jwt" as const,
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60,   // 24 hours
};

// Current simple auth
export function validatePassword(password: string): boolean {
  return password === process.env.GARDEN_PASSWORD;
}

// Future: role-based access
export type UserRole = "owner" | "viewer" | "admin";

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: ["read", "write", "delete", "admin", "export"],
  viewer: ["read"],
  admin: ["read", "write", "delete", "admin", "export", "manage-users"],
};
