import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TreeCanvas } from "./TreeCanvas";
import type { Member } from "@/lib/members/schema";

function mockRect(overrides: Partial<DOMRect>): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    top: 0,
    left: 0,
    right: 100,
    bottom: 40,
    toJSON: () => ({}),
    ...overrides,
  } as DOMRect;
}

describe("TreeCanvas", () => {
  it("연결 가능한 부모-자녀 쌍마다 선을 하나씩 그리고, 미연결 인물에는 선을 그리지 않는다", () => {
    const parent: Member = { id: "p1", name: "김할아버지", generation: 1, parentId: null };
    const child: Member = { id: "c1", name: "김아버지", generation: 2, parentId: "p1" };
    const orphan: Member = { id: "o1", name: "김미연결", generation: 2, parentId: "missing" };

    const rectsById: Record<string, DOMRect> = {
      p1: mockRect({ left: 40, top: 0, bottom: 40, width: 80 }),
      c1: mockRect({ left: 100, top: 100, bottom: 140, width: 80 }),
    };

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement
    ) {
      const id = this.getAttribute("data-person-id");
      if (id && rectsById[id]) return rectsById[id];
      return mockRect({});
    });

    const { container } = render(
      <TreeCanvas
        rows={[
          { generation: 1, members: [parent] },
          { generation: 2, members: [child, orphan] },
        ]}
        members={[parent, child, orphan]}
      />
    );

    expect(container.querySelectorAll("line")).toHaveLength(1);
  });
});
