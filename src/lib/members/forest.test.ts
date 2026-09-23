import { describe, expect, it } from "vitest";
import { buildForest, groupByGeneration } from "@/lib/members/forest";
import type { Member } from "@/lib/members/schema";

describe("buildForest", () => {
  it("자녀를 부모 아래에 중첩시킨다", () => {
    const members: Member[] = [
      { id: "p1", name: "부", generation: 1, parentId: null },
      { id: "c1", name: "자1", generation: 2, parentId: "p1" },
      { id: "c2", name: "자2", generation: 2, parentId: "p1" },
    ];

    const forest = buildForest(members);

    expect(forest).toHaveLength(1);
    expect(forest[0].member.id).toBe("p1");
    expect(forest[0].children.map((node) => node.member.id)).toEqual(["c1", "c2"]);
  });

  it("parentId가 null이거나 존재하지 않는 값을 가리키면 둘 다 최상위 노드로 취급한다", () => {
    const members: Member[] = [
      { id: "p1", name: "부", generation: 1, parentId: null },
      { id: "orphan", name: "미연결", generation: 5, parentId: "no-such-id" },
    ];

    const forest = buildForest(members);
    const rootIds = forest.map((node) => node.member.id);

    expect(rootIds).toContain("p1");
    expect(rootIds).toContain("orphan");
  });

  it("둘 다 생년월일이 있으면 생년월일 순서로 형제를 정렬한다", () => {
    const members: Member[] = [
      { id: "p1", name: "부", generation: 1, parentId: null },
      { id: "younger", name: "동생", generation: 2, parentId: "p1", birthDate: "1990-01-01" },
      { id: "older", name: "형", generation: 2, parentId: "p1", birthDate: "1985-01-01" },
    ];

    const forest = buildForest(members);

    expect(forest[0].children.map((node) => node.member.id)).toEqual(["older", "younger"]);
  });

  it("생년월일이 없으면 등록 순서대로 정렬한다", () => {
    const members: Member[] = [
      { id: "p1", name: "부", generation: 1, parentId: null },
      { id: "first", name: "먼저등록", generation: 2, parentId: "p1" },
      { id: "second", name: "나중등록", generation: 2, parentId: "p1" },
    ];

    const forest = buildForest(members);

    expect(forest[0].children.map((node) => node.member.id)).toEqual(["first", "second"]);
  });
});

describe("groupByGeneration", () => {
  it("모든 구성원을 세대별 그룹으로 묶는다", () => {
    const members: Member[] = [
      { id: "p1", name: "부", generation: 1, parentId: null },
      { id: "c1", name: "자1", generation: 2, parentId: "p1" },
      { id: "c2", name: "자2", generation: 2, parentId: "p1" },
    ];

    const forest = buildForest(members);
    const rows = groupByGeneration(forest);

    expect(rows.get(1)?.map((m) => m.id)).toEqual(["p1"]);
    expect(rows.get(2)?.map((m) => m.id)).toEqual(["c1", "c2"]);
  });
});
