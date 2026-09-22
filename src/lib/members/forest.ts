import type { Member } from "@/lib/members/schema";

// 트리(포리스트)의 한 노드
// - member: 이 노드가 나타내는 인물 정보
// - children: 이 인물의 자녀 노드 목록 (부계 혈통 기준)
export interface TreeNode {
  member: Member;
  children: TreeNode[];
}

// 형제(같은 부모를 둔 인물들) 사이의 정렬 순서를 정한다.
// - 둘 다 생년월일이 있으면 생년월일 오름차순
// - 그렇지 않으면 원래 배열(등록) 순서를 그대로 유지한다 (Array.sort는 안정 정렬이므로 0을 반환하면 순서가 보존됨)
function compareSiblings(a: Member, b: Member): number {
  if (a.birthDate && b.birthDate) {
    return a.birthDate.localeCompare(b.birthDate);
  }
  return 0;
}

// 인물 목록(평면 배열)을 부모-자식 관계로 엮어 트리(포리스트)로 만든다.
// - parentId가 null이거나, 존재하지 않는 id를 가리키는 경우 모두 "루트(미연결)"로 취급한다.
export function buildForest(members: Member[]): TreeNode[] {
  const byId = new Map(members.map((member) => [member.id, member]));
  const childrenByParent = new Map<string, Member[]>();

  for (const member of members) {
    if (member.parentId && byId.has(member.parentId)) {
      const siblings = childrenByParent.get(member.parentId) ?? [];
      siblings.push(member);
      childrenByParent.set(member.parentId, siblings);
    }
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort(compareSiblings);
  }

  function toNode(member: Member): TreeNode {
    const children = childrenByParent.get(member.id) ?? [];
    return { member, children: children.map(toNode) };
  }

  const roots = members.filter((member) => !member.parentId || !byId.has(member.parentId));
  roots.sort(compareSiblings);

  return roots.map(toNode);
}

// 트리(포리스트)를 순회하며 세대(generation) 번호별로 인물을 묶는다.
export function groupByGeneration(forest: TreeNode[]): Map<number, Member[]> {
  const rows = new Map<number, Member[]>();

  function visit(node: TreeNode) {
    const bucket = rows.get(node.member.generation) ?? [];
    bucket.push(node.member);
    rows.set(node.member.generation, bucket);
    for (const child of node.children) {
      visit(child);
    }
  }

  for (const root of forest) {
    visit(root);
  }

  return rows;
}
