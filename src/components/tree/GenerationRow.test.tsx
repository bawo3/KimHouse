import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GenerationRow } from "./GenerationRow";
import type { Member } from "@/lib/members/schema";

describe("GenerationRow", () => {
  it("renders the generation label and one card per member", () => {
    const members: Member[] = [
      { id: "m1", name: "김철수", generation: 3, parentId: null },
      { id: "m2", name: "김영희", generation: 3, parentId: null },
    ];

    render(<GenerationRow generation={3} members={members} />);

    expect(screen.getByText("3대")).toBeInTheDocument();
    expect(screen.getByText("김철수")).toBeInTheDocument();
    expect(screen.getByText("김영희")).toBeInTheDocument();
  });

  it("cycles the palette attribute based on generation", () => {
    const { container, rerender } = render(<GenerationRow generation={1} members={[]} />);
    expect(container.querySelector("[data-palette]")).toHaveAttribute("data-palette", "1");

    rerender(<GenerationRow generation={6} members={[]} />);
    expect(container.querySelector("[data-palette]")).toHaveAttribute("data-palette", "1");

    rerender(<GenerationRow generation={5} members={[]} />);
    expect(container.querySelector("[data-palette]")).toHaveAttribute("data-palette", "5");
  });
});
