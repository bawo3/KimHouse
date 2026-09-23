import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PersonCard } from "./PersonCard";
import type { Member } from "@/lib/members/schema";

describe("PersonCard", () => {
  it("이름과 세대를 표시하고, 선택 항목이 없으면 숨긴다", () => {
    const member: Member = { id: "m1", name: "김철수", generation: 3, parentId: null };

    render(<PersonCard member={member} />);

    expect(screen.getByText("김철수")).toBeInTheDocument();
    expect(screen.getByText("3대손")).toBeInTheDocument();
    expect(screen.queryByText(/연락처:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("선택 항목이 있으면 작은 목록 형태로 표시한다", () => {
    const member: Member = {
      id: "m1",
      name: "김철수",
      generation: 3,
      parentId: null,
      birthDate: "1950-01-01",
      phone: "010-1111-2222",
    };

    render(<PersonCard member={member} />);

    expect(screen.getByText("생년월일: 1950-01-01")).toBeInTheDocument();
    expect(screen.getByText("연락처: 010-1111-2222")).toBeInTheDocument();
  });

  it("spouse.name이 있으면 배우자 카드를 렌더링한다", () => {
    const member: Member = {
      id: "m1",
      name: "김철수",
      generation: 3,
      parentId: null,
      spouse: { name: "이영희", clanName: "전주이씨" },
    };

    render(<PersonCard member={member} />);

    expect(screen.getByText("이영희")).toBeInTheDocument();
    expect(screen.getByText("성씨/본관: 전주이씨")).toBeInTheDocument();
  });

  it("배우자 정보가 없으면 배우자 카드를 렌더링하지 않는다", () => {
    const member: Member = { id: "m1", name: "김철수", generation: 3, parentId: null };

    render(<PersonCard member={member} />);

    expect(screen.queryByText("배우자")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("group")).toHaveLength(1);
  });
});
