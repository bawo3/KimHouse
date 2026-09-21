import { describe, expect, it } from "vitest";
import { parseMembers } from "@/lib/members/schema";

describe("parseMembers", () => {
  it("parses a valid members array", () => {
    const raw = JSON.stringify([
      { id: "a1", name: "김철수", generation: 1, parentId: null },
    ]);

    const members = parseMembers(raw);

    expect(members).toHaveLength(1);
    expect(members[0].name).toBe("김철수");
  });

  it("accepts optional fields including nested spouse info", () => {
    const raw = JSON.stringify([
      {
        id: "a1",
        name: "김철수",
        generation: 1,
        parentId: null,
        birthDate: "1950-01-01",
        spouse: { name: "이영희", clanName: "전주이씨" },
      },
    ]);

    const members = parseMembers(raw);

    expect(members[0].spouse?.name).toBe("이영희");
  });

  it("rejects a record missing a required field", () => {
    const raw = JSON.stringify([{ id: "a1", generation: 1, parentId: null }]);

    expect(() => parseMembers(raw)).toThrow();
  });
});
