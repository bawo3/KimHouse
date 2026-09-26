"use client";

import { deleteMemberAction } from "@/app/admin/members/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";

// 회원 삭제 버튼: 되돌릴 수 없는 작업이므로, 실제 제출 전에 window.confirm으로
// 한 번 더 확인받는다 - 취소를 누르면 e.preventDefault()로 폼 제출 자체를 막는다.
// 제출 중 중복 클릭 방지는 다른 폼들과 동일하게 공용 SubmitButton(useFormStatus)을
// 그대로 재사용한다(중복 구현 금지 원칙).
// owner 행에서는 이 컴포넌트 자체를 렌더링하지 않는 것은 호출하는 쪽(MemberRow)의 책임이다
// - 서버 액션(deleteMemberAction)도 owner 삭제를 거부하지만, 이중 방어 차원에서
//   UI에서도 애초에 시도할 수 없게 한다.
export function DeleteMemberButton({ memberId, name }: { memberId: string; name: string }) {
  return (
    <form
      action={deleteMemberAction.bind(null, memberId)}
      onSubmit={(event) => {
        if (!window.confirm(`정말 ${name}님을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton label="삭제" pendingLabel="삭제 중..." />
    </form>
  );
}
