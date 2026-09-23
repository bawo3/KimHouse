// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

beforeEach(() => {
  process.env.SESSION_JWT_SECRET = "test-secret-at-least-32-characters-long";
});

describe("session tokens", () => {
  it("round-trips a payload through create and verify", async () => {
    const token = await createSessionToken({ memberId: "m1", role: "admin" });
    const payload = await verifySessionToken(token);

    expect(payload).toEqual({ memberId: "m1", role: "admin" });
  });

  it("returns null for a tampered or invalid token", async () => {
    const payload = await verifySessionToken("not-a-real-token");

    expect(payload).toBeNull();
  });
});
