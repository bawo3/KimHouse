# 김해 김씨 문중 명부 - 기반 구축(Plan A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 기반으로 로그인(세대+이름+연락처 대조) 후 세대별 가로 행 트리 뷰(부부 나란히 표시, 필수/선택 필드 구분 표시, 부모-자녀 연결선)를 볼 수 있는 최소 동작 웹앱을 만들고 Vercel에 배포 가능한 상태로 만든다.

**Architecture:** Next.js(App Router) + TypeScript. 데이터는 `data/members.json`을 git에 커밋해두고 서버에서 `fs`로 직접 읽는다(Vercel은 git push마다 재배포하므로 매번 최신 데이터가 번들에 포함됨). 로그인 세션은 서명된 httpOnly 쿠키(JWT, `jose`)로 무상태 처리한다. 데이터 검증은 `zod`로 한다. 트리 뷰는 커스텀 React 컴포넌트(CSS Grid/Flex + SVG 오버레이)로 구현한다.

**Tech Stack:** Next.js, React, TypeScript, zod, jose, Vitest + Testing Library(단위/컴포넌트 테스트).

**이 계획의 범위:** 설계 문서(`docs/superpowers/specs/2026-09-21-family-tree-design.md`)의 2장(아키텍처 일부)·3장(데이터 모델)·4장(로그인)·7장(트리 뷰 UI 핵심)까지만 다룬다. 5장(등록/수정 화면)·6장(관리자 승인)·6-1(회원관리)·8장의 검색/확대축소 기능·GitHub API를 통한 쓰기(커밋)는 후속 Plan B("등록/승인 워크플로우")·Plan C("회원관리·접근성 마감")에서 다룬다. 이 계획만 끝내도 "로그인해서 트리를 보는" 완전히 동작하는 사이트가 나온다.

---

## 파일 구조

```
KimHouse/
  package.json
  tsconfig.json
  next.config.ts
  next-env.d.ts
  vitest.config.ts
  vitest.setup.ts
  .env.local.example
  data/
    members.json                      # 실제 데이터 (git에 커밋)
  src/
    lib/
      phone.ts                        # 연락처 정규화
      phone.test.ts
      members/
        schema.ts                     # zod 스키마 + Member/Spouse 타입 + parseMembers()
        schema.test.ts
        load.ts                       # fs에서 data/members.json 읽기
        load.test.ts
        forest.ts                     # buildForest / groupByGeneration
        forest.test.ts
      auth/
        session.ts                    # JWT 발급/검증
        session.test.ts
        login.ts                      # findMatchingMember()
        login.test.ts
        getSession.ts                 # 쿠키 → 세션 payload
    app/
      layout.tsx
      page.tsx                        # 세션 있으면 /tree, 없으면 /login 로 리다이렉트
      login/
        page.tsx
        LoginForm.tsx
        LoginForm.test.tsx
        actions.ts                    # 서버 액션: 로그인 검증 + 쿠키 발급
      tree/
        page.tsx                      # 서버 컴포넌트: 세션 확인 + 데이터 로드 + TreeCanvas 렌더
    components/
      tree/
        PersonCard.tsx
        PersonCard.module.css
        PersonCard.test.tsx
        GenerationRow.tsx
        GenerationRow.module.css
        GenerationRow.test.tsx
        TreeCanvas.tsx
        TreeCanvas.module.css
        TreeCanvas.test.tsx
```

---

### Task 1: 프로젝트 스캐폴딩 (Next.js 최소 골격)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `next-env.d.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "kimhouse",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

- [ ] **Step 2: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: next.config.ts 작성**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 4: next-env.d.ts 작성**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 5: 루트 레이아웃 작성**

`src/app/layout.tsx`:

```tsx
import type { ReactNode } from "react";

export const metadata = {
  title: "김해 김씨 문중 명부",
  description: "김해 김씨 집안 문중 명부 트리 뷰",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: 임시 홈 페이지 작성** (Task 12에서 리다이렉트 로직으로 교체됨)

`src/app/page.tsx`:

```tsx
export default function HomePage() {
  return <p>준비 중입니다.</p>;
}
```

- [ ] **Step 7: 의존성 설치**

Run: `npm install next@latest react@latest react-dom@latest`
Run: `npm install --save-dev typescript @types/node @types/react @types/react-dom`

- [ ] **Step 8: 빌드 확인**

Run: `npm run build`
Expected: `Compiled successfully` 로그와 함께 빌드 종료 (exit code 0)

- [ ] **Step 9: 커밋**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts next-env.d.ts src/app
git commit -m "$(cat <<'EOF'
Scaffold minimal Next.js App Router project

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 테스트 하네스(Vitest) 설정

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json`

- [ ] **Step 1: 의존성 설치**

Run: `npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`

- [ ] **Step 2: vitest.config.ts 작성**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: vitest.setup.ts 작성**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: package.json에 test 스크립트 추가**

`package.json`의 `scripts`에 추가:

```json
"test": "vitest run"
```

- [ ] **Step 5: 하네스 동작 확인용 임시 테스트 작성 후 실행**

`src/smoke.test.ts` (임시 파일):

```ts
import { describe, expect, it } from "vitest";

describe("smoke test", () => {
  it("adds numbers", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: `1 passed` (test files 1 passed)

- [ ] **Step 6: 임시 테스트 파일 삭제**

Run: `rm src/smoke.test.ts` (PowerShell: `Remove-Item src/smoke.test.ts`)

- [ ] **Step 7: 커밋**

```bash
git add vitest.config.ts vitest.setup.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add Vitest + Testing Library harness

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 인물 데이터 스키마 + 시드 데이터

**Files:**
- Create: `src/lib/members/schema.ts`
- Test: `src/lib/members/schema.test.ts`
- Create: `src/lib/members/load.ts`
- Test: `src/lib/members/load.test.ts`
- Create: `data/members.json`

- [ ] **Step 1: zod 설치**

Run: `npm install zod`

- [ ] **Step 2: 실패하는 테스트 작성**

`src/lib/members/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseMembers } from "@/lib/members/schema";

describe("parseMembers", () => {
  it("parses a valid members array", () => {
    const raw = JSON.stringify([
      { id: "a1", name: "김철수", generation: 1, parentId: null },
    ]);

    const members = parseMembers(raw);

    expect(members).toHaveLength(1);
    expect(members[0].name).toBe("김철수");
  });

  it("accepts optional fields including nested spouse info", () => {
    const raw = JSON.stringify([
      {
        id: "a1",
        name: "김철수",
        generation: 1,
        parentId: null,
        birthDate: "1950-01-01",
        spouse: { name: "이영희", clanName: "전주이씨" },
      },
    ]);

    const members = parseMembers(raw);

    expect(members[0].spouse?.name).toBe("이영희");
  });

  it("rejects a record missing a required field", () => {
    const raw = JSON.stringify([{ id: "a1", generation: 1, parentId: null }]);

    expect(() => parseMembers(raw)).toThrow();
  });
});
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `npm test -- schema.test.ts`
Expected: FAIL — `Cannot find module '@/lib/members/schema'`

- [ ] **Step 4: 스키마 구현**

`src/lib/members/schema.ts`:

```ts
import { z } from "zod";

export const spouseSchema = z.object({
  name: z.string().min(1),
  birthDate: z.string().optional(),
  clanName: z.string().optional(),
  phone: z.string().optional(),
  deathDate: z.string().optional(),
});

export const memberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  generation: z.number().int().positive(),
  parentId: z.string().min(1).nullable(),
  birthDate: z.string().optional(),
  hanjaName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  deathDate: z.string().optional(),
  role: z.literal("admin").optional(),
  spouse: spouseSchema.optional(),
});

export const membersFileSchema = z.array(memberSchema);

export type Spouse = z.infer<typeof spouseSchema>;
export type Member = z.infer<typeof memberSchema>;

export function parseMembers(raw: string): Member[] {
  const json = JSON.parse(raw);
  return membersFileSchema.parse(json);
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test -- schema.test.ts`
Expected: PASS (3 passed)

- [ ] **Step 6: 시드 데이터 작성**

`data/members.json`:

```json
[
  {
    "id": "seed-admin",
    "name": "관리자 이름을 입력하세요",
    "generation": 1,
    "parentId": null,
    "role": "admin",
    "phone": "01000000000"
  }
]
```

> 주의: `name`과 `phone`은 실제 관리자(작성자 본인)의 정보로 반드시 교체해야 합니다. 이 값 그대로 배포하면 로그인 시 이 placeholder 값을 입력해야 들어갈 수 있습니다.

- [ ] **Step 7: load.ts에 대한 실패하는 테스트 작성**

`src/lib/members/load.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { loadMembersFromDisk } from "@/lib/members/load";

describe("loadMembersFromDisk", () => {
  it("loads and validates the real data/members.json seed file", () => {
    const members = loadMembersFromDisk();

    expect(members.length).toBeGreaterThan(0);
    expect(members.some((member) => member.role === "admin")).toBe(true);
  });
});
```

- [ ] **Step 8: 테스트 실행 → 실패 확인**

Run: `npm test -- load.test.ts`
Expected: FAIL — `Cannot find module '@/lib/members/load'`

- [ ] **Step 9: load.ts 구현**

`src/lib/members/load.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseMembers, type Member } from "@/lib/members/schema";

const DATA_FILE_PATH = join(process.cwd(), "data", "members.json");

export function loadMembersFromDisk(): Member[] {
  const raw = readFileSync(DATA_FILE_PATH, "utf-8");
  return parseMembers(raw);
}
```

- [ ] **Step 10: 테스트 실행 → 통과 확인**

Run: `npm test -- load.test.ts`
Expected: PASS (1 passed)

- [ ] **Step 11: 커밋**

```bash
git add data/members.json src/lib/members package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add member data schema, disk loader, and seed data

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 연락처 정규화 유틸

**Files:**
- Create: `src/lib/phone.ts`
- Test: `src/lib/phone.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/phone.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it("strips dashes and spaces", () => {
    expect(normalizePhone("010-1234-5678")).toBe("01012345678");
    expect(normalizePhone("010 1234 5678")).toBe("01012345678");
  });

  it("returns an empty string for empty, null, or undefined input", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone(null)).toBe("");
    expect(normalizePhone(undefined)).toBe("");
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- phone.test.ts`
Expected: FAIL — `Cannot find module '@/lib/phone'`

- [ ] **Step 3: 구현**

`src/lib/phone.ts`:

```ts
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/[^0-9]/g, "");
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- phone.test.ts`
Expected: PASS (2 passed)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/phone.ts src/lib/phone.test.ts
git commit -m "$(cat <<'EOF'
Add phone number normalization utility

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 로그인 대조 로직 (findMatchingMember)

**Files:**
- Create: `src/lib/auth/login.ts`
- Test: `src/lib/auth/login.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/auth/login.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { findMatchingMember } from "@/lib/auth/login";
import type { Member } from "@/lib/members/schema";

const members: Member[] = [
  { id: "m1", name: "김철수", generation: 3, parentId: null, phone: "010-1111-2222" },
  { id: "m2", name: "김영희", generation: 4, parentId: "m1" },
];

describe("findMatchingMember", () => {
  it("matches when generation, name, and normalized phone all agree", () => {
    const match = findMatchingMember(members, {
      generation: 3,
      name: "김철수",
      phone: "01011112222",
    });

    expect(match?.id).toBe("m1");
  });

  it("returns null when the stored member has no phone on file", () => {
    const match = findMatchingMember(members, {
      generation: 4,
      name: "김영희",
      phone: "",
    });

    expect(match).toBeNull();
  });

  it("returns null when the generation does not match", () => {
    const match = findMatchingMember(members, {
      generation: 99,
      name: "김철수",
      phone: "01011112222",
    });

    expect(match).toBeNull();
  });

  it("returns null when the input phone is empty", () => {
    const match = findMatchingMember(members, {
      generation: 3,
      name: "김철수",
      phone: "",
    });

    expect(match).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- login.test.ts`
Expected: FAIL — `Cannot find module '@/lib/auth/login'`

- [ ] **Step 3: 구현**

`src/lib/auth/login.ts`:

```ts
import type { Member } from "@/lib/members/schema";
import { normalizePhone } from "@/lib/phone";

export interface LoginInput {
  generation: number;
  name: string;
  phone: string;
}

export function findMatchingMember(members: Member[], input: LoginInput): Member | null {
  const inputPhone = normalizePhone(input.phone);
  if (!inputPhone) return null;

  const match = members.find((member) => {
    if (!member.phone) return false;
    if (member.generation !== input.generation) return false;
    if (member.name !== input.name) return false;
    return normalizePhone(member.phone) === inputPhone;
  });

  return match ?? null;
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- login.test.ts`
Expected: PASS (4 passed)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/auth/login.ts src/lib/auth/login.test.ts
git commit -m "$(cat <<'EOF'
Add generation+name+phone login matching logic

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 포리스트 빌더 + 세대별 그룹화 (buildForest / groupByGeneration)

**Files:**
- Create: `src/lib/members/forest.ts`
- Test: `src/lib/members/forest.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/members/forest.test.ts`:

```ts
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
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- forest.test.ts`
Expected: FAIL — `Cannot find module '@/lib/members/forest'`

- [ ] **Step 3: 구현**

`src/lib/members/forest.ts`:

```ts
import type { Member } from "@/lib/members/schema";

export interface TreeNode {
  member: Member;
  children: TreeNode[];
}

function compareSiblings(a: Member, b: Member): number {
  if (a.birthDate && b.birthDate) {
    return a.birthDate.localeCompare(b.birthDate);
  }
  return 0;
}

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
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- forest.test.ts`
Expected: PASS (5 passed)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/members/forest.ts src/lib/members/forest.test.ts
git commit -m "$(cat <<'EOF'
Add forest builder and generation grouping for the family tree

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 세션 JWT 발급/검증

**Files:**
- Create: `src/lib/auth/session.ts`
- Test: `src/lib/auth/session.test.ts`

- [ ] **Step 1: jose 설치**

Run: `npm install jose`

- [ ] **Step 2: 실패하는 테스트 작성**

`src/lib/auth/session.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

beforeEach(() => {
  process.env.SESSION_JWT_SECRET = "test-secret-at-least-32-characters-long";
});

describe("session tokens", () => {
  it("round-trips a payload through create and verify", async () => {
    const token = await createSessionToken({ memberId: "m1", role: "admin" });
    const payload = await verifySessionToken(token);

    expect(payload).toEqual({ memberId: "m1", role: "admin" });
  });

  it("returns null for a tampered or invalid token", async () => {
    const payload = await verifySessionToken("not-a-real-token");

    expect(payload).toBeNull();
  });
});
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `npm test -- session.test.ts`
Expected: FAIL — `Cannot find module '@/lib/auth/session'`

- [ ] **Step 4: 구현**

`src/lib/auth/session.ts`:

```ts
import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

export interface SessionPayload {
  memberId: string;
  role?: "admin";
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_JWT_SECRET;
  if (!secret) {
    throw new Error("SESSION_JWT_SECRET 환경변수가 설정되지 않았습니다.");
  }
  return encoder.encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ memberId: payload.memberId, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.memberId !== "string") return null;
    return {
      memberId: payload.memberId,
      role: payload.role === "admin" ? "admin" : undefined,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test -- session.test.ts`
Expected: PASS (2 passed)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/auth/session.ts src/lib/auth/session.test.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add signed JWT session create/verify helpers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 로그인 화면 (서버 액션 + 폼)

**Files:**
- Create: `src/app/login/actions.ts`
- Create: `src/app/login/LoginForm.tsx`
- Test: `src/app/login/LoginForm.test.tsx`
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: 서버 액션 작성**

`src/app/login/actions.ts`:

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loadMembersFromDisk } from "@/lib/members/load";
import { findMatchingMember } from "@/lib/auth/login";
import { createSessionToken } from "@/lib/auth/session";

export interface LoginFormState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const generationRaw = formData.get("generation");
  const name = formData.get("name");
  const phone = formData.get("phone");

  const generation = Number(generationRaw);

  if (
    !generationRaw ||
    Number.isNaN(generation) ||
    typeof name !== "string" ||
    !name.trim() ||
    typeof phone !== "string" ||
    !phone.trim()
  ) {
    return { error: "세대, 이름, 연락처를 모두 입력해 주세요." };
  }

  const members = loadMembersFromDisk();
  const match = findMatchingMember(members, { generation, name: name.trim(), phone });

  if (!match) {
    return { error: "일치하는 정보를 찾을 수 없습니다. 세대·이름·연락처를 다시 확인해 주세요." };
  }

  const token = await createSessionToken({ memberId: match.id, role: match.role });

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/tree");
}
```

- [ ] **Step 2: LoginForm에 대한 실패하는 테스트 작성**

`src/app/login/LoginForm.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

vi.mock("./actions", () => ({
  loginAction: vi.fn(),
}));

describe("LoginForm", () => {
  it("renders generation, name, and phone inputs plus a submit button", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("세대")).toBeInTheDocument();
    expect(screen.getByLabelText("이름")).toBeInTheDocument();
    expect(screen.getByLabelText("연락처")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "들어가기" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `npm test -- LoginForm.test.tsx`
Expected: FAIL — `Cannot find module './LoginForm'`

- [ ] **Step 4: LoginForm 구현**

`src/app/login/LoginForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { loginAction, type LoginFormState } from "./actions";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction}>
      <label>
        세대
        <input name="generation" type="number" inputMode="numeric" required />
      </label>
      <label>
        이름
        <input name="name" type="text" required />
      </label>
      <label>
        연락처
        <input name="phone" type="tel" required />
      </label>
      {state.error && <p role="alert">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "확인 중..." : "들어가기"}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test -- LoginForm.test.tsx`
Expected: PASS (1 passed)

- [ ] **Step 6: 로그인 페이지 작성**

`src/app/login/page.tsx`:

```tsx
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main>
      <h1>가족 확인</h1>
      <p>세대, 이름, 연락처를 입력하면 명부를 볼 수 있습니다.</p>
      <LoginForm />
    </main>
  );
}
```

- [ ] **Step 7: 수동 확인**

Run: `npm run dev`
브라우저에서 `/login` 접속 → 세대 `1`, 이름 `관리자 이름을 입력하세요`, 연락처 `01000000000` 입력(시드 데이터 값) → 제출 → `/tree`로 리다이렉트되는지 확인. (`/tree` 페이지는 Task 12에서 만들어지므로 지금은 404가 뜨는 것이 정상입니다. 틀린 값 입력 시 에러 메시지가 뜨는지도 확인하세요.)

- [ ] **Step 8: 커밋**

```bash
git add src/app/login
git commit -m "$(cat <<'EOF'
Add login page with generation+name+phone server action

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: PersonCard 컴포넌트

**Files:**
- Create: `src/components/tree/PersonCard.tsx`
- Create: `src/components/tree/PersonCard.module.css`
- Test: `src/components/tree/PersonCard.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/tree/PersonCard.test.tsx`:

```tsx
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
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- PersonCard.test.tsx`
Expected: FAIL — `Cannot find module './PersonCard'`

- [ ] **Step 3: CSS 모듈 작성**

`src/components/tree/PersonCard.module.css`:

```css
.pair {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.card {
  background: #ffffff;
  border: 1px solid #d0d0d0;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  min-width: 140px;
}

.spouseCard {
  background: #fafafa;
}

.name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.required {
  margin: 0.15rem 0 0;
  font-size: 1rem;
}

.optionalList {
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0;
  font-size: 0.8rem;
  color: #555555;
}

.optionalItem {
  margin: 0.1rem 0;
}
```

- [ ] **Step 4: PersonCard 구현**

`src/components/tree/PersonCard.tsx`:

```tsx
import type { Member, Spouse } from "@/lib/members/schema";
import styles from "./PersonCard.module.css";

function formatOptionalFields(member: Member): string[] {
  const fields: string[] = [];
  if (member.birthDate) fields.push(`생년월일: ${member.birthDate}`);
  if (member.hanjaName) fields.push(`한자: ${member.hanjaName}`);
  if (member.phone) fields.push(`연락처: ${member.phone}`);
  if (member.address) fields.push(`거주지: ${member.address}`);
  if (member.deathDate) fields.push(`기일: ${member.deathDate}`);
  return fields;
}

function formatSpouseFields(spouse: Spouse): string[] {
  const fields: string[] = [];
  if (spouse.birthDate) fields.push(`생년월일: ${spouse.birthDate}`);
  if (spouse.clanName) fields.push(`성씨/본관: ${spouse.clanName}`);
  if (spouse.phone) fields.push(`연락처: ${spouse.phone}`);
  if (spouse.deathDate) fields.push(`기일: ${spouse.deathDate}`);
  return fields;
}

function PersonInfo({
  name,
  requiredLabel,
  optionalFields,
  isSpouse,
}: {
  name: string;
  requiredLabel: string;
  optionalFields: string[];
  isSpouse?: boolean;
}) {
  return (
    <div className={isSpouse ? `${styles.card} ${styles.spouseCard}` : styles.card}>
      <p className={styles.name}>{name}</p>
      <p className={styles.required}>{requiredLabel}</p>
      {optionalFields.length > 0 && (
        <ul className={styles.optionalList}>
          {optionalFields.map((field) => (
            <li key={field} className={styles.optionalItem}>
              {field}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PersonCard({ member }: { member: Member }) {
  return (
    <div className={styles.pair} data-person-id={member.id}>
      <PersonInfo
        name={member.name}
        requiredLabel={`${member.generation}대손`}
        optionalFields={formatOptionalFields(member)}
      />
      {member.spouse?.name && (
        <PersonInfo
          name={member.spouse.name}
          requiredLabel="배우자"
          optionalFields={formatSpouseFields(member.spouse)}
          isSpouse
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test -- PersonCard.test.tsx`
Expected: PASS (4 passed)

- [ ] **Step 6: 커밋**

```bash
git add src/components/tree/PersonCard.tsx src/components/tree/PersonCard.module.css src/components/tree/PersonCard.test.tsx
git commit -m "$(cat <<'EOF'
Add PersonCard with required/optional field sizing and spouse pairing

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: GenerationRow 컴포넌트

**Files:**
- Create: `src/components/tree/GenerationRow.tsx`
- Create: `src/components/tree/GenerationRow.module.css`
- Test: `src/components/tree/GenerationRow.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/tree/GenerationRow.test.tsx`:

```tsx
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
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- GenerationRow.test.tsx`
Expected: FAIL — `Cannot find module './GenerationRow'`

- [ ] **Step 3: CSS 모듈 작성**

`src/components/tree/GenerationRow.module.css`:

```css
.row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-radius: 12px;
}

.row[data-palette="1"] { background: #fef6e4; }
.row[data-palette="2"] { background: #e8f3f1; }
.row[data-palette="3"] { background: #f1eaf6; }
.row[data-palette="4"] { background: #eef4e8; }
.row[data-palette="5"] { background: #f6ece9; }

.label {
  flex-shrink: 0;
  font-size: 1.1rem;
  font-weight: 700;
  padding: 0.5rem 1rem;
}

.cards {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding: 0.5rem;
}
```

- [ ] **Step 4: GenerationRow 구현**

`src/components/tree/GenerationRow.tsx`:

```tsx
import type { Member } from "@/lib/members/schema";
import { PersonCard } from "./PersonCard";
import styles from "./GenerationRow.module.css";

const PALETTE_SIZE = 5;

export function GenerationRow({ generation, members }: { generation: number; members: Member[] }) {
  const paletteIndex = ((generation - 1) % PALETTE_SIZE) + 1;

  return (
    <section className={styles.row} data-generation={generation} data-palette={paletteIndex}>
      <span className={styles.label}>{generation}대</span>
      <div className={styles.cards}>
        {members.map((member) => (
          <PersonCard key={member.id} member={member} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test -- GenerationRow.test.tsx`
Expected: PASS (1 passed)

- [ ] **Step 6: 커밋**

```bash
git add src/components/tree/GenerationRow.tsx src/components/tree/GenerationRow.module.css src/components/tree/GenerationRow.test.tsx
git commit -m "$(cat <<'EOF'
Add GenerationRow with per-generation background color

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: TreeCanvas 컴포넌트 (부모-자녀 연결선)

**Files:**
- Create: `src/components/tree/TreeCanvas.tsx`
- Create: `src/components/tree/TreeCanvas.module.css`
- Test: `src/components/tree/TreeCanvas.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/tree/TreeCanvas.test.tsx`:

```tsx
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
  it("draws one connector line per resolvable parent-child pair, and none for an orphan", () => {
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
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- TreeCanvas.test.tsx`
Expected: FAIL — `Cannot find module './TreeCanvas'`

- [ ] **Step 3: CSS 모듈 작성**

`src/components/tree/TreeCanvas.module.css`:

```css
.canvas {
  position: relative;
}

.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.line {
  stroke: #999999;
  stroke-width: 2;
}
```

- [ ] **Step 4: TreeCanvas 구현**

`src/components/tree/TreeCanvas.tsx`:

```tsx
"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Member } from "@/lib/members/schema";
import { GenerationRow } from "./GenerationRow";
import styles from "./TreeCanvas.module.css";

export interface GenerationRowData {
  generation: number;
  members: Member[];
}

interface Line {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

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
        if (!member.parentId || !membersById.has(member.parentId)) continue;

        const childEl = container.querySelector(`[data-person-id="${member.id}"]`);
        const parentEl = container.querySelector(`[data-person-id="${member.parentId}"]`);
        if (!(childEl instanceof HTMLElement) || !(parentEl instanceof HTMLElement)) continue;

        const childRect = childEl.getBoundingClientRect();
        const parentRect = parentEl.getBoundingClientRect();

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
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test -- TreeCanvas.test.tsx`
Expected: PASS (1 passed)

- [ ] **Step 6: 커밋**

```bash
git add src/components/tree/TreeCanvas.tsx src/components/tree/TreeCanvas.module.css src/components/tree/TreeCanvas.test.tsx
git commit -m "$(cat <<'EOF'
Add TreeCanvas with measured parent-child connector lines

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: 트리 페이지 연결 + 루트 리다이렉트

**Files:**
- Create: `src/lib/auth/getSession.ts`
- Create: `src/app/tree/page.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: getSession 헬퍼 작성**

`src/lib/auth/getSession.ts`:

```ts
import { cookies } from "next/headers";
import { verifySessionToken, type SessionPayload } from "@/lib/auth/session";

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
```

- [ ] **Step 2: 트리 페이지 작성**

`src/app/tree/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/getSession";
import { loadMembersFromDisk } from "@/lib/members/load";
import { buildForest, groupByGeneration } from "@/lib/members/forest";
import { TreeCanvas } from "@/components/tree/TreeCanvas";

export default async function TreePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const members = loadMembersFromDisk();
  const forest = buildForest(members);
  const rowsMap = groupByGeneration(forest);
  const rows = Array.from(rowsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([generation, rowMembers]) => ({ generation, members: rowMembers }));

  return (
    <main>
      <h1>김해 김씨 문중 명부</h1>
      <TreeCanvas rows={rows} members={members} />
    </main>
  );
}
```

- [ ] **Step 3: 루트 페이지를 리다이렉트로 교체**

`src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/getSession";

export default async function HomePage() {
  const session = await getSession();
  redirect(session ? "/tree" : "/login");
}
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: `Compiled successfully`

- [ ] **Step 5: 수동 확인 (전체 흐름)**

Run: `npm run dev`
브라우저에서 `/` 접속 → `/login`으로 리다이렉트 확인 → 시드 관리자 정보(세대 1, 이름 `관리자 이름을 입력하세요`, 연락처 `01000000000`)로 로그인 → `/tree`로 이동하며 "1대" 행에 카드 1개가 보이는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/auth/getSession.ts src/app/tree src/app/page.tsx
git commit -m "$(cat <<'EOF'
Wire tree page to session + data layer, redirect root by login state

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: 배포 준비 (환경변수 문서화 + README)

**Files:**
- Create: `.env.local.example`
- Create: `README.md`

- [ ] **Step 1: .env.local.example 작성**

```
SESSION_JWT_SECRET=replace-with-a-long-random-string
```

- [ ] **Step 2: README.md 작성**

```markdown
# 김해 김씨 문중 명부

세대별로 인물을 정리하고, 같은 세대를 가로 한 줄로 나란히 보여주는 가계도 트리 뷰 웹앱입니다.

## 로컬 실행

1. `npm install`
2. `.env.local.example`을 복사해 `.env.local`을 만들고 `SESSION_JWT_SECRET`에 임의의 긴 문자열을 넣습니다.
3. `data/members.json`의 시드 관리자 레코드(`name`, `phone`)를 실제 정보로 교체합니다.
4. `npm run dev` 후 http://localhost:3000 접속.

## 테스트

`npm test`

## Vercel 배포

1. 이 저장소를 Vercel 프로젝트로 연결합니다.
2. Vercel 프로젝트 환경변수에 `SESSION_JWT_SECRET`을 등록합니다.
3. `main` 브랜치에 push하면 자동으로 재배포됩니다(데이터 파일이 git에 커밋되어 있으므로, 데이터 변경도 push만으로 반영됩니다).

## 범위

이 버전은 로그인(세대+이름+연락처 대조)과 세대별 트리 뷰 조회까지만 구현되어 있습니다. 가족 구성원의 등록/수정 요청, 관리자 승인 화면, 회원관리, 검색/확대축소 같은 기능은 후속 계획(Plan B, Plan C)에서 추가됩니다.
```

- [ ] **Step 3: 커밋 및 푸시**

```bash
git add .env.local.example README.md
git commit -m "$(cat <<'EOF'
Add deployment docs and env var example

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
git push
```
