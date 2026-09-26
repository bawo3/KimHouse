import { loadMembersFromDisk } from "@/lib/members/load";
import { getSession } from "@/lib/auth/getSession";
import { MemberRow } from "@/components/admin/MemberRow";

// 회원관리 화면.
// - /admin 레이아웃 가드(src/app/admin/layout.tsx)가 이미 로그인/권한(admin/owner) 체크를 마쳤으므로
//   여기서는 별도의 로그인 체크 없이, 오직 "현재 사용자가 owner인지"만 한 번 더 확인한다.
// - isOwnerViewer는 role 수정 UI(select)를 보여줄지 말지 결정하는 데만 쓰인다.
//   실제 권한 강제는 서버 액션(updateMemberRoleAction)의 assertOwner()가 담당한다.
export default async function MembersPage() {
  const session = await getSession();
  const members = loadMembersFromDisk();
  const isOwnerViewer = session?.role === "owner";

  return (
    <main>
      <h1>회원관리</h1>
      {members.map((member) => (
        <MemberRow key={member.id} member={member} isOwnerViewer={isOwnerViewer} />
      ))}
    </main>
  );
}
