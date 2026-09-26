"use client";

import { useFormStatus } from "react-dom";

// 폼 제출 버튼: 자신을 감싸는 <form>이 제출 중(pending)이면 자동으로 비활성화된다.
// - useFormStatus는 반드시 <form>의 자식 컴포넌트 안에서 호출해야 폼 상태를 읽을 수 있다.
// - 어르신이 반응이 없어 보여 버튼을 두 번 눌러도, 첫 제출이 끝나기 전까지는
//   두 번째 클릭이 막혀서 중복 제출(중복 승인/거절, 중복 커밋 등)을 방지한다.
// - 승인 화면(PendingRequestRow)과 회원관리 화면(MemberRow)이 동일한 로직을 그대로
//   재사용하도록 공용 컴포넌트로 분리했다(중복 구현 금지 원칙).
export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
