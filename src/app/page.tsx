import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/getSession";

// 루트 페이지: 로그인 상태에 따라 트리 페이지 또는 로그인 페이지로 즉시 리다이렉트한다.
// - 세션이 있으면 /tree, 없으면 /login으로 이동한다.
export default async function HomePage() {
  const session = await getSession();
  redirect(session ? "/tree" : "/login");
}
