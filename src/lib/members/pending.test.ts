import { describe, expect, it } from "vitest";
import { parsePendingRequest, pendingRequestSchema } from "@/lib/members/pending";

describe("parsePendingRequest", () => {
  it("필수 항목(이름, 세대)만 있어도 파싱된다", () => {
    const raw = JSON.stringify({
      id: "req-1",
      submittedAt: "2026-09-25T00:00:00.000Z",
      member: { name: "김삼순", generation: 5, parentId: null },
    });

    const request = parsePendingRequest(raw);

    expect(request.member.name).toBe("김삼순");
    expect(request.member.generation).toBe(5);
  });

  it("member에 role 필드가 섞여 있으면 파싱 단계에서 제거한다", () => {
    const raw = JSON.stringify({
      id: "req-2",
      submittedAt: "2026-09-25T00:00:00.000Z",
      member: { name: "위험한사용자", generation: 1, parentId: null, role: "owner" },
    });

    const request = parsePendingRequest(raw);

    expect(Object.keys(request.member)).not.toContain("role");
  });

  it("이름이 없으면 거부한다", () => {
    const raw = JSON.stringify({
      id: "req-3",
      submittedAt: "2026-09-25T00:00:00.000Z",
      member: { generation: 1, parentId: null },
    });

    expect(() => parsePendingRequest(raw)).toThrow();
  });
});
