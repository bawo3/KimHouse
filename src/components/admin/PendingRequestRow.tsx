"use client";

import { useFormStatus } from "react-dom";
import type { PendingRequest } from "@/lib/members/pending";
import { approveRequestAction, rejectRequestAction } from "@/app/admin/approvals/actions";
import styles from "./PendingRequestRow.module.css";

// 폼 제출 버튼: 자신을 감싸는 <form>이 제출 중(pending)이면 자동으로 비활성화된다.
// - useFormStatus는 반드시 <form>의 자식 컴포넌트 안에서 호출해야 폼 상태를 읽을 수 있다.
// - 이렇게 분리해두면, 어르신이 반응이 없어 보여 버튼을 두 번 눌러도
//   첫 제출이 끝나기 전까지는 두 번째 클릭이 막혀서 중복 승인/거절을 방지한다.
function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

// 가입 대기 목록의 한 줄(신청자 1명)을 보여주는 순수 표시용 컴포넌트.
// 승인/거절 버튼은 각각 서버 액션(approveRequestAction/rejectRequestAction)에 바로 연결된다.
export function PendingRequestRow({ request }: { request: PendingRequest }) {
  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <p className={styles.name}>{request.member.name}</p>
        <p className={styles.detail}>
          {request.member.generation}대손 · {request.member.phone ?? "연락처 없음"}
        </p>
      </div>
      <div className={styles.actions}>
        <form action={approveRequestAction.bind(null, request.id)}>
          <SubmitButton label="승인" pendingLabel="처리 중..." />
        </form>
        <form action={rejectRequestAction.bind(null, request.id)}>
          <SubmitButton label="거절" pendingLabel="처리 중..." />
        </form>
      </div>
    </div>
  );
}
