import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/getSession";
import { isElevatedRole } from "@/lib/auth/requireElevatedRole";

// /admin 경로 아래 모든 페이지를 보호하는 레이아웃(권한 가드).
// - 로그인 세션을 확인하고, role이 admin/owner가 아니면 로그인 페이지로 돌려보낸다.
// - 실제 검증 로직은 getSession()/isElevatedRole()을 그대로 재사용한다(중복 구현 금지).
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!isElevatedRole(session)) {
    redirect("/login");
  }

  return <>{children}</>;
}
