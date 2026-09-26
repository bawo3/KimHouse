import { loadPendingRequestsFromDisk } from "@/lib/members/loadPending";
import { PendingRequestRow } from "@/components/admin/PendingRequestRow";

// 가입 승인 대기 목록 화면.
// - /admin 레이아웃 가드(src/app/admin/layout.tsx)가 이미 로그인/권한 체크를 마쳤으므로
//   이 페이지에서는 별도 인증 체크 없이 바로 데이터를 보여준다.
export default function ApprovalsPage() {
  const requests = loadPendingRequestsFromDisk();

  return (
    <main>
      <h1>가입 승인 대기 목록</h1>
      {requests.length === 0 ? (
        <p>대기 중인 요청이 없습니다.</p>
      ) : (
        requests.map((request) => <PendingRequestRow key={request.id} request={request} />)
      )}
    </main>
  );
}
