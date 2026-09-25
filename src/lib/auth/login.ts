import type { Member } from "@/lib/members/schema";
import { normalizePhone } from "@/lib/phone";

// 로그인 시 사용자가 입력하는 값 (이름, 연락처는 필수 / 세대는 admin·owner에 한해 생략 가능)
export interface LoginInput {
  generation?: number;
  name: string;
  phone: string;
}

// admin/owner인지 확인한다 (role이 없으면 일반 회원).
function isElevatedRole(member: Member): boolean {
  return member.role === "admin" || member.role === "owner";
}

// 설계 문서(4장) 로그인 규칙: 세대 + 이름 + 연락처(정규화 후)가 모두 일치해야 매칭된다.
// - 연락처가 없는 레코드는 절대 매칭되지 않는다.
// - 빈 입력값끼리는 매칭되지 않는다(입력 연락처가 비어 있으면 즉시 null).
// - 세대를 입력하지 않은 경우: admin/owner만 매칭 대상이다. 일반 회원은 항렬자 동명이인을
//   구분하기 위해 세대가 반드시 필요하다.
export function findMatchingMember(members: Member[], input: LoginInput): Member | null {
  const inputPhone = normalizePhone(input.phone);
  if (!inputPhone) return null;

  const match = members.find((member) => {
    if (!member.phone) return false;
    if (member.name !== input.name) return false;
    if (normalizePhone(member.phone) !== inputPhone) return false;

    if (input.generation !== undefined) {
      return member.generation === input.generation;
    }

    return isElevatedRole(member);
  });

  return match ?? null;
}
