import { describe, expect, it } from "vitest";
import { findMatchingMember } from "@/lib/auth/login";
import type { Member } from "@/lib/members/schema";

const members: Member[] = [
  { id: "m1", name: "김철수", generation: 3, parentId: null, phone: "010-1111-2222" },
  { id: "m2", name: "김영희", generation: 4, parentId: "m1" },
];

describe("findMatchingMember", () => {
  it("matches when generation, name, and normalized phone all agree", () => {
    const match = findMatchingMember(members, {
      generation: 3,
      name: "김철수",
      phone: "01011112222",
    });

    expect(match?.id).toBe("m1");
  });

  it("returns null when the stored member has no phone on file", () => {
    const match = findMatchingMember(members, {
      generation: 4,
      name: "김영희",
      phone: "",
    });

    expect(match).toBeNull();
  });

  it("returns null when the generation does not match", () => {
    const match = findMatchingMember(members, {
      generation: 99,
      name: "김철수",
      phone: "01011112222",
    });

    expect(match).toBeNull();
  });

  it("returns null when the input phone is empty", () => {
    const match = findMatchingMember(members, {
      generation: 3,
      name: "김철수",
      phone: "",
    });

    expect(match).toBeNull();
  });
});
