import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteMemberButton } from "./DeleteMemberButton";

// deleteMemberAction은 서버 액션(실제로는 GitHub API를 호출)이라 단위 테스트에서는 mock 처리한다.
const mockDeleteMemberAction = vi.fn();
vi.mock("@/app/admin/members/actions", () => ({
  deleteMemberAction: (...args: unknown[]) => mockDeleteMemberAction(...args),
}));

describe("DeleteMemberButton", () => {
  beforeEach(() => {
    mockDeleteMemberAction.mockReset();
    mockDeleteMemberAction.mockResolvedValue(undefined);
  });

  it("확인창에서 취소를 누르면 삭제 액션이 호출되지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<DeleteMemberButton memberId="1" name="김철수" />);

    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "정말 김철수님을 삭제하시겠습니까? 되돌릴 수 없습니다."
    );
    expect(mockDeleteMemberAction).not.toHaveBeenCalled();
  });

  it("확인창에서 확인을 누르면 해당 memberId로 삭제 액션이 호출된다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<DeleteMemberButton memberId="42" name="김영희" />);

    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(mockDeleteMemberAction).toHaveBeenCalled();
    expect(mockDeleteMemberAction.mock.calls[0][0]).toBe("42");
  });
});
