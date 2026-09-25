# 등록/승인 워크플로우 (Plan B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 없이 누구나 세대+이름+연락처로 "회원가입 신청"을 할 수 있고, owner(김재현)/admin이 그 신청을 검토해 승인하면 그 사람이 로그인할 수 있게 한다. owner만 다른 사람에게 admin 권한을 부여/회수할 수 있는 회원관리 화면도 함께 만든다.

**Architecture:** Plan A의 기반(세션/로그인/트리 뷰) 위에 쌓는다. 새로 추가되는 쓰기 경로(등록 신청 제출, 승인, 회원관리 직접 수정)는 모두 GitHub REST API(Octokit)를 통해 `data/members.json`과 `data/pending/*.json`에 커밋하는 서버 액션으로 구현한다. 읽기는 계속 `fs`로 번들에서 직접 읽는다(Plan A와 동일 패턴). 이번 Plan은 **한 번에 한 명씩** 등록 신청 → 승인하는 단순한 구조로 한정한다(설계 문서의 "여러 명을 한 세션에 모아 한 번에 승인 요청" 방식은 범위 밖 — 필요해지면 후속 계획에서 추가).

**Tech Stack:** 기존(Next.js, TypeScript, zod, jose, Vitest)에 `octokit`(GitHub REST API 클라이언트) 추가.

**이 계획의 범위:** 설계 문서(`docs/superpowers/specs/2026-09-21-family-tree-design.md`)의 3장 `role` owner/admin 구분, 4장 세대 선택 로그인, 5-1장(단일 항목으로 단순화), 6장(단일 항목 승인/거절로 단순화), 6-1장(회원관리, role은 owner 전용)을 다룬다. "자녀로 추가"(부모 선택 후 자동 세대계산), 여러 건을 세션에 모아 한 번에 제출하는 배치 흐름, 검색/확대축소는 이 계획 밖이다.

---

## 파일 구조

```
KimHouse/
  data/
    members.json                        # 시드 교체: 김재현(owner) 실제 정보
  src/
    lib/
      members/
        schema.ts                       # 수정: role을 "admin" | "owner" enum으로 확장
        schema.test.ts                  # 수정: role enum 테스트 추가
        pending.ts                      # 신규: PendingRequest 스키마 + parsePendingRequest
        pending.test.ts
      auth/
        login.ts                        # 수정: generation optional, admin/owner는 생략 가능
        login.test.ts                   # 수정: 관련 테스트 추가
        requireElevatedRole.ts          # 신규: 세션이 admin/owner인지 확인하는 가드 헬퍼
        requireElevatedRole.test.ts
      github/
        client.ts                       # 신규: Octokit 래퍼 (파일 읽기/커밋)
        client.test.ts                  # 신규: Octokit mock 테스트
    app/
      login/
        actions.ts                      # 수정: generation optional 처리
        LoginForm.tsx                   # 수정: 세대 입력칸 선택 표시
        LoginForm.test.tsx              # 수정
      register/
        page.tsx                        # 신규: 공개 회원가입 신청 폼 페이지 (로그인 불필요)
        RegisterForm.tsx                # 신규
        RegisterForm.test.tsx           # 신규
        actions.ts                      # 신규: pending 파일 커밋 서버 액션
      admin/
        layout.tsx                      # 신규: admin/owner 세션 가드
        approvals/
          page.tsx                      # 신규: 대기 목록 + 승인/거절
          actions.ts                    # 신규: 승인/거절 서버 액션
        members/
          page.tsx                      # 신규: 회원관리 목록/추가/수정/삭제
          actions.ts                    # 신규: 직접 쓰기 서버 액션 (role 필드는 owner만)
    components/
      admin/
        PendingRequestRow.tsx           # 신규
        PendingRequestRow.module.css
        MemberRow.tsx                   # 신규 (회원관리 목록 한 줄)
        MemberRow.module.css
```

---

### Task 1: `role` 필드를 owner/admin 2단계로 확장

**Files:**
- Modify: `src/lib/members/schema.ts`
- Modify: `src/lib/members/schema.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`src/lib/members/schema.test.ts`에 아래 테스트를 `describe("parseMembers", ...)` 블록 안에 추가:

```ts
it("role에 admin과 owner를 모두 허용한다", () => {
  const raw = JSON.stringify([
    { id: "a1", name: "관리자", generation: 1, parentId: null, role: "admin" },
    { id: "a2", name: "소유자", generation: 1, parentId: null, role: "owner" },
  ]);

  const members = parseMembers(raw);

  expect(members[0].role).toBe("admin");
  expect(members[1].role).toBe("owner");
});

it("role에 admin/owner가 아닌 값이 오면 거부한다", () => {
  const raw = JSON.stringify([
    { id: "a1", name: "이상한값", generation: 1, parentId: null, role: "superuser" },
  ]);

  expect(() => parseMembers(raw)).toThrow();
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- schema.test.ts`
Expected: FAIL — `role: "owner"`가 기존 `z.literal("admin")` 스키마에 막혀 검증 에러 발생.

- [ ] **Step 3: 스키마 수정**

`src/lib/members/schema.ts`에서 `memberSchema`의 `role` 줄을 찾아 교체:

```ts
role: z.enum(["admin", "owner"]).optional(),
```

파일 상단에 `role`이 의미하는 두 등급을 설명하는 한국어 주석을 추가한다(owner만 다른 사람의 role을 바꿀 수 있음).

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- schema.test.ts`
Expected: PASS (5 passed — 기존 3개 + 신규 2개)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/members/schema.ts src/lib/members/schema.test.ts
git commit -m "$(cat <<'EOF'
Extend role field to admin/owner tiers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 로그인 시 세대 선택 입력 (admin/owner는 생략 가능)

**Files:**
- Modify: `src/lib/auth/login.ts`
- Modify: `src/lib/auth/login.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`src/lib/auth/login.test.ts`의 `members` 배열에 admin 레코드를 하나 추가하고, `describe("findMatchingMember", ...)` 안에 테스트를 추가:

```ts
const members: Member[] = [
  { id: "m1", name: "김철수", generation: 3, parentId: null, phone: "010-1111-2222" },
  { id: "m2", name: "김영희", generation: 4, parentId: "m1" },
  { id: "m3", name: "김재현", generation: 1, parentId: null, phone: "010-7488-9333", role: "owner" },
];
```

(기존 `m1`, `m2`를 쓰는 테스트들은 그대로 두고, `m3`만 추가.)

```ts
it("admin/owner는 세대를 입력하지 않아도 이름+연락처만 일치하면 매칭된다", () => {
  const match = findMatchingMember(members, {
    name: "김재현",
    phone: "01074889333",
  });

  expect(match?.id).toBe("m3");
});

it("세대를 생략했을 때 일반 회원(admin/owner가 아님)은 매칭되지 않는다", () => {
  const match = findMatchingMember(members, {
    name: "김철수",
    phone: "01011112222",
  });

  expect(match).toBeNull();
});

it("세대를 입력하면 admin/owner도 기존처럼 세대까지 일치해야 매칭된다", () => {
  const wrongGeneration = findMatchingMember(members, {
    generation: 99,
    name: "김재현",
    phone: "01074889333",
  });

  expect(wrongGeneration).toBeNull();

  const correctGeneration = findMatchingMember(members, {
    generation: 1,
    name: "김재현",
    phone: "01074889333",
  });

  expect(correctGeneration?.id).toBe("m3");
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- login.test.ts`
Expected: FAIL — `LoginInput`의 `generation`이 아직 필수라 타입 에러가 나거나, 세대 생략 시 매칭 로직이 없어 실패.

- [ ] **Step 3: 구현 수정**

`src/lib/auth/login.ts`:

```ts
import type { Member } from "@/lib/members/schema";
import { normalizePhone } from "@/lib/phone";

export interface LoginInput {
  generation?: number;
  name: string;
  phone: string;
}

function isElevatedRole(member: Member): boolean {
  return member.role === "admin" || member.role === "owner";
}

export function findMatchingMember(members: Member[], input: LoginInput): Member | null {
  const inputPhone = normalizePhone(input.phone);
  if (!inputPhone) return null;

  const match = members.find((member) => {
    if (!member.phone) return false;
    if (member.name !== input.name) return false;
    if (normalizePhone(member.phone) !== inputPhone) return false;

    if (input.generation !== undefined) {
      return member.generation === input.generation;
    }

    // 세대를 입력하지 않은 경우: admin/owner만 매칭 대상 (일반 회원은 항렬자 동명이인
    // 구분을 위해 세대가 반드시 필요하다 — 설계 문서 4장)
    return isElevatedRole(member);
  });

  return match ?? null;
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- login.test.ts`
Expected: PASS (7 passed — 기존 4개 + 신규 3개)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/auth/login.ts src/lib/auth/login.test.ts
git commit -m "$(cat <<'EOF'
Allow admin/owner login without entering generation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 로그인 폼에서 세대 입력칸을 선택 항목으로 표시

**Files:**
- Modify: `src/app/login/actions.ts`
- Modify: `src/app/login/LoginForm.tsx`
- Modify: `src/app/login/LoginForm.test.tsx`

- [ ] **Step 1: LoginForm 테스트에 라벨 문구 확인 추가**

`src/app/login/LoginForm.test.tsx`의 기존 테스트에서 세대 라벨 텍스트를 찾는 부분을 아래로 교체 (정확히 일치하는 텍스트 대신, "세대"로 시작하는지 확인하는 정규식 사용):

```tsx
expect(screen.getByLabelText(/^세대/)).toBeInTheDocument();
```

(다른 assertion은 그대로 둔다.)

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- LoginForm.test.tsx`
Expected: FAIL — 현재 라벨은 정확히 "세대"뿐이라 `getByLabelText("세대")`는 통과하지만, 이번 스텝에서 라벨 문구를 바꿀 예정이므로 이 단계에서는 아직 실패하지 않을 수 있다. 만약 통과한다면 그대로 다음 스텝으로 진행해도 무방하다(정규식이 "세대"로 시작하는 문자열과 여전히 매칭되므로).

- [ ] **Step 3: LoginForm 수정 — 세대 입력칸에 "(선택, 관리자만 생략 가능)" 안내 추가, required 제거**

`src/app/login/LoginForm.tsx`의 세대 `<label>` 블록을 교체:

```tsx
<label>
  세대 (선택 — 관리자는 생략 가능)
  <input name="generation" type="number" inputMode="numeric" />
</label>
```

(`required` 속성을 제거한다. 이름/연락처 입력칸은 그대로 `required` 유지.)

- [ ] **Step 4: 서버 액션 수정 — generation 빈 값 허용**

`src/app/login/actions.ts`의 `loginAction`에서 검증/호출 부분을 교체:

```ts
export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const generationRaw = formData.get("generation");
  const name = formData.get("name");
  const phone = formData.get("phone");

  if (typeof name !== "string" || !name.trim() || typeof phone !== "string" || !phone.trim()) {
    return { error: "이름과 연락처를 입력해 주세요." };
  }

  let generation: number | undefined;
  if (generationRaw && String(generationRaw).trim()) {
    const parsed = Number(generationRaw);
    if (Number.isNaN(parsed)) {
      return { error: "세대는 숫자로 입력해 주세요." };
    }
    generation = parsed;
  }

  const members = loadMembersFromDisk();
  const match = findMatchingMember(members, { generation, name: name.trim(), phone });

  if (!match) {
    return { error: "일치하는 정보를 찾을 수 없습니다. 세대·이름·연락처를 다시 확인해 주세요." };
  }

  const token = await createSessionToken({ memberId: match.id, role: match.role });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/tree");
}
```

(import 구문은 기존 그대로 두되, `SESSION_COOKIE_NAME`을 `@/lib/auth/session`에서 이미 import하고 있는지 확인하고 없으면 추가한다.)

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test -- LoginForm.test.tsx`
Expected: PASS (1 passed)

- [ ] **Step 6: 회귀 확인**

Run: `npm test`
Expected: 이전 태스크까지의 테스트 전부 통과.

- [ ] **Step 7: 커밋**

```bash
git add src/app/login/actions.ts src/app/login/LoginForm.tsx src/app/login/LoginForm.test.tsx
git commit -m "$(cat <<'EOF'
Make generation field optional on the login form

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 시드 데이터를 실제 owner(김재현)로 교체

**Files:**
- Modify: `data/members.json`

- [ ] **Step 1: 시드 데이터 교체**

`data/members.json`을 아래 내용으로 교체:

```json
[
  {
    "id": "seed-owner-kimjaehyun",
    "name": "김재현",
    "generation": 1,
    "parentId": null,
    "role": "owner",
    "phone": "01074889333"
  }
]
```

> 참고: 정확한 세대(몇 대손)를 아직 모르므로 1로 임시 등록했다. 실제 조상 계보가 확인되면 나중에 회원관리 화면(Task 12)에서 직접 수정하면 된다.

- [ ] **Step 2: 로컬 검증**

Run: `npm test -- load.test.ts`
Expected: PASS — `loadMembersFromDisk()`가 이 레코드를 읽고 `role === "admin"`이 있는지 확인하던 기존 테스트가, 이제 `role === "owner"`도 있다는 걸 반영해야 한다면 `src/lib/members/load.test.ts`의 assertion을 아래로 교체한다:

```ts
expect(members.some((member) => member.role === "admin" || member.role === "owner")).toBe(true);
```

- [ ] **Step 3: 전체 테스트 확인**

Run: `npm test`
Expected: 전부 통과.

- [ ] **Step 4: 커밋**

```bash
git add data/members.json src/lib/members/load.test.ts
git commit -m "$(cat <<'EOF'
Replace placeholder seed with real owner record

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: GitHub API 클라이언트 (Octokit 래퍼)

**Files:**
- Create: `src/lib/github/client.ts`
- Test: `src/lib/github/client.test.ts`

- [ ] **Step 1: octokit 설치**

Run: `npm install octokit`

- [ ] **Step 2: 실패하는 테스트 작성**

`src/lib/github/client.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetContent = vi.fn();
const mockCreateOrUpdateFileContents = vi.fn();
const mockDeleteFile = vi.fn();

// Octokit은 실제 클래스라 new로 생성되므로, 화살표 함수는 생성자로 쓸 수 없다
// (arrow function에는 [[Construct]]가 없어 `new`와 함께 쓰면 TypeError가 난다).
// 반드시 일반 function으로 mock 구현체를 작성해야 한다.
vi.mock("octokit", () => ({
  Octokit: vi.fn().mockImplementation(function () {
    return {
      rest: {
        repos: {
          getContent: mockGetContent,
          createOrUpdateFileContents: mockCreateOrUpdateFileContents,
          deleteFile: mockDeleteFile,
        },
      },
    };
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GITHUB_TOKEN = "test-token";
  process.env.GITHUB_OWNER = "bawo3";
  process.env.GITHUB_REPO = "KimHouse";
  process.env.GITHUB_BRANCH = "main";
});

describe("commitFile", () => {
  it("기존 파일이 없으면 sha 없이 새로 커밋한다", async () => {
    mockGetContent.mockRejectedValue({ status: 404 });
    mockCreateOrUpdateFileContents.mockResolvedValue({});

    const { commitFile } = await import("./client");
    await commitFile("data/pending/req-1.json", '{"hello":"world"}', "add pending request");

    expect(mockCreateOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "bawo3",
        repo: "KimHouse",
        path: "data/pending/req-1.json",
        message: "add pending request",
        branch: "main",
        sha: undefined,
      })
    );
  });

  it("기존 파일이 있으면 sha를 함께 보내 덮어쓴다", async () => {
    mockGetContent.mockResolvedValue({ data: { sha: "abc123" } });
    mockCreateOrUpdateFileContents.mockResolvedValue({});

    const { commitFile } = await import("./client");
    await commitFile("data/members.json", "[]", "update members");

    expect(mockCreateOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({ sha: "abc123" })
    );
  });
});

describe("deleteFileIfExists", () => {
  it("파일이 있으면 삭제한다", async () => {
    mockGetContent.mockResolvedValue({ data: { sha: "def456" } });
    mockDeleteFile.mockResolvedValue({});

    const { deleteFileIfExists } = await import("./client");
    await deleteFileIfExists("data/pending/req-1.json", "approve request");

    expect(mockDeleteFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: "data/pending/req-1.json", sha: "def456" })
    );
  });

  it("파일이 없으면 조용히 아무 것도 하지 않는다", async () => {
    mockGetContent.mockRejectedValue({ status: 404 });

    const { deleteFileIfExists } = await import("./client");
    await deleteFileIfExists("data/pending/missing.json", "no-op");

    expect(mockDeleteFile).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `npm test -- client.test.ts`
Expected: FAIL — `Cannot find module './client'`

- [ ] **Step 4: 구현**

`src/lib/github/client.ts`:

```ts
import { Octokit } from "octokit";

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token || !owner || !repo) {
    throw new Error(
      "GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO 환경변수가 모두 설정되어야 GitHub API를 쓸 수 있습니다."
    );
  }

  return { octokit: new Octokit({ auth: token }), owner, repo, branch };
}

async function getExistingSha(path: string): Promise<string | undefined> {
  const { octokit, owner, repo, branch } = getConfig();
  try {
    const response = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
    const data = response.data as { sha?: string };
    return data.sha;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return undefined;
    throw error;
  }
}

export async function commitFile(path: string, content: string, message: string): Promise<void> {
  const { octokit, owner, repo, branch } = getConfig();
  const sha = await getExistingSha(path);

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    branch,
    sha,
    content: Buffer.from(content, "utf-8").toString("base64"),
  });
}

export async function deleteFileIfExists(path: string, message: string): Promise<void> {
  const { octokit, owner, repo, branch } = getConfig();
  const sha = await getExistingSha(path);
  if (!sha) return;

  await octokit.rest.repos.deleteFile({ owner, repo, path, message, branch, sha });
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test -- client.test.ts`
Expected: PASS (4 passed)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/github/client.ts src/lib/github/client.test.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add Octokit-backed GitHub commit/delete client

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: pending 요청 스키마 + 로더

**Files:**
- Create: `src/lib/members/pending.ts`
- Test: `src/lib/members/pending.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/members/pending.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parsePendingRequest, pendingRequestSchema } from "@/lib/members/pending";

describe("parsePendingRequest", () => {
  it("필수 항목(이름, 세대)만 있어도 파싱된다", () => {
    const raw = JSON.stringify({
      id: "req-1",
      submittedAt: "2026-09-25T00:00:00.000Z",
      member: { name: "김삼순", generation: 5, parentId: null },
    });

    const request = parsePendingRequest(raw);

    expect(request.member.name).toBe("김삼순");
    expect(request.member.generation).toBe(5);
  });

  it("member에 role 필드가 섞여 있으면 파싱 단계에서 제거한다", () => {
    const raw = JSON.stringify({
      id: "req-2",
      submittedAt: "2026-09-25T00:00:00.000Z",
      member: { name: "위험한사용자", generation: 1, parentId: null, role: "owner" },
    });

    const request = parsePendingRequest(raw);

    expect(request.member.role).toBeUndefined();
  });

  it("이름이 없으면 거부한다", () => {
    const raw = JSON.stringify({
      id: "req-3",
      submittedAt: "2026-09-25T00:00:00.000Z",
      member: { generation: 1, parentId: null },
    });

    expect(() => parsePendingRequest(raw)).toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- pending.test.ts`
Expected: FAIL — `Cannot find module '@/lib/members/pending'`

- [ ] **Step 3: 구현**

`src/lib/members/pending.ts`:

```ts
import { z } from "zod";
import { spouseSchema } from "@/lib/members/schema";

// pending 요청은 아직 정식 id가 없는 "등록 신청" 상태의 인물 정보다.
// role은 절대 신청자가 직접 지정할 수 없어야 하므로(권한 상승 방지),
// 이 스키마에는 role 필드를 아예 정의하지 않는다 — 혹시 섞여 들어와도
// zod의 기본 strip 동작으로 조용히 제거된다.
const pendingMemberSchema = z.object({
  name: z.string().min(1),
  generation: z.number().int().positive(),
  parentId: z.string().min(1).nullable(),
  birthDate: z.string().optional(),
  hanjaName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  deathDate: z.string().optional(),
  spouse: spouseSchema.optional(),
});

export const pendingRequestSchema = z.object({
  id: z.string().min(1),
  submittedAt: z.string().min(1),
  member: pendingMemberSchema,
});

export type PendingMember = z.infer<typeof pendingMemberSchema>;
export type PendingRequest = z.infer<typeof pendingRequestSchema>;

export function parsePendingRequest(raw: string): PendingRequest {
  const json = JSON.parse(raw);
  return pendingRequestSchema.parse(json);
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- pending.test.ts`
Expected: PASS (3 passed)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/members/pending.ts src/lib/members/pending.test.ts
git commit -m "$(cat <<'EOF'
Add pending registration request schema (role field excluded)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 대기 요청 목록 로더 (디스크에서 pending 폴더 읽기)

**Files:**
- Create: `src/lib/members/loadPending.ts`
- Test: `src/lib/members/loadPending.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/members/loadPending.test.ts`:

```ts
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadPendingRequestsFromDisk } from "@/lib/members/loadPending";

const PENDING_DIR = join(process.cwd(), "data", "pending");

beforeEach(() => {
  mkdirSync(PENDING_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(PENDING_DIR, { recursive: true, force: true });
});

describe("loadPendingRequestsFromDisk", () => {
  it("pending 폴더가 비어 있으면 빈 배열을 반환한다", () => {
    expect(loadPendingRequestsFromDisk()).toEqual([]);
  });

  it("pending 폴더의 모든 요청 파일을 읽어 반환한다", () => {
    writeFileSync(
      join(PENDING_DIR, "req-1.json"),
      JSON.stringify({
        id: "req-1",
        submittedAt: "2026-09-25T00:00:00.000Z",
        member: { name: "김삼순", generation: 5, parentId: null },
      }),
      "utf-8"
    );

    const requests = loadPendingRequestsFromDisk();

    expect(requests).toHaveLength(1);
    expect(requests[0].member.name).toBe("김삼순");
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- loadPending.test.ts`
Expected: FAIL — `Cannot find module '@/lib/members/loadPending'`

- [ ] **Step 3: 구현**

`src/lib/members/loadPending.ts`:

```ts
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parsePendingRequest, type PendingRequest } from "@/lib/members/pending";

const PENDING_DIR_PATH = join(process.cwd(), "data", "pending");

export function loadPendingRequestsFromDisk(): PendingRequest[] {
  if (!existsSync(PENDING_DIR_PATH)) return [];

  const files = readdirSync(PENDING_DIR_PATH).filter((file) => file.endsWith(".json"));

  return files.map((file) => {
    const raw = readFileSync(join(PENDING_DIR_PATH, file), "utf-8");
    return parsePendingRequest(raw);
  });
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- loadPending.test.ts`
Expected: PASS (2 passed)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/members/loadPending.ts src/lib/members/loadPending.test.ts
git commit -m "$(cat <<'EOF'
Add disk loader for pending registration requests

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 권한 가드 헬퍼 (admin/owner만 통과)

**Files:**
- Create: `src/lib/auth/requireElevatedRole.ts`
- Test: `src/lib/auth/requireElevatedRole.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/auth/requireElevatedRole.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isElevatedRole } from "@/lib/auth/requireElevatedRole";
import type { SessionPayload } from "@/lib/auth/session";

describe("isElevatedRole", () => {
  it("role이 admin이면 true", () => {
    expect(isElevatedRole({ memberId: "m1", role: "admin" })).toBe(true);
  });

  it("role이 owner이면 true", () => {
    expect(isElevatedRole({ memberId: "m1", role: "owner" })).toBe(true);
  });

  it("role이 없으면 false", () => {
    expect(isElevatedRole({ memberId: "m1" })).toBe(false);
  });

  it("세션 자체가 없으면(null) false", () => {
    expect(isElevatedRole(null)).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- requireElevatedRole.test.ts`
Expected: FAIL — `Cannot find module '@/lib/auth/requireElevatedRole'`

- [ ] **Step 3: `SessionPayload`에 role 타입 확장**

`src/lib/auth/session.ts`에서 `SessionPayload` 인터페이스를 찾아 교체:

```ts
export interface SessionPayload {
  memberId: string;
  role?: "admin" | "owner";
}
```

그리고 `verifySessionToken`의 role 판별 부분도 교체:

```ts
role:
  payload.role === "admin" || payload.role === "owner"
    ? (payload.role as "admin" | "owner")
    : undefined,
```

- [ ] **Step 4: `isElevatedRole` 구현**

`src/lib/auth/requireElevatedRole.ts`:

```ts
import type { SessionPayload } from "@/lib/auth/session";

export function isElevatedRole(session: SessionPayload | null): boolean {
  if (!session) return false;
  return session.role === "admin" || session.role === "owner";
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test -- requireElevatedRole.test.ts`
Expected: PASS (4 passed)

- [ ] **Step 6: 전체 회귀 확인**

Run: `npm test`
Expected: 전부 통과 (session.ts의 타입 변경이 기존 admin 전용 테스트를 깨지 않는지 확인).

- [ ] **Step 7: 커밋**

```bash
git add src/lib/auth/requireElevatedRole.ts src/lib/auth/requireElevatedRole.test.ts src/lib/auth/session.ts
git commit -m "$(cat <<'EOF'
Add isElevatedRole guard helper and widen session role type

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: 공개 회원가입 신청 폼 (로그인 불필요)

**Files:**
- Create: `src/app/register/actions.ts`
- Create: `src/app/register/RegisterForm.tsx`
- Test: `src/app/register/RegisterForm.test.tsx`
- Create: `src/app/register/page.tsx`

- [ ] **Step 1: 서버 액션 작성**

`src/app/register/actions.ts`:

```ts
"use server";

import { randomUUID } from "node:crypto";
import { commitFile } from "@/lib/github/client";

export interface RegisterFormState {
  error?: string;
  success?: boolean;
}

export async function registerAction(
  _prevState: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  const name = formData.get("name");
  const generationRaw = formData.get("generation");
  const phone = formData.get("phone");

  if (typeof name !== "string" || !name.trim()) {
    return { error: "이름을 입력해 주세요." };
  }

  const generation = Number(generationRaw);
  if (!generationRaw || Number.isNaN(generation) || generation <= 0) {
    return { error: "세대를 올바르게 입력해 주세요." };
  }

  if (typeof phone !== "string" || !phone.trim()) {
    return { error: "연락처를 입력해 주세요. 연락처가 있어야 나중에 로그인할 수 있습니다." };
  }

  const id = randomUUID();
  const request = {
    id,
    submittedAt: new Date().toISOString(),
    member: {
      name: name.trim(),
      generation,
      parentId: null,
      phone: phone.trim(),
    },
  };

  await commitFile(
    `data/pending/${id}.json`,
    JSON.stringify(request, null, 2),
    `Add registration request for ${name.trim()}`
  );

  return { success: true };
}
```

- [ ] **Step 2: RegisterForm에 대한 실패하는 테스트 작성**

`src/app/register/RegisterForm.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RegisterForm } from "./RegisterForm";

vi.mock("./actions", () => ({
  registerAction: vi.fn(),
}));

describe("RegisterForm", () => {
  it("이름, 세대, 연락처 입력칸과 제출 버튼을 렌더링한다", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText("이름")).toBeInTheDocument();
    expect(screen.getByLabelText("세대")).toBeInTheDocument();
    expect(screen.getByLabelText("연락처")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "가입 신청" })).toBeInTheDocument();
  });

  it("role 입력칸은 없다 (권한 상승 방지)", () => {
    render(<RegisterForm />);

    expect(screen.queryByLabelText(/역할|권한|role/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `npm test -- RegisterForm.test.tsx`
Expected: FAIL — `Cannot find module './RegisterForm'`

- [ ] **Step 4: RegisterForm 구현**

`src/app/register/RegisterForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { registerAction, type RegisterFormState } from "./actions";

const initialState: RegisterFormState = {};

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState);

  if (state.success) {
    return <p role="status">가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.</p>;
  }

  return (
    <form action={formAction}>
      <label>
        이름
        <input name="name" type="text" required />
      </label>
      <label>
        세대
        <input name="generation" type="number" inputMode="numeric" required />
      </label>
      <label>
        연락처
        <input name="phone" type="tel" required />
      </label>
      {state.error && <p role="alert">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "제출 중..." : "가입 신청"}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test -- RegisterForm.test.tsx`
Expected: PASS (2 passed)

- [ ] **Step 6: 회원가입 신청 페이지 작성**

`src/app/register/page.tsx`:

```tsx
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <main>
      <h1>회원가입 신청</h1>
      <p>이름, 세대, 연락처를 입력해 주세요. 관리자가 승인하면 로그인할 수 있습니다.</p>
      <RegisterForm />
    </main>
  );
}
```

- [ ] **Step 7: 커밋**

```bash
git add src/app/register
git commit -m "$(cat <<'EOF'
Add public registration request form

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: admin 영역 레이아웃 (권한 가드)

**Files:**
- Create: `src/app/admin/layout.tsx`

- [ ] **Step 1: 레이아웃 구현**

`src/app/admin/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/getSession";
import { isElevatedRole } from "@/lib/auth/requireElevatedRole";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!isElevatedRole(session)) {
    redirect("/login");
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: `Compiled successfully` (이 시점엔 `/admin` 아래 실제 page.tsx가 아직 없어도 layout만으로는 라우트가 생기지 않으므로 빌드에 영향 없음 — Task 11/12에서 페이지가 추가되면 이 레이아웃이 적용된다).

- [ ] **Step 3: 커밋**

```bash
git add src/app/admin/layout.tsx
git commit -m "$(cat <<'EOF'
Add admin route guard requiring elevated role

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: 승인 화면 (대기 목록 + 승인/거절)

**Files:**
- Create: `src/app/admin/approvals/actions.ts`
- Create: `src/app/admin/approvals/page.tsx`
- Create: `src/components/admin/PendingRequestRow.tsx`
- Create: `src/components/admin/PendingRequestRow.module.css`

- [ ] **Step 1: 승인/거절 서버 액션 작성**

`src/app/admin/approvals/actions.ts`:

```ts
"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { commitFile, deleteFileIfExists } from "@/lib/github/client";
import { loadMembersFromDisk } from "@/lib/members/load";
import { loadPendingRequestsFromDisk } from "@/lib/members/loadPending";
import { getSession } from "@/lib/auth/getSession";
import { isElevatedRole } from "@/lib/auth/requireElevatedRole";

async function assertElevated(): Promise<void> {
  const session = await getSession();
  if (!isElevatedRole(session)) {
    throw new Error("권한이 없습니다.");
  }
}

export async function approveRequestAction(requestId: string): Promise<void> {
  await assertElevated();

  const requests = loadPendingRequestsFromDisk();
  const request = requests.find((item) => item.id === requestId);
  if (!request) throw new Error("이미 처리된 요청입니다.");

  const members = loadMembersFromDisk();
  const newMember = { id: randomUUID(), ...request.member };
  const updatedMembers = [...members, newMember];

  await commitFile(
    "data/members.json",
    JSON.stringify(updatedMembers, null, 2),
    `Approve registration request for ${request.member.name}`
  );
  await deleteFileIfExists(
    `data/pending/${request.id}.json`,
    `Remove approved request for ${request.member.name}`
  );

  revalidatePath("/admin/approvals");
}

export async function rejectRequestAction(requestId: string): Promise<void> {
  await assertElevated();

  const requests = loadPendingRequestsFromDisk();
  const request = requests.find((item) => item.id === requestId);
  if (!request) return;

  await deleteFileIfExists(
    `data/pending/${request.id}.json`,
    `Reject registration request for ${request.member.name}`
  );

  revalidatePath("/admin/approvals");
}
```

- [ ] **Step 2: PendingRequestRow 컴포넌트 작성 (테스트 없이, 순수 표시용)**

`src/components/admin/PendingRequestRow.module.css`:

```css
.row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid #d0d0d0;
  border-radius: 10px;
  margin-bottom: 0.5rem;
}

.info {
  flex: 1;
}

.name {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.detail {
  font-size: 0.85rem;
  color: #555555;
  margin: 0.15rem 0 0;
}

.actions {
  display: flex;
  gap: 0.5rem;
}
```

`src/components/admin/PendingRequestRow.tsx`:

```tsx
import type { PendingRequest } from "@/lib/members/pending";
import { approveRequestAction, rejectRequestAction } from "@/app/admin/approvals/actions";
import styles from "./PendingRequestRow.module.css";

export function PendingRequestRow({ request }: { request: PendingRequest }) {
  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <p className={styles.name}>{request.member.name}</p>
        <p className={styles.detail}>
          {request.member.generation}대손 · {request.member.phone ?? "연락처 없음"}
        </p>
      </div>
      <div className={styles.actions}>
        <form action={approveRequestAction.bind(null, request.id)}>
          <button type="submit">승인</button>
        </form>
        <form action={rejectRequestAction.bind(null, request.id)}>
          <button type="submit">거절</button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 승인 화면 페이지 작성**

`src/app/admin/approvals/page.tsx`:

```tsx
import { loadPendingRequestsFromDisk } from "@/lib/members/loadPending";
import { PendingRequestRow } from "@/components/admin/PendingRequestRow";

export default function ApprovalsPage() {
  const requests = loadPendingRequestsFromDisk();

  return (
    <main>
      <h1>가입 승인 대기 목록</h1>
      {requests.length === 0 ? (
        <p>대기 중인 요청이 없습니다.</p>
      ) : (
        requests.map((request) => <PendingRequestRow key={request.id} request={request} />)
      )}
    </main>
  );
}
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: `Compiled successfully`

- [ ] **Step 5: 커밋**

```bash
git add src/app/admin/approvals src/components/admin/PendingRequestRow.tsx src/components/admin/PendingRequestRow.module.css
git commit -m "$(cat <<'EOF'
Add approval screen for pending registration requests

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: 회원관리 화면 (직접 추가/수정/삭제, role은 owner 전용)

**Files:**
- Create: `src/app/admin/members/actions.ts`
- Create: `src/app/admin/members/page.tsx`
- Create: `src/components/admin/MemberRow.tsx`
- Create: `src/components/admin/MemberRow.module.css`

- [ ] **Step 1: 서버 액션 작성**

`src/app/admin/members/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { commitFile } from "@/lib/github/client";
import { loadMembersFromDisk } from "@/lib/members/load";
import { getSession } from "@/lib/auth/getSession";
import { isElevatedRole } from "@/lib/auth/requireElevatedRole";

async function assertElevated(): Promise<void> {
  const session = await getSession();
  if (!isElevatedRole(session)) {
    throw new Error("권한이 없습니다.");
  }
}

async function assertOwner(): Promise<void> {
  const session = await getSession();
  if (session?.role !== "owner") {
    throw new Error("owner만 할 수 있는 작업입니다.");
  }
}

export async function updateMemberPhoneAction(memberId: string, formData: FormData): Promise<void> {
  await assertElevated();

  const phone = formData.get("phone");
  const members = loadMembersFromDisk();
  const target = members.find((member) => member.id === memberId);
  if (!target) throw new Error("존재하지 않는 인물입니다.");

  target.phone = typeof phone === "string" && phone.trim() ? phone.trim() : undefined;

  await commitFile(
    "data/members.json",
    JSON.stringify(members, null, 2),
    `Update contact info for ${target.name}`
  );

  revalidatePath("/admin/members");
}

export async function updateMemberRoleAction(memberId: string, formData: FormData): Promise<void> {
  // role 변경은 owner만 가능 — 일반 admin은 이 액션을 호출할 수 있는 화면 자체가 노출되지 않지만,
  // 폼을 직접 조작해 요청을 보내는 우회를 막기 위해 서버에서도 다시 한번 확인한다.
  await assertOwner();

  const role = formData.get("role");
  const members = loadMembersFromDisk();
  const target = members.find((member) => member.id === memberId);
  if (!target) throw new Error("존재하지 않는 인물입니다.");

  if (role === "admin") {
    target.role = "admin";
  } else if (role === "none") {
    target.role = undefined;
  }
  // "owner" 값이 들어와도 무시한다 — owner는 이 화면으로 새로 만들 수 없다(시드로만 존재).

  await commitFile(
    "data/members.json",
    JSON.stringify(members, null, 2),
    `Update role for ${target.name}`
  );

  revalidatePath("/admin/members");
}
```

- [ ] **Step 2: MemberRow 컴포넌트 작성**

`src/components/admin/MemberRow.module.css`:

```css
.row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid #d0d0d0;
  border-radius: 10px;
  margin-bottom: 0.5rem;
}

.name {
  font-size: 1.1rem;
  font-weight: 700;
  min-width: 6rem;
}

.roleBadge {
  font-size: 0.8rem;
  color: #555555;
}
```

`src/components/admin/MemberRow.tsx`:

```tsx
import type { Member } from "@/lib/members/schema";
import { updateMemberPhoneAction, updateMemberRoleAction } from "@/app/admin/members/actions";
import styles from "./MemberRow.module.css";

export function MemberRow({ member, isOwnerViewer }: { member: Member; isOwnerViewer: boolean }) {
  return (
    <div className={styles.row}>
      <span className={styles.name}>{member.name}</span>
      <span className={styles.roleBadge}>{member.role ?? "일반 회원"}</span>
      <form action={updateMemberPhoneAction.bind(null, member.id)}>
        <input name="phone" type="tel" defaultValue={member.phone ?? ""} placeholder="연락처" />
        <button type="submit">연락처 저장</button>
      </form>
      {isOwnerViewer && (
        <form action={updateMemberRoleAction.bind(null, member.id)}>
          <select name="role" defaultValue={member.role === "admin" ? "admin" : "none"}>
            <option value="none">일반 회원</option>
            <option value="admin">관리자(admin)</option>
          </select>
          <button type="submit">권한 저장</button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 회원관리 페이지 작성**

`src/app/admin/members/page.tsx`:

```tsx
import { loadMembersFromDisk } from "@/lib/members/load";
import { getSession } from "@/lib/auth/getSession";
import { MemberRow } from "@/components/admin/MemberRow";

export default async function MembersPage() {
  const session = await getSession();
  const members = loadMembersFromDisk();
  const isOwnerViewer = session?.role === "owner";

  return (
    <main>
      <h1>회원관리</h1>
      {members.map((member) => (
        <MemberRow key={member.id} member={member} isOwnerViewer={isOwnerViewer} />
      ))}
    </main>
  );
}
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: `Compiled successfully`

- [ ] **Step 5: 커밋**

```bash
git add src/app/admin/members src/components/admin/MemberRow.tsx src/components/admin/MemberRow.module.css
git commit -m "$(cat <<'EOF'
Add member management screen with owner-only role editing

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: 배포 환경변수 문서 업데이트 (GitHub API 토큰)

**Files:**
- Modify: `.env.local.example`
- Modify: `README.md`

- [ ] **Step 1: .env.local.example에 GitHub API 관련 변수 추가**

```
SESSION_JWT_SECRET=replace-with-a-long-random-string
GITHUB_TOKEN=replace-with-a-github-personal-access-token-with-repo-scope
GITHUB_OWNER=bawo3
GITHUB_REPO=KimHouse
GITHUB_BRANCH=main
```

- [ ] **Step 2: README.md 업데이트**

"로컬 실행" 섹션에 4번 항목으로 추가:

```markdown
4. `.env.local`에 `GITHUB_TOKEN`(저장소 쓰기 권한이 있는 GitHub Personal Access Token), `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`도 추가합니다 — 회원가입 신청/승인/회원관리가 실제로 커밋을 만들려면 필요합니다.
```

"범위" 섹션을 아래로 교체:

```markdown
## 범위

로그인, 세대별 트리 뷰 조회, 공개 회원가입 신청(세대+이름+연락처), 관리자 승인, 회원관리(연락처 수정, owner의 권한 부여)까지 구현되어 있습니다. "자녀로 추가"(부모 선택 후 자동 세대 계산), 여러 명을 한 번에 등록해 승인 요청하는 흐름, 검색/확대축소 같은 기능은 아직 없습니다.
```

- [ ] **Step 3: 커밋 및 푸시**

```bash
git add .env.local.example README.md
git commit -m "$(cat <<'EOF'
Document GitHub API env vars and update README scope section

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
git push
```
