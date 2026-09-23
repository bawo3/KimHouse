import { describe, expect, it } from "vitest";
import { findMatchingMember } from "@/lib/auth/login";
import type { Member } from "@/lib/members/schema";

const members: Member[] = [
  { id: "m1", name: "김철수", generation: 3, parentId: null, phone: "010-1111-2222" },
  { id: "m2", name: "김영희", generation: 4, parentId: "m1" },
];

describe("findMatchingMember", () => {
  it("세대, 이름, 정규화된 연락처가 모두 일치하면 매칭된다", () => {
    const match = findMatchingMember(members, {
      generation: 3,
      name: "김철수",
      phone: "01011112222",
    });

    expect(match?.id).toBe("m1");
  });

  it("저장된 구성원에게 연락처가 없으면 null을 반환한다", () => {
    const match = findMatchingMember(members, {
      generation: 4,
      name: "김영희",
      phone: "",
    });

    expect(match).toBeNull();
  });

  it("세대가 일치하지 않으면 null을 반환한다", () => {
    const match = findMatchingMember(members, {
      generation: 99,
      name: "김철수",
      phone: "01011112222",
    });

    expect(match).toBeNull();
  });

  it("입력한 연락처가 비어 있으면 null을 반환한다", () => {
    const match = findMatchingMember(members, {
      generation: 3,
      name: "김철수",
      phone: "",
    });

    expect(match).toBeNull();
  });

  it("입력한 연락처가 유효해도 저장된 구성원에게 연락처가 없으면 null을 반환한다", () => {
    const match = findMatchingMember(members, {
      generation: 4,
      name: "김영희",
      phone: "01099998888",
    });

    expect(match).toBeNull();
  });
});
