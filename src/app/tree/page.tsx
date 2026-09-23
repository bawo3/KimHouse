import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/getSession";
import { loadMembersFromDisk } from "@/lib/members/load";
import { buildForest, groupByGeneration } from "@/lib/members/forest";
import { TreeCanvas } from "@/components/tree/TreeCanvas";

// 트리 페이지: 로그인한 사용자에게만 문중 명부(가계도)를 보여준다.
// - 세션이 없으면 로그인 페이지로 리다이렉트한다.
// - 명부 로딩(loadMembersFromDisk), 트리 구성(buildForest), 세대 그룹화(groupByGeneration)는
//   기존에 구현/검증된 함수를 그대로 재사용한다(중복 구현 금지).
export default async function TreePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const members = loadMembersFromDisk();
  const forest = buildForest(members);
  const rowsMap = groupByGeneration(forest);
  const rows = Array.from(rowsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([generation, rowMembers]) => ({ generation, members: rowMembers }));

  return (
    <main>
      <h1>김해 김씨 문중 명부</h1>
      <TreeCanvas rows={rows} members={members} />
    </main>
  );
}
