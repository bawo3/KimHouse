import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TreeCanvas } from "./TreeCanvas";
import type { Member } from "@/lib/members/schema";
import styles from "./TreeCanvas.module.css";

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
  beforeEach(() => {
    // jsdom에는 scrollIntoView가 구현되어 있지 않으므로 매 테스트마다 새 mock으로 채워 넣는다
    // (테스트 간 호출 기록이 섞이지 않도록 beforeEach에서 매번 새로 만든다).
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    // 가짜 타이머를 쓴 테스트가 실수로 정리하지 않았을 경우를 대비한 안전장치.
    vi.useRealTimers();
  });

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

    const line = container.querySelector("line")!;
    expect(line.getAttribute("x1")).toBe("80");
    expect(line.getAttribute("y1")).toBe("40");
    expect(line.getAttribute("x2")).toBe("140");
    expect(line.getAttribute("y2")).toBe("100");
  });

  it("확대 버튼을 누르면 캔버스 래퍼의 배율(scale)이 1보다 커진다", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => mockRect({}));

    const { container } = render(<TreeCanvas rows={[]} members={[]} />);
    const wrapper = container.querySelector("svg")!.parentElement as HTMLElement;

    expect(wrapper.style.transform).toBe("scale(1)");

    fireEvent.click(screen.getByRole("button", { name: "확대" }));

    expect(wrapper.style.transform).toBe("scale(1.1)");
  });

  it("축소 버튼을 20번 눌러도 배율이 최소값(0.6) 아래로 내려가지 않는다", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => mockRect({}));

    const { container } = render(<TreeCanvas rows={[]} members={[]} />);
    const wrapper = container.querySelector("svg")!.parentElement as HTMLElement;
    const zoomOutButton = screen.getByRole("button", { name: "축소" });

    for (let i = 0; i < 20; i += 1) {
      fireEvent.click(zoomOutButton);
    }

    expect(wrapper.style.transform).toBe("scale(0.6)");
  });

  it("확대 버튼을 20번 눌러도 배율이 최대값(1.6) 위로 올라가지 않는다", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => mockRect({}));

    const { container } = render(<TreeCanvas rows={[]} members={[]} />);
    const wrapper = container.querySelector("svg")!.parentElement as HTMLElement;
    const zoomInButton = screen.getByRole("button", { name: "확대" });

    for (let i = 0; i < 20; i += 1) {
      fireEvent.click(zoomInButton);
    }

    expect(wrapper.style.transform).toBe("scale(1.6)");
  });

  it("확대/축소로 배율을 바꾼 뒤 100% 버튼을 누르면 배율이 정확히 1로 돌아온다", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => mockRect({}));

    const { container } = render(<TreeCanvas rows={[]} members={[]} />);
    const wrapper = container.querySelector("svg")!.parentElement as HTMLElement;

    fireEvent.click(screen.getByRole("button", { name: "확대" }));
    fireEvent.click(screen.getByRole("button", { name: "확대" }));
    fireEvent.click(screen.getByRole("button", { name: "확대" }));
    expect(wrapper.style.transform).not.toBe("scale(1)");

    fireEvent.click(screen.getByRole("button", { name: "100%" }));

    expect(wrapper.style.transform).toBe("scale(1)");
  });

  it("배율(zoom)이 바뀌면 연결선이 새로 측정한 위치를 반영해 다시 그려진다 (zoom 변경 시 재측정 검증)", () => {
    // jsdom은 CSS transform(scale)을 실제로 레이아웃에 반영하지 않으므로,
    // getBoundingClientRect가 "확대 이후 실제 브라우저라면 보고했을 새 위치"를 돌려주도록
    // 모킹 값을 바꿔치기해서, zoom이 바뀔 때 recompute 로직이 실제로 다시 실행되어
    // 새 값을 읽어오는지 검증한다(스케일 계산식 자체를 검증하는 것이 아님 — 이 컴포넌트는
    // 스케일 계산을 하지 않고 브라우저가 계산한 좌표를 다시 읽어올 뿐이다).
    const parent: Member = { id: "p1", name: "김할아버지", generation: 1, parentId: null };
    const child: Member = { id: "c1", name: "김아버지", generation: 2, parentId: "p1" };

    let rectsById: Record<string, DOMRect> = {
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
          { generation: 2, members: [child] },
        ]}
        members={[parent, child]}
      />
    );

    const lineBefore = container.querySelector("line")!;
    expect(lineBefore.getAttribute("x1")).toBe("80");
    expect(lineBefore.getAttribute("y1")).toBe("40");
    expect(lineBefore.getAttribute("x2")).toBe("140");
    expect(lineBefore.getAttribute("y2")).toBe("100");

    // 확대 후 브라우저가 새로 보고할 법한 카드 위치로 모킹 값을 바꿔친다.
    rectsById = {
      p1: mockRect({ left: 44, top: 0, bottom: 44, width: 88 }),
      c1: mockRect({ left: 110, top: 110, bottom: 154, width: 88 }),
    };

    fireEvent.click(screen.getByRole("button", { name: "확대" }));

    const lineAfter = container.querySelector("line")!;
    expect(lineAfter.getAttribute("x1")).toBe("88");
    expect(lineAfter.getAttribute("y1")).toBe("44");
    expect(lineAfter.getAttribute("x2")).toBe("154");
    expect(lineAfter.getAttribute("y2")).toBe("110");
  });

  it("이름을 검색하면 일치하는 첫 번째 카드가 화면에 스크롤되고 하이라이트된다", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => mockRect({}));

    const parent: Member = { id: "p1", name: "김할아버지", generation: 1, parentId: null };
    const child: Member = { id: "c1", name: "김아버지", generation: 2, parentId: "p1" };

    const { container } = render(
      <TreeCanvas
        rows={[
          { generation: 1, members: [parent] },
          { generation: 2, members: [child] },
        ]}
        members={[parent, child]}
      />
    );

    const input = screen.getByPlaceholderText("이름으로 찾기");
    fireEvent.change(input, { target: { value: "김아버지" } });

    const target = container.querySelector('[data-person-id="c1"]') as HTMLElement;
    expect(target).not.toBeNull();
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    expect(target.classList.contains(styles.highlighted)).toBe(true);
  });

  it("검색어와 일치하는 사람이 없으면 안내 문구를 보여주고 스크롤/하이라이트를 하지 않는다", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => mockRect({}));

    const parent: Member = { id: "p1", name: "김할아버지", generation: 1, parentId: null };

    render(<TreeCanvas rows={[{ generation: 1, members: [parent] }]} members={[parent]} />);

    const input = screen.getByPlaceholderText("이름으로 찾기");
    fireEvent.change(input, { target: { value: "존재하지않는이름" } });

    expect(screen.getByText("일치하는 사람이 없습니다")).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("검색어가 비어 있으면 안내 문구가 보이지 않는다", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => mockRect({}));

    const parent: Member = { id: "p1", name: "김할아버지", generation: 1, parentId: null };

    render(<TreeCanvas rows={[{ generation: 1, members: [parent] }]} members={[parent]} />);

    expect(screen.queryByText("일치하는 사람이 없습니다")).not.toBeInTheDocument();
  });

  it("하이라이트는 일정 시간(2초)이 지나면 자동으로 사라진다", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => mockRect({}));
    vi.useFakeTimers();

    const parent: Member = { id: "p1", name: "김할아버지", generation: 1, parentId: null };

    const { container } = render(<TreeCanvas rows={[{ generation: 1, members: [parent] }]} members={[parent]} />);

    const input = screen.getByPlaceholderText("이름으로 찾기");
    fireEvent.change(input, { target: { value: "김할아버지" } });

    const target = container.querySelector('[data-person-id="p1"]') as HTMLElement;
    expect(target.classList.contains(styles.highlighted)).toBe(true);

    vi.advanceTimersByTime(2000);

    expect(target.classList.contains(styles.highlighted)).toBe(false);
  });

  it("검색어를 바꿔 다시 검색하면 이전 카드의 하이라이트가 즉시 해제되고 새 카드만 하이라이트된다", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => mockRect({}));
    vi.useFakeTimers();

    const parent: Member = { id: "p1", name: "김할아버지", generation: 1, parentId: null };
    const child: Member = { id: "c1", name: "김아버지", generation: 2, parentId: "p1" };

    const { container } = render(
      <TreeCanvas
        rows={[
          { generation: 1, members: [parent] },
          { generation: 2, members: [child] },
        ]}
        members={[parent, child]}
      />
    );

    const input = screen.getByPlaceholderText("이름으로 찾기");

    fireEvent.change(input, { target: { value: "김아버지" } });
    const childEl = container.querySelector('[data-person-id="c1"]') as HTMLElement;
    expect(childEl.classList.contains(styles.highlighted)).toBe(true);

    // 이전 하이라이트의 2초 타이머가 다 지나기 전에 다른 검색어로 바꾼다.
    vi.advanceTimersByTime(500);
    fireEvent.change(input, { target: { value: "김할아버지" } });

    const parentEl = container.querySelector('[data-person-id="p1"]') as HTMLElement;
    expect(childEl.classList.contains(styles.highlighted)).toBe(false);
    expect(parentEl.classList.contains(styles.highlighted)).toBe(true);

    // 이전 타이머가 남아있었다면 이 시점에 parentEl의 하이라이트를 잘못 지웠을 것이다(경쟁 상태).
    vi.advanceTimersByTime(1500);
    expect(parentEl.classList.contains(styles.highlighted)).toBe(true);

    vi.advanceTimersByTime(500);
    expect(parentEl.classList.contains(styles.highlighted)).toBe(false);
  });
});
