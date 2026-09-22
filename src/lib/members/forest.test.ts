import { describe, expect, it } from "vitest";
import { buildForest, groupByGeneration } from "@/lib/members/forest";
import type { Member } from "@/lib/members/schema";

describe("buildForest", () => {
  it("nests children under their parent", () => {
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

  it("treats null parentId and dangling parentId both as forest roots", () => {
    const members: Member[] = [
      { id: "p1", name: "부", generation: 1, parentId: null },
      { id: "orphan", name: "미연결", generation: 5, parentId: "no-such-id" },
    ];

    const forest = buildForest(members);
    const rootIds = forest.map((node) => node.member.id);

    expect(rootIds).toContain("p1");
    expect(rootIds).toContain("orphan");
  });

  it("orders siblings by birthDate when both have one", () => {
    const members: Member[] = [
      { id: "p1", name: "부", generation: 1, parentId: null },
      { id: "younger", name: "동생", generation: 2, parentId: "p1", birthDate: "1990-01-01" },
      { id: "older", name: "형", generation: 2, parentId: "p1", birthDate: "1985-01-01" },
    ];

    const forest = buildForest(members);

    expect(forest[0].children.map((node) => node.member.id)).toEqual(["older", "younger"]);
  });

  it("falls back to registration order when birthDate is missing", () => {
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
  it("groups every member into its generation bucket", () => {
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
