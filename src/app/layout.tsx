import type { ReactNode } from "react";

export const metadata = {
  title: "김해 김씨 문중 명부",
  description: "김해 김씨 집안 문중 명부 트리 뷰",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
