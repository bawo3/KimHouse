import type { PendingRequest } from "@/lib/members/pending";
import { approveRequestAction, rejectRequestAction } from "@/app/admin/approvals/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import styles from "./PendingRequestRow.module.css";

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
