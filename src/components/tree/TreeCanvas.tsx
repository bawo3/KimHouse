"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Member } from "@/lib/members/schema";
import { GenerationRow } from "./GenerationRow";
import styles from "./TreeCanvas.module.css";

// 세대별 행 하나를 나타내는 데이터 (세대 번호 + 그 세대에 속한 인물 목록)
export interface GenerationRowData {
  generation: number;
  members: Member[];
}

// 확대/축소 배율의 하한/상한 및 버튼 한 번 클릭 시 변화폭
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.6;
const ZOOM_STEP = 0.1;

// 배율을 ZOOM_MIN~ZOOM_MAX 범위로 잘라내고, 부동소수점 오차로 지저분해지지 않도록 소수 둘째 자리로 반올림한다.
function clampZoom(value: number): number {
  const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
  return Math.round(clamped * 100) / 100;
}

// 검색으로 찾은 카드를 강조 표시하는 시간(ms) — 이 시간이 지나면 하이라이트 클래스를 제거한다.
const HIGHLIGHT_DURATION_MS = 2000;

// 부모-자녀를 잇는 연결선 하나의 좌표 정보 (컨테이너 기준 상대 좌표)
interface Line {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// 세대별 행(GenerationRow)들을 세로로 쌓아 보여주고, 그 위에 SVG로 부모-자녀 연결선을 그리는 최상위 트리 컴포넌트
// - 연결선은 실제 렌더링된 DOM 위치(getBoundingClientRect)를 측정해서 그린다.
// - parentId가 없거나(최상위 조상) 가리키는 부모를 목록에서 찾을 수 없으면(미연결) 선을 그리지 않는다.
export function TreeCanvas({ rows, members }: { rows: GenerationRowData[]; members: Member[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  // 현재 하이라이트 중인 카드 엘리먼트와, 그 하이라이트를 해제할 타이머를 기억해둔다.
  // (검색어가 바뀔 때마다 이전 하이라이트/타이머를 확실히 정리하기 위함 — 안 그러면
  // 연속으로 검색할 때 타이머 두 개가 경쟁하거나 예전 카드에 하이라이트가 남아있게 된다.)
  const highlightedElementRef = useRef<HTMLElement | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 검색어가 있는데 일치하는 사람이 한 명도 없을 때만 "일치하는 사람이 없습니다" 안내를 보여준다.
  const showNoMatchMessage = searchQuery.length > 0 && !members.some((member) => member.name.includes(searchQuery));

  function clearHighlight() {
    if (highlightTimeoutRef.current !== null) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    if (highlightedElementRef.current) {
      highlightedElementRef.current.classList.remove(styles.highlighted);
      highlightedElementRef.current = null;
    }
  }

  // 언마운트 시 남아있는 타이머를 정리한다(이미 사라진 DOM에 대해 classList 조작을 시도하지 않도록).
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    const query = event.target.value;
    setSearchQuery(query);

    // 검색어가 바뀔 때마다 이전 하이라이트/타이머를 먼저 정리하고 새로 찾는다.
    clearHighlight();

    if (query.length === 0) return;

    const match = members.find((member) => member.name.includes(query));
    if (!match) return;

    const target = containerRef.current?.querySelector(`[data-person-id="${match.id}"]`);
    if (!(target instanceof HTMLElement)) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add(styles.highlighted);
    highlightedElementRef.current = target;
    highlightTimeoutRef.current = setTimeout(() => {
      target.classList.remove(styles.highlighted);
      highlightedElementRef.current = null;
      highlightTimeoutRef.current = null;
    }, HIGHLIGHT_DURATION_MS);
  }

  function handleZoomIn() {
    setZoom((current) => clampZoom(current + ZOOM_STEP));
  }

  function handleZoomOut() {
    setZoom((current) => clampZoom(current - ZOOM_STEP));
  }

  function handleZoomReset() {
    setZoom(1);
  }

  useLayoutEffect(() => {
    function recomputeLines() {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const nextLines: Line[] = [];

      for (const member of members) {
        // parentId가 없거나(최상위 조상), 부모 id가 실제 목록에 없는 경우(미연결)는 건너뛴다.
        if (!member.parentId || !membersById.has(member.parentId)) continue;

        const childEl = container.querySelector(`[data-person-id="${member.id}"]`);
        const parentEl = container.querySelector(`[data-person-id="${member.parentId}"]`);
        if (!(childEl instanceof HTMLElement) || !(parentEl instanceof HTMLElement)) continue;

        const childRect = childEl.getBoundingClientRect();
        const parentRect = parentEl.getBoundingClientRect();

        // 부모 카드의 아래쪽 중앙에서 자녀 카드의 위쪽 중앙으로 이어지는 선을 그린다.
        nextLines.push({
          id: `${member.parentId}->${member.id}`,
          x1: parentRect.left + parentRect.width / 2 - containerRect.left,
          y1: parentRect.bottom - containerRect.top,
          x2: childRect.left + childRect.width / 2 - containerRect.left,
          y2: childRect.top - containerRect.top,
        });
      }

      setLines(nextLines);
    }

    recomputeLines();
    window.addEventListener("resize", recomputeLines);
    return () => window.removeEventListener("resize", recomputeLines);
    // zoom이 바뀌면 canvas 래퍼에 적용된 CSS transform(scale)의 배율이 달라져서
    // getBoundingClientRect()가 돌려주는 카드 위치가 실제로 이동한다(브라우저가 transform 적용 후
    // 좌표를 계산해서 반환). 그러므로 zoom 변경 시에도 반드시 다시 측정해야 선이 카드 위치와
    // 어긋나지 않는다.
  }, [members, membersById, zoom]);

  return (
    <div>
      <div className={styles.controls}>
        <button type="button" onClick={handleZoomOut} className={styles.zoomButton}>
          축소
        </button>
        <button type="button" onClick={handleZoomReset} className={styles.zoomButton}>
          100%
        </button>
        <button type="button" onClick={handleZoomIn} className={styles.zoomButton}>
          확대
        </button>
        <input
          type="search"
          placeholder="이름으로 찾기"
          value={searchQuery}
          onChange={handleSearchChange}
          className={styles.searchInput}
        />
      </div>
      {showNoMatchMessage && <p className={styles.noMatchMessage}>일치하는 사람이 없습니다</p>}
      <div
        ref={containerRef}
        className={styles.canvas}
        style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
      >
        <svg className={styles.overlay} aria-hidden="true">
          {lines.map((line) => (
            <line key={line.id} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} className={styles.line} />
          ))}
        </svg>
        {rows.map((row) => (
          <GenerationRow key={row.generation} generation={row.generation} members={row.members} />
        ))}
      </div>
    </div>
  );
}
