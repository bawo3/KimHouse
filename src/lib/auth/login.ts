import type { Member } from "@/lib/members/schema";
import { normalizePhone } from "@/lib/phone";

// 로그인 시 사용자가 입력하는 값 (세대, 이름, 연락처)
export interface LoginInput {
  generation: number;
  name: string;
  phone: string;
}

// 설계 문서(4장) 로그인 규칙: 세대 + 이름 + 연락처(정규화 후)가 모두 일치해야 매칭된다.
// - 연락처가 없는 레코드는 절대 매칭되지 않는다.
// - 빈 입력값끼리는 매칭되지 않는다(입력 연락처가 비어 있으면 즉시 null).
export function findMatchingMember(members: Member[], input: LoginInput): Member | null {
  const inputPhone = normalizePhone(input.phone);
  if (!inputPhone) return null;

  const match = members.find((member) => {
    if (!member.phone) return false;
    if (member.generation !== input.generation) return false;
    if (member.name !== input.name) return false;
    return normalizePhone(member.phone) === inputPhone;
  });

  return match ?? null;
}
