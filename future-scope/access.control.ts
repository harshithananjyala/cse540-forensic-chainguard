/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * RBAC:
 * - Update X.509 certs with attribute `role`
 * - Verify allowed roles in state-changing transactions
 */

import { Context } from "fabric-contract-api";

export type Role = "investigator" | "custodian" | "admin";

// Attribute name to look up from X.509 cert attrs
const ROLE_ATTR = "role";

export function getClientId(ctx: Context): string {
  const msp = ctx.clientIdentity.getMSPID();
  const id = ctx.clientIdentity.getID(); // x509::/OU=.../CN=...
  return `${msp}:${id}`;
}

export function getRole(ctx: Context): Role | undefined {
  const raw = ctx.clientIdentity.getAttributeValue(ROLE_ATTR);
  if (!raw) return undefined;
  const norm = String(raw).toLowerCase();
  if (norm === "investigator" || norm === "custodian" || norm === "admin") {
    return norm as Role;
  }
  return undefined;
}

export function requireOneOf(ctx: Context, roles: Role[], action: string): void {
  const role = getRole(ctx);
  if (!role || !roles.includes(role)) {
    throw new Error(
      `ACCESS_DENIED: '${action}' requires any of [${roles.join(
        ", "
      )}] but caller has role '${role ?? "none"}'.`
    );
  }
}

