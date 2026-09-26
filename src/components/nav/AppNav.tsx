import Link from "next/link";
import { getSession } from "@/lib/auth/getSession";
import { isElevatedRole } from "@/lib/auth/requireElevatedRole";
import { logoutAction } from "@/app/logoutAction";
import styles from "./AppNav.module.css";

// 공통 상단 네비게이션
// - 로그인한 사용자에게만 보인다(비로그인 상태면 null을 반환해 아무것도 그리지 않음).
// - 관리자/소유자(role이 admin 또는 owner)에게는 관리 메뉴(승인 대기, 회원관리)를 추가로 보여준다.
// - 세션 조회/권한 판별은 getSession(), isElevatedRole()을 그대로 재사용한다(중복 구현 금지).
export async function AppNav() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const elevated = isElevatedRole(session);

  return (
    <nav className={styles.nav}>
      <Link className={styles.link} href="/tree">
        명부
      </Link>
      {elevated && (
        <>
          <Link className={styles.link} href="/admin/approvals">
            승인 대기
          </Link>
          <Link className={styles.link} href="/admin/members">
            회원관리
          </Link>
        </>
      )}
      <form action={logoutAction}>
        <button className={styles.logoutButton} type="submit">
          로그아웃
        </button>
      </form>
    </nav>
  );
}
