import { describe, expect, it } from "vitest";
import { findMatchingMember } from "@/lib/auth/login";
import type { Member } from "@/lib/members/schema";

const members: Member[] = [
  { id: "m1", name: "김철수", generation: 3, parentId: null, phone: "010-1111-2222" },
  { id: "m2", name: "김영희", generation: 4, parentId: "m1" },
  { id: "m3", name: "김재현", generation: 1, parentId: null, phone: "010-7488-9333", role: "owner" },
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

  it("admin/owner는 세대를 입력하지 않아도 이름+연락처만 일치하면 매칭된다", () => {
    const match = findMatchingMember(members, {
      name: "김재현",
      phone: "01074889333",
    });

    expect(match?.id).toBe("m3");
  });

  it("세대를 생략했을 때 일반 회원(admin/owner가 아님)은 매칭되지 않는다", () => {
    const match = findMatchingMember(members, {
      name: "김철수",
      phone: "01011112222",
    });

    expect(match).toBeNull();
  });

  it("세대를 입력하면 admin/owner도 기존처럼 세대까지 일치해야 매칭된다", () => {
    const wrongGeneration = findMatchingMember(members, {
      generation: 99,
      name: "김재현",
      phone: "01074889333",
    });

    expect(wrongGeneration).toBeNull();

    const correctGeneration = findMatchingMember(members, {
      generation: 1,
      name: "김재현",
      phone: "01074889333",
    });

    expect(correctGeneration?.id).toBe("m3");
  });
});
