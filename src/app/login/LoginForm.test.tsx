import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

// 서버 액션은 실제로 실행하지 않고 목(mock)으로 대체한다.
// - 이 테스트는 폼 렌더링만 확인하면 되므로 서버 액션 내부 로직은 관심 대상이 아니다.
vi.mock("./actions", () => ({
  loginAction: vi.fn(),
}));

describe("LoginForm", () => {
  it("세대, 이름, 연락처 입력란과 제출 버튼을 렌더링한다", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/^세대/)).toBeInTheDocument();
    expect(screen.getByLabelText("이름")).toBeInTheDocument();
    expect(screen.getByLabelText("연락처")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "들어가기" })).toBeInTheDocument();
  });
});
