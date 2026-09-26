import type { ReactNode } from "react";
import { AppNav } from "@/components/nav/AppNav";

export const metadata = {
  title: "김해 김씨 문중 명부",
  description: "김해 김씨 집안 문중 명부 트리 뷰",
};

// 모든 페이지를 감싸는 루트 레이아웃
// - AppNav를 여기서 한 번만 렌더링하면 모든 페이지에 공통 네비게이션이 적용된다.
// - AppNav는 비로그인 상태면 null을 반환하므로 /login, /register에도 안전하게 포함할 수 있다.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
