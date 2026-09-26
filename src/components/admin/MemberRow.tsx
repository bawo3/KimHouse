import type { Member } from "@/lib/members/schema";
import { updateMemberPhoneAction, updateMemberRoleAction } from "@/app/admin/members/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { DeleteMemberButton } from "@/components/admin/DeleteMemberButton";
import styles from "./MemberRow.module.css";

// 회원관리 목록의 한 줄(인물 1명)을 보여주는 컴포넌트.
// - 연락처 수정 폼은 admin/owner 모두에게 보인다.
// - role(권한) 수정 폼은 isOwnerViewer가 true일 때만(=현재 로그인한 사람이 owner일 때만) 보인다.
//   화면에서 감추는 것과 별개로, 서버 액션(updateMemberRoleAction) 쪽에서도
//   owner 여부를 다시 검증하므로 이중으로 안전하다.
// - 저장 버튼은 승인 화면(PendingRequestRow)과 동일하게 제출 중에는 비활성화된다.
//   이 화면의 액션은 새 레코드를 추가하는 게 아니라 기존 값을 덮어쓰는 방식이라 중복 레코드
//   생성 위험은 없지만, 더블클릭 시 GitHub 커밋 API에 동시에 두 번 요청이 나가면
//   먼저 도착한 요청이 파일을 갱신한 직후 두 번째 요청의 sha가 낡은 값이 되어
//   충돌 에러(커밋 실패)로 이어질 수 있어, 동일한 비활성화 패턴을 그대로 적용해 예방한다.
// - 삭제 버튼은 role이 "owner"인 행에는 아예 렌더링하지 않는다(서버 액션 deleteMemberAction도
//   owner 삭제를 거부하지만, 실수로 시도조차 할 수 없도록 UI에서 이중으로 막는다).
export function MemberRow({ member, isOwnerViewer }: { member: Member; isOwnerViewer: boolean }) {
  return (
    <div className={styles.row}>
      <span className={styles.name}>{member.name}</span>
      <span className={styles.roleBadge}>{member.role ?? "일반 회원"}</span>
      <form action={updateMemberPhoneAction.bind(null, member.id)}>
        <input name="phone" type="tel" defaultValue={member.phone ?? ""} placeholder="연락처" />
        <SubmitButton label="연락처 저장" pendingLabel="저장 중..." />
      </form>
      {isOwnerViewer && (
        <form action={updateMemberRoleAction.bind(null, member.id)}>
          <select name="role" defaultValue={member.role === "admin" ? "admin" : "none"}>
            <option value="none">일반 회원</option>
            <option value="admin">관리자(admin)</option>
          </select>
          <SubmitButton label="권한 저장" pendingLabel="저장 중..." />
        </form>
      )}
      {member.role !== "owner" && <DeleteMemberButton memberId={member.id} name={member.name} />}
    </div>
  );
}
