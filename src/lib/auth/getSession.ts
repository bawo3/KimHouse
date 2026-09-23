import { cookies } from "next/headers";
import { verifySessionToken, type SessionPayload } from "@/lib/auth/session";

// 현재 요청의 "session" 쿠키를 읽어 로그인 상태를 확인한다.
// - 쿠키가 없거나 서명 검증에 실패하면 null을 반환한다(비로그인 상태로 취급).
// - 실제 검증 로직은 verifySessionToken을 그대로 재사용한다(중복 구현 금지).
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
