import { describe, expect, it } from "vitest";
import { loadMembersFromDisk } from "@/lib/members/load";

describe("loadMembersFromDisk", () => {
  it("실제 data/members.json 시드 파일을 불러와 검증한다", () => {
    const members = loadMembersFromDisk();

    expect(members.length).toBeGreaterThan(0);
    expect(members.some((member) => member.role === "admin" || member.role === "owner")).toBe(true);
  });
});
