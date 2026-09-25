import { describe, expect, it } from "vitest";
import { findMatchingMember } from "@/lib/auth/login";
import type { Member } from "@/lib/members/schema";

const members: Member[] = [
  { id: "m1", name: "김철수", generation: 3, parentId: null, phone: "010-1111-2222" },
  { id: "m2", name: "김영희", generation: 4, parentId: "m1" },
  { id: "m3", name: "김재현", generation: 1, parentId: null, phone: "010-7488-9333", role: "owner" },
];

describe("findMatchingMember", () => {
  it("이름과 정규화된 연락처가 모두 일치하면 매칭된다", () => {
    const match = findMatchingMember(members, {
      name: "김철수",
      phone: "01011112222",
    });

    expect(match?.id).toBe("m1");
  });

  it("하이픈 등 표기가 달라도 정규화 후 연락처가 같으면 매칭된다", () => {
    const match = findMatchingMember(members, {
      name: "김철수",
      phone: "010-1111-2222",
    });

    expect(match?.id).toBe("m1");
  });

  it("role(admin/owner)에 상관없이 이름과 연락처만 일치하면 매칭된다", () => {
    const match = findMatchingMember(members, {
      name: "김재현",
      phone: "01074889333",
    });

    expect(match?.id).toBe("m3");
  });

  it("저장된 구성원에게 연락처가 없으면 이름이 일치해도 null을 반환한다", () => {
    const match = findMatchingMember(members, {
      name: "김영희",
      phone: "01099998888",
    });

    expect(match).toBeNull();
  });

  it("입력한 연락처가 비어 있으면 null을 반환한다", () => {
    const match = findMatchingMember(members, {
      name: "김철수",
      phone: "",
    });

    expect(match).toBeNull();
  });

  it("이름이 일치하지 않으면 null을 반환한다", () => {
    const match = findMatchingMember(members, {
      name: "존재하지않는이름",
      phone: "01011112222",
    });

    expect(match).toBeNull();
  });
});
