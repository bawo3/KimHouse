import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadPendingRequestsFromDisk } from "@/lib/members/loadPending";

const PENDING_DIR = join(process.cwd(), "data", "pending");

beforeEach(() => {
  mkdirSync(PENDING_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(PENDING_DIR, { recursive: true, force: true });
});

describe("loadPendingRequestsFromDisk", () => {
  it("pending 폴더가 비어 있으면 빈 배열을 반환한다", () => {
    expect(loadPendingRequestsFromDisk()).toEqual([]);
  });

  it("pending 폴더의 모든 요청 파일을 읽어 반환한다", () => {
    writeFileSync(
      join(PENDING_DIR, "req-1.json"),
      JSON.stringify({
        id: "req-1",
        submittedAt: "2026-09-25T00:00:00.000Z",
        member: { name: "김삼순", generation: 5, parentId: null },
      }),
      "utf-8"
    );

    const requests = loadPendingRequestsFromDisk();

    expect(requests).toHaveLength(1);
    expect(requests[0].member.name).toBe("김삼순");
  });
});
