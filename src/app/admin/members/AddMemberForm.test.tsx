import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Member } from "@/lib/members/schema";
import { AddMemberForm } from "./AddMemberForm";

// addMemberAction은 서버 액션이라 실제로 GitHub API를 호출한다 - 단위 테스트에서는 mock 처리한다.
const mockAddMemberAction = vi.fn();
vi.mock("./actions", () => ({
  addMemberAction: (...args: unknown[]) => mockAddMemberAction(...args),
}));

const members: Member[] = [
  { id: "1", name: "김재현", generation: 1, parentId: null },
  { id: "2", name: "김둘째", generation: 2, parentId: "1" },
];

describe("AddMemberForm", () => {
  it("부모 선택 드롭다운에 members prop이 옵션으로 렌더링된다", () => {
    mockAddMemberAction.mockResolvedValue({});
    render(<AddMemberForm members={members} />);

    const parentSelect = screen.getByLabelText("부모");
    expect(within(parentSelect).getByText("없음 (독립 등록, 세대 직접 입력)")).toBeInTheDocument();
    expect(within(parentSelect).getByText("김재현 (1대손)")).toBeInTheDocument();
    expect(within(parentSelect).getByText("김둘째 (2대손)")).toBeInTheDocument();
  });

  it("부모를 선택하면 세대 입력칸이 비활성화되고, 다시 선택 해제하면 활성화된다", async () => {
    mockAddMemberAction.mockResolvedValue({});
    const user = userEvent.setup();
    render(<AddMemberForm members={members} />);

    const parentSelect = screen.getByLabelText("부모");
    const generationInput = screen.getByLabelText("세대");
    expect(generationInput).not.toBeDisabled();

    await user.selectOptions(parentSelect, "1");
    expect(generationInput).toBeDisabled();

    await user.selectOptions(parentSelect, "없음 (독립 등록, 세대 직접 입력)");
    expect(generationInput).not.toBeDisabled();
  });

  it("role 관련 입력칸은 없다 (권한 상승 방지)", () => {
    mockAddMemberAction.mockResolvedValue({});
    render(<AddMemberForm members={members} />);

    expect(screen.queryByLabelText(/역할|권한|role/i)).not.toBeInTheDocument();
  });

  it("추가에 성공하면 폼이 초기화되고 안내 메시지가 보인다 (연속 추가 지원)", async () => {
    mockAddMemberAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<AddMemberForm members={members} />);

    const nameInput = screen.getByLabelText("이름");
    await user.type(nameInput, "김셋째");
    await user.type(screen.getByLabelText("세대"), "3");
    await user.click(screen.getByRole("button", { name: "추가" }));

    expect(await screen.findByRole("status")).toHaveTextContent("김셋째님을 등록했습니다");
    expect(nameInput).toHaveValue("");
  });

  it("추가에 실패하면 에러 메시지를 보여주고 폼은 초기화하지 않는다", async () => {
    mockAddMemberAction.mockResolvedValue({ error: "존재하지 않는 부모입니다." });
    const user = userEvent.setup();
    render(<AddMemberForm members={members} />);

    await user.type(screen.getByLabelText("이름"), "김넷째");
    await user.type(screen.getByLabelText("세대"), "3");
    await user.click(screen.getByRole("button", { name: "추가" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("존재하지 않는 부모입니다.");
  });
});
