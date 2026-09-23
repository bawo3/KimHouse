// jose의 HS256 키 검증은 jsdom의 Uint8Array와 Node의 네이티브 Uint8Array를 다른 것으로 취급해 실패한다.
// 그래서 이 테스트 파일만 Node 환경으로 강제 지정한다. (지우지 말 것)
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

  it("round-trips a payload without a role", async () => {
    const token = await createSessionToken({ memberId: "m2" });
    const payload = await verifySessionToken(token);

    expect(payload).toEqual({ memberId: "m2" });
  });
});
