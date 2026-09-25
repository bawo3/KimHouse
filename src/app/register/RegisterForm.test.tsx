import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RegisterForm } from "./RegisterForm";

vi.mock("./actions", () => ({
  registerAction: vi.fn(),
}));

describe("RegisterForm", () => {
  it("이름, 세대, 연락처 입력칸과 제출 버튼을 렌더링한다", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText("이름")).toBeInTheDocument();
    expect(screen.getByLabelText("세대")).toBeInTheDocument();
    expect(screen.getByLabelText("연락처")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "가입 신청" })).toBeInTheDocument();
  });

  it("role 입력칸은 없다 (권한 상승 방지)", () => {
    render(<RegisterForm />);

    expect(screen.queryByLabelText(/역할|권한|role/i)).not.toBeInTheDocument();
  });
});
