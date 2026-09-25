import type { SessionPayload } from "@/lib/auth/session";

// 관리자 전용 화면/기능 접근을 막는 권한 가드 헬퍼.
// - session이 없거나(비로그인) role이 admin/owner가 아니면 false를 반환한다.
// - admin 라우트 보호(레이아웃 가드 등)에서 이 함수 하나만 재사용하면 된다.
export function isElevatedRole(session: SessionPayload | null): boolean {
  if (!session) return false;
  return session.role === "admin" || session.role === "owner";
}
