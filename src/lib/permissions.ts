/**
 * Role-Based Access Control (RBAC) for Royal Design Studio
 *
 * Permission check is enforced server-side on every API route.
 * Frontend hiding of buttons is NOT a security measure — always verify here.
 */

import { UserRole } from "@prisma/client";

export type Permission =
  // Customer
  | "customers:read"
  | "customers:write"
  | "customers:delete"
  // Products
  | "products:read"
  | "products:write"
  // Quotations
  | "quotations:read"
  | "quotations:write"
  | "quotations:send"
  // Proforma
  | "proforma:read"
  | "proforma:write"
  // Invoices
  | "invoices:read"
  | "invoices:write"
  | "invoices:issue"
  | "invoices:cancel"
  // Payments
  | "payments:read"
  | "payments:write"
  | "payments:allocate"
  // Orders
  | "orders:read"
  | "orders:write"
  | "orders:status_update"
  | "orders:artwork_upload"
  // Delivery
  | "delivery:read"
  | "delivery:write"
  // Recurring
  | "recurring:read"
  | "recurring:write"
  | "recurring:approve"
  // Expenses
  | "expenses:read"
  | "expenses:write"
  // Reports
  | "reports:financial"
  | "reports:operations"
  // Settings
  | "settings:read"
  | "settings:write"
  // Users
  | "users:read"
  | "users:write"
  // Audit
  | "audit:read";

// Map each role to the permissions it holds
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    "customers:read", "customers:write", "customers:delete",
    "products:read", "products:write",
    "quotations:read", "quotations:write", "quotations:send",
    "proforma:read", "proforma:write",
    "invoices:read", "invoices:write", "invoices:issue", "invoices:cancel",
    "payments:read", "payments:write", "payments:allocate",
    "orders:read", "orders:write", "orders:status_update", "orders:artwork_upload",
    "delivery:read", "delivery:write",
    "recurring:read", "recurring:write", "recurring:approve",
    "expenses:read", "expenses:write",
    "reports:financial", "reports:operations",
    "settings:read", "settings:write",
    "users:read", "users:write",
    "audit:read",
  ],
  BILLING_STAFF: [
    "customers:read", "customers:write",
    "products:read",
    "quotations:read", "quotations:write", "quotations:send",
    "proforma:read", "proforma:write",
    "invoices:read", "invoices:write", "invoices:issue",
    "payments:read", "payments:write", "payments:allocate",
    "orders:read",
    "delivery:read",
    "recurring:read",
    "expenses:read",
    "reports:financial", "reports:operations",
    "settings:read",
  ],
  ORDER_MANAGER: [
    "customers:read",
    "products:read",
    "quotations:read",
    "invoices:read",
    "orders:read", "orders:write", "orders:status_update", "orders:artwork_upload",
    "delivery:read", "delivery:write",
    "expenses:read", "expenses:write",
    "reports:operations",
    "settings:read",
  ],
  DESIGNER: [
    "customers:read",
    "orders:read", "orders:status_update", "orders:artwork_upload",
    "delivery:read",
    "reports:operations",
  ],
  ACCOUNTANT: [
    "customers:read",
    "invoices:read",
    "payments:read",
    "expenses:read",
    "reports:financial", "reports:operations",
    "audit:read",
    "settings:read",
  ],
};

/**
 * Check if a given role has the specified permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has ALL of the specified permissions.
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the specified permissions.
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role (useful for debugging/audit).
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
