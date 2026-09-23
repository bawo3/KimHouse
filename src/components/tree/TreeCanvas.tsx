"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Member } from "@/lib/members/schema";
import { GenerationRow } from "./GenerationRow";
import styles from "./TreeCanvas.module.css";

// 세대별 행 하나를 나타내는 데이터 (세대 번호 + 그 세대에 속한 인물 목록)
export interface GenerationRowData {
  generation: number;
  members: Member[];
}

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
  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

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
  }, [members, membersById]);

  return (
    <div ref={containerRef} className={styles.canvas}>
      <svg className={styles.overlay} aria-hidden="true">
        {lines.map((line) => (
          <line key={line.id} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} className={styles.line} />
        ))}
      </svg>
      {rows.map((row) => (
        <GenerationRow key={row.generation} generation={row.generation} members={row.members} />
      ))}
    </div>
  );
}
