import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Vitest 테스트 환경 설정
// - jsdom: 브라우저 DOM을 모방하여 React 컴포넌트 테스트가 가능하도록 함
// - setupFiles: 모든 테스트 실행 전에 불러오는 공통 설정 파일
// - alias: tsconfig.json의 "@/*" 경로 별칭을 Vitest에서도 동일하게 사용하기 위함
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
