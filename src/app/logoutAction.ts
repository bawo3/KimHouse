"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

// 로그아웃 서버 액션
// - 세션 쿠키를 삭제하고 로그인 페이지로 돌려보낸다.
// - 쿠키 이름은 SESSION_COOKIE_NAME을 그대로 재사용한다(중복 하드코딩 금지).
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
