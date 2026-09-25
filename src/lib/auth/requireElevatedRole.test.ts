import { describe, expect, it } from "vitest";
import { isElevatedRole } from "@/lib/auth/requireElevatedRole";
import type { SessionPayload } from "@/lib/auth/session";

describe("isElevatedRole", () => {
  it("role이 admin이면 true", () => {
    expect(isElevatedRole({ memberId: "m1", role: "admin" })).toBe(true);
  });

  it("role이 owner이면 true", () => {
    expect(isElevatedRole({ memberId: "m1", role: "owner" })).toBe(true);
  });

  it("role이 없으면 false", () => {
    expect(isElevatedRole({ memberId: "m1" })).toBe(false);
  });

  it("세션 자체가 없으면(null) false", () => {
    expect(isElevatedRole(null)).toBe(false);
  });
});
