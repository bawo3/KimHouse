# 회원관리 확장 + 트리 탐색 (Plan C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** owner/admin이 회원관리 화면에서 사람을 직접 추가(부모 선택 시 세대 자동 계산)·삭제할 수 있게 하고, 트리 뷰에서 이름 검색과 확대/축소가 가능하게 한다.

**Architecture:** Plan A(기반)·Plan B(등록/승인) 위에 쌓는다. 추가/삭제는 6-1장과 동일하게 `commitFile`로 `data/members.json`을 직접 갱신한다(승인 절차 없음, owner/admin 전용). 부모 선택 UI와 "여러 명 연속 추가"는 별도의 배치/세션 메커니즘 없이, 추가할 때마다 즉시 커밋하고 같은 화면에 머무르는 것으로 해결한다(단순함 우선). 트리 검색/확대축소는 `TreeCanvas`를 확장한다 — 서버가 아니라 순수 클라이언트 상태(React state)로 처리한다.

**Tech Stack:** 기존과 동일 (Next.js, TypeScript, zod, Vitest, Octokit). 새 의존성 없음.

**범위:** 설계 문서(`docs/superpowers/specs/2026-09-21-family-tree-design.md`) 6-1장의 추가/삭제, 7장의 자녀 자동 세대계산 개념(다만 "자녀로 추가"는 로그인 없는 공개 폼이 아니라 회원관리 화면 안에서 구현), 8장의 검색/확대축소를 다룬다. 공개 회원가입 신청(/register)에는 부모 선택 기능을 추가하지 않는다(비로그인 사용자에게 가족 명단이 노출되는 것을 막기 위함 — 이번 계획에서 새로 내린 판단).

---

## 파일 구조

```
KimHouse/
  src/
    app/
      admin/
        members/
          actions.ts          # 수정: addMemberAction, deleteMemberAction 추가
          page.tsx             # 수정: AddMemberForm 렌더링 추가
          AddMemberForm.tsx    # 신규: 이름/부모선택(또는 세대 직접입력)/선택필드 폼
          AddMemberForm.test.tsx
    components/
      admin/
        MemberRow.tsx          # 수정: 삭제 버튼 추가
        DeleteMemberButton.tsx # 신규: 클라이언트 확인창(confirm) 후 제출
    components/
      tree/
        TreeCanvas.tsx          # 수정: 확대/축소 상태 + 버튼, 검색 하이라이트/스크롤
        TreeCanvas.module.css   # 수정: 확대/축소 컨트롤, 검색창, 하이라이트 스타일
        TreeCanvas.test.tsx     # 수정: 새 동작 테스트 추가
```

---

### Task 1: `addMemberAction` — 회원관리에서 사람 직접 추가 (부모 선택 시 세대 자동 계산)

**Files:**
- Modify: `src/app/admin/members/actions.ts`

**요구사항:**
- `addMemberAction(_prevState, formData): Promise<{ error?: string; success?: boolean }>` 형태의 서버 액션을 추가한다(`useActionState`로 클라이언트에서 쓸 수 있도록).
- `assertElevated()`(기존 헬퍼 재사용)로 admin/owner만 통과.
- 폼 필드: `name`(필수), `parentId`(선택 — 기존 회원 id 또는 빈 문자열), `generation`(선택 — `parentId`가 비어 있을 때만 필수), `birthDate`/`hanjaName`/`phone`/`address`/`deathDate`(전부 선택), 배우자 관련 필드(`spouseName`/`spouseBirthDate`/`spouseClanName`/`spousePhone`/`spouseDeathDate`, 전부 선택 — `spouseName`이 있을 때만 나머지를 `spouse` 객체로 묶는다).
- 검증 로직:
  - `name`이 비어 있으면 에러.
  - `parentId`가 주어졌으면, `loadMembersFromDisk()`에서 그 id를 가진 회원을 찾아 `generation = parent.generation + 1`로 **서버에서 계산**한다(클라이언트가 보낸 generation 값은 이 경우 무시). 존재하지 않는 parentId면 에러.
  - `parentId`가 비어 있으면, `generation` 폼 값을 정수로 파싱하고 `Number.isInteger(...) && generation > 0`을 확인(기존 `register/actions.ts`의 검증 패턴과 동일하게).
  - `role` 필드는 이 폼에 아예 없다(추가 시 role은 항상 미지정 — role 변경은 기존 `updateMemberRoleAction`에서만).
- 새 멤버는 `{ id: randomUUID(), name, generation, parentId: parentId || null, ...선택 필드들 }` 형태로 조합해 기존 `loadMembersFromDisk()` 배열에 append하고, `commitFile("data/members.json", ...)`로 커밋한다(Task 11의 `approveRequestAction`과 동일한 재사용 패턴 — `commitFile`을 그대로 쓰고 GitHub API 로직을 재구현하지 않는다).
- 성공 시 `{ success: true }`를 반환한다(폼이 이 값을 보고 초기화하거나 안내 메시지를 보여줄 수 있게).

**테스트:** `src/app/admin/members/actions.ts`는 지금까지 이 프로젝트의 다른 서버 액션들처럼(`register/actions.test.ts` 참고) `commitFile`을 모킹해서 단위 테스트하는 파일이 없다 — 이번엔 만들어라. `src/app/admin/members/actions.test.ts`를 만들어 최소 아래를 다루는 한글 설명의 테스트를 작성한다:
- 이름이 없으면 에러, `commitFile` 미호출.
- `parentId`가 존재하는 회원을 가리키면 `generation`이 parent+1로 계산되어 커밋된다(커밋된 JSON 내용을 파싱해 확인).
- `parentId`가 존재하지 않는 id면 에러.
- `parentId` 없이 `generation`이 정수가 아니면 에러(register/actions.test.ts의 패턴 재사용).
- 정상 입력 시 성공 + 커밋된 멤버 배열에 새 레코드가 append되어 있는지 확인.
- `assertElevated()`가 세션 없음/일반 회원일 때 에러를 던지는지(다른 admin 액션 테스트들처럼 `getSession`을 모킹).

TDD로 진행: 먼저 이 테스트들을 작성하고 실패를 확인한 뒤 `addMemberAction`을 구현한다.

**검증:** `npm test -- actions.test.ts`(경로 주의, 여러 actions.test.ts가 있으니 `src/app/admin/members/actions.test.ts`로 지정), 전체 `npm test`, `npx tsc --noEmit`, `npm run build`.

**커밋:** `src/app/admin/members/actions.ts src/app/admin/members/actions.test.ts` — 메시지: "Add addMemberAction with auto-calculated generation from parent"

---

### Task 2: `AddMemberForm` — 추가 폼 UI (부모 선택 드롭다운 포함)

**Files:**
- Create: `src/app/admin/members/AddMemberForm.tsx`
- Test: `src/app/admin/members/AddMemberForm.test.tsx`
- Modify: `src/app/admin/members/page.tsx`

**요구사항:**
- `"use client"` 컴포넌트, `useActionState(addMemberAction, {})`로 상태 관리(다른 폼들과 동일한 패턴).
- props: `members: Member[]` (부모 선택 드롭다운을 채우기 위해 페이지에서 넘겨받음).
- `<select name="parentId">`: 첫 옵션은 `value=""` + 라벨 "없음 (독립 등록, 세대 직접 입력)", 나머지 옵션은 각 멤버당 `value={member.id}`, 라벨 `${member.name} (${member.generation}대손)`.
- `<input name="generation">`: 부모를 선택하면 이 입력칸을 비활성화(disabled)하고 안내 문구("부모 세대에서 자동 계산됩니다")로 대체 표시, 부모를 선택하지 않으면 활성화. 이 토글은 클라이언트 상태(`useState`)로 처리한다 — `<select onChange={...}>`로 감지.
- 이름/생년월일/한자이름/연락처/거주지/기일 입력칸(전부 텍스트 계열, name만 required).
- 배우자 이름 입력 시 배우자 하위 필드(생년월일/성씨·본관/연락처/기일)가 열리는 패턴은 기존 설계 문서 5장 의도를 따르되, 구현은 간단하게: 배우자 이름 입력칸 아래에 나머지 배우자 필드를 처음부터 다 보여줘도 된다(모두 선택이라 실사용에 문제 없음 — 과설계 금지, `useState`로 토글하는 것도 괜찮지만 필수는 아니다).
- 제출 성공(`state.success`) 시 폼을 초기화하고 "OOO님을 등록했습니다" 같은 안내를 잠깐 보여준다(그래야 "여러 명 연속 추가"가 자연스럽다 — 폼이 사라지지 않고 그대로 남아 바로 다음 사람을 입력할 수 있어야 함).
- `src/app/admin/members/page.tsx`에서 `<AddMemberForm members={members} />`를 목록 위에 렌더링하도록 수정(기존 `members`/`isOwnerViewer` 계산 로직은 그대로 재사용).

**테스트:** `AddMemberForm.test.tsx` — `addMemberAction`을 모킹하고, 부모 드롭다운에 넘겨준 `members`가 옵션으로 렌더링되는지, 부모 선택 시 세대 입력칸이 비활성화되는지(예: `userEvent.selectOptions` 후 `expect(generationInput).toBeDisabled()`), role 관련 입력칸이 전혀 없는지(권한 상승 방지, 기존 `RegisterForm.test.tsx` 패턴과 동일)를 한글 설명으로 검증한다.

**검증:** 위와 동일한 절차 + `npm run dev`가 이미 떠 있는 서버로 owner 세션 쿠키를 얻어 `/admin/members`에 curl로 접근해서 폼이 실제로 렌더링되는지 확인(제출까지는 GITHUB_TOKEN 없어서 불가, 렌더링만 확인).

**커밋:** "Add AddMemberForm with parent-select auto-generation UI"

---

### Task 3: `deleteMemberAction` — 회원 삭제 (고아 참조 자동 정리 + owner 삭제 방지)

**Files:**
- Modify: `src/app/admin/members/actions.ts`

**요구사항:**
- `deleteMemberAction(memberId: string): Promise<void>`.
- `assertElevated()`로 admin/owner만 통과.
- 대상을 찾아서: **role이 "owner"인 레코드는 삭제를 거부**한다(에러: "owner는 삭제할 수 없습니다 — 먼저 다른 사람에게 owner를 넘기는 절차가 없으므로, 유일한 owner를 지우면 아무도 권한을 관리할 수 없게 됩니다"). 이건 설계 문서에 명시된 요구사항은 아니지만, "회원관리 화면에서 실수로 유일한 관리자를 지워서 전체 서비스가 잠기는" 것을 막는 안전장치로 이번 태스크에서 추가하는 합리적 방어다.
- 대상을 못 찾으면 조용히 반환(멱등, `rejectRequestAction`과 같은 패턴).
- 삭제 전, `members.filter(m => m.parentId === memberId)`로 자식들을 찾아 그들의 `parentId`를 `null`로 되돌린다(고아 방지 — 설계 문서 6-1장 "자식이 연결된 레코드를 삭제하려는 경우... 미연결 상태로 되돌리도록... 삭제를 진행한다"를 그대로 구현).
- 대상을 배열에서 제거하고 `commitFile`로 한 번에 커밋한다(자식들의 parentId 변경 + 대상 제거를 같은 배열 변경, 같은 커밋으로).
- `revalidatePath("/admin/members")`.

**테스트:** `actions.test.ts`에 추가: owner 레코드 삭제 시도 시 거부(에러, commitFile 미호출), 자식이 있는 레코드 삭제 시 자식들의 parentId가 null로 바뀐 채 커밋되는지, 존재하지 않는 id면 조용히 아무 일도 안 일어나는지(commitFile 미호출), 권한 없는 세션이면 차단되는지.

**검증:** 동일 절차.

**커밋:** "Add deleteMemberAction with orphan cleanup and owner-deletion guard"

---

### Task 4: 삭제 버튼 UI (확인창 포함)

**Files:**
- Create: `src/components/admin/DeleteMemberButton.tsx`
- Modify: `src/components/admin/MemberRow.tsx`

**요구사항:**
- `DeleteMemberButton`은 `"use client"` 컴포넌트. `<form action={deleteMemberAction.bind(null, memberId)}>`을 감싸되, 제출 전에 `window.confirm(`정말 ${name}님을 삭제하시겠습니까? 되돌릴 수 없습니다.`)`으로 확인받는다 — `onSubmit={(e) => { if (!confirm(...)) e.preventDefault(); }}` 패턴을 쓴다. Task 11에서 만든 `SubmitButton`(useFormStatus 기반, `src/components/admin/SubmitButton.tsx`)을 재사용해 제출 중 비활성화도 함께 적용한다(중복 구현 금지).
- `MemberRow.tsx`에 이 버튼을 추가한다. `member.role === "owner"`인 행에는 삭제 버튼 자체를 숨긴다(서버에서도 막지만, UI에서도 애초에 시도할 수 없게).

**검증:** 렌더링을 curl/코드 검토로 확인(실제 삭제 흐름은 GITHUB_TOKEN 없이 끝까지 확인 불가 — 서버 액션 로직은 Task 3에서 이미 단위 테스트로 검증됨).

**커밋:** "Add delete button with confirmation to member management rows"

---

### Task 5: 트리 뷰 확대/축소

**Files:**
- Modify: `src/components/tree/TreeCanvas.tsx`
- Modify: `src/components/tree/TreeCanvas.module.css`
- Modify: `src/components/tree/TreeCanvas.test.tsx`

**요구사항:**
- `TreeCanvas`에 `zoom` 상태(`useState<number>(1)`, 0.6~1.6 범위 정도로 clamp)를 추가한다.
- 상단에 "확대"/"축소"/"100%" 리셋 버튼 3개를 둔다(핀치줌 대신 — 설계 문서 8장 요구사항).
- 캔버스를 감싸는 요소에 `style={{ transform: \`scale(${zoom})\`, transformOrigin: "top left" }}`을 적용한다.
- **중요**: `zoom`이 바뀔 때마다 연결선 좌표를 다시 계산해야 한다(`useLayoutEffect`의 의존성 배열에 `zoom`을 추가) — 그렇지 않으면 확대/축소 후 선이 카드 위치와 어긋난다. `getBoundingClientRect()`는 CSS transform이 적용된 후의 실제 렌더링 위치를 반환하므로, 이 재계산만 트리거되면 좌표 자체는 기존 로직 그대로 정확하다.
- 버튼에는 아이콘이 아니라 "확대"/"축소"/"100%"처럼 한글 라벨을 쓴다(디자인 원칙 준수).

**테스트:** 기존 좌표 검증 테스트(Task 11/Plan A의 TreeCanvas.test.tsx)가 여전히 통과하는지 확인(기본 zoom=1일 때 동작이 그대로여야 함). 추가로: "확대" 버튼을 클릭하면 컨테이너의 `style.transform`에 1보다 큰 scale 값이 반영되는지, "축소"를 여러 번 눌러도 최소값 아래로 안 내려가는지(clamp 확인), "100%" 버튼으로 정확히 1로 돌아오는지를 한글 설명으로 검증한다. `getBoundingClientRect` mock은 기존 테스트 패턴을 재사용한다.

**커밋:** "Add zoom controls to TreeCanvas with connector-line recompute"

---

### Task 6: 이름 검색 + 하이라이트/스크롤 이동

**Files:**
- Modify: `src/components/tree/TreeCanvas.tsx`
- Modify: `src/components/tree/TreeCanvas.module.css`
- Modify: `src/components/tree/TreeCanvas.test.tsx`

**요구사항:**
- 검색 입력칸(`<input type="search" placeholder="이름으로 찾기">`)을 확대/축소 버튼과 같은 상단 컨트롤 영역에 둔다.
- 입력값이 바뀔 때마다(또는 엔터/버튼 클릭 시 — 간단히 `onChange`로 즉시 처리해도 됨) `members` 배열에서 `member.name`이 입력값을 포함하는(대소문자 무시 불필요, 한글이므로 단순 `includes`) 첫 번째 사람을 찾는다.
- 찾으면 해당 `[data-person-id="..."]` 요소를 `scrollIntoView({ behavior: "smooth", block: "center" })`로 화면에 보이게 하고, 일정 시간(예: 2초) 동안 강조 표시(CSS 클래스 토글, 예: 노란 테두리/배경)를 준다.
- 못 찾으면(검색어는 있는데 일치하는 사람 없음) 작은 안내 문구("일치하는 사람이 없습니다")를 보여준다.
- 검색은 순수 클라이언트 동작이라 서버 요청이 없다 — `members`는 이미 props로 받고 있으므로 그걸 그대로 쓴다.

**테스트:** 검색어 입력 후 일치하는 카드에 하이라이트 클래스가 붙는지, 일치하지 않으면 안내 문구가 뜨는지, 빈 검색어면 하이라이트가 없는지를 한글 설명으로 검증한다(스크롤 자체는 jsdom에서 실제로 스크롤되지 않으므로 `scrollIntoView`가 호출되었는지 mock으로 확인하는 정도면 충분 — `Element.prototype.scrollIntoView`가 jsdom에 없으므로 `vi.fn()`으로 채워넣고 호출 여부만 검증).

**커밋:** "Add name search with highlight and scroll-to-card in TreeCanvas"

---

## 참고: 이번 계획에서 의도적으로 미룬 것

- 공개 회원가입 신청(/register)에서 부모를 선택하는 기능 — 비로그인 사용자에게 가족 명단이 노출되는 문제 때문에 이번엔 넣지 않았다. 필요하면 "이름으로 부모 후보를 텍스트로만 입력받고, 승인자가 실제로 어떤 사람인지 확인해서 연결"하는 식의 별도 설계가 필요하다.
- 여러 명을 하나의 승인 요청 묶음으로 모아 제출하는 배치 흐름(설계 문서 5장 원안) — 회원관리는 승인 절차 자체가 없어(owner/admin 직접 커밋) 이 문제가 자연히 해소되므로 별도로 구현하지 않았다.
