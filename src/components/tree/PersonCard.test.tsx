import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PersonCard } from "./PersonCard";
import type { Member } from "@/lib/members/schema";

describe("PersonCard", () => {
  it("shows the name and generation, and hides optional fields when absent", () => {
    const member: Member = { id: "m1", name: "김철수", generation: 3, parentId: null };

    render(<PersonCard member={member} />);

    expect(screen.getByText("김철수")).toBeInTheDocument();
    expect(screen.getByText("3대손")).toBeInTheDocument();
    expect(screen.queryByText(/연락처:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows optional fields in a smaller list when present", () => {
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

  it("renders a matching spouse card when spouse.name is present", () => {
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

  it("renders no spouse card when spouse is absent", () => {
    const member: Member = { id: "m1", name: "김철수", generation: 3, parentId: null };

    render(<PersonCard member={member} />);

    expect(screen.queryByText("배우자")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("group")).toHaveLength(1);
  });
});
