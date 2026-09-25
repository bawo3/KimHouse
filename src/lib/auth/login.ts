import type { Member } from "@/lib/members/schema";
import { normalizePhone } from "@/lib/phone";

// 로그인 시 사용자가 입력하는 값 (이름, 연락처 모두 필수)
export interface LoginInput {
  name: string;
  phone: string;
}

// 설계 문서(4장) 로그인 규칙: 이름 + 연락처(정규화 후)가 모두 일치해야 매칭된다.
// - 연락처가 없는 레코드는 절대 매칭되지 않는다.
// - 빈 입력값끼리는 매칭되지 않는다(입력 연락처가 비어 있으면 즉시 null).
// - 연락처는 사람마다 실질적으로 유일하므로, 세대 없이 이름+연락처만으로도
//   항렬자로 이름이 겹치는 경우까지 포함해 정확히 한 명을 특정할 수 있다.
export function findMatchingMember(members: Member[], input: LoginInput): Member | null {
  const inputPhone = normalizePhone(input.phone);
  if (!inputPhone) return null;

  const match = members.find((member) => {
    if (!member.phone) return false;
    if (member.name !== input.name) return false;
    return normalizePhone(member.phone) === inputPhone;
  });

  return match ?? null;
}
