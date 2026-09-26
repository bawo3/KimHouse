# 김해 김씨 문중 명부

세대별로 인물을 정리하고, 같은 세대를 가로 한 줄로 나란히 보여주는 가계도 트리 뷰 웹앱입니다.

기술 스택: Next.js(App Router), TypeScript, Vitest, zod, jose

## 로컬 실행

1. `npm install`
2. `.env.local.example`을 복사해 `.env.local`을 만들고 `SESSION_JWT_SECRET`에 임의의 긴 문자열을 넣습니다.
3. `data/members.json`의 시드 관리자 레코드(`name`, `phone`)를 실제 정보로 교체합니다.

   ⚠️ 보안 주의: 이 저장소는 현재 GitHub에 공개(public) 상태이며, `data/members.json`에는 실제 가족 구성원의 개인정보(이름, 연락처 등)가 들어갑니다. 로그인 인증이 연락처 일치 여부로 이루어지므로, 저장소가 공개 상태이면 누구나 그 연락처로 로그인할 수 있습니다(가족 구성원은 물론 관리자 계정도 포함). **실제 데이터를 입력하기 전에 반드시 GitHub 저장소를 비공개(Private)로 전환하십시오** (GitHub 저장소 페이지 → Settings → General → 맨 아래 "Danger Zone" → "Change repository visibility" → Private). Vercel 무료(Hobby) 티어에서도 비공개 저장소 배포가 지원됩니다.

4. `.env.local`에 `GITHUB_TOKEN`(저장소 쓰기 권한이 있는 GitHub Personal Access Token), `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`도 추가합니다 — 회원가입 신청/승인/회원관리가 실제로 커밋을 만들려면 필요합니다.

   ⚠️ `GITHUB_TOKEN`은 비밀번호와 같은 민감한 값입니다. 이 저장소(`bawo3/KimHouse`) 하나에만 접근 가능한 **fine-grained personal access token**으로 발급받는 것을 권장합니다(GitHub → Settings → Developer settings → Fine-grained tokens → Repository access를 이 저장소로만 제한, Contents 권한을 Read and write로 설정). 모든 저장소에 접근 가능한 classic 토큰(`repo` scope)은 이 프로젝트에 필요한 것보다 훨씬 넓은 권한을 주므로 피하십시오. 어디에도 붙여넣거나 공유하지 말고, 유출이 의심되면 즉시 재발급하십시오.
5. `npm run dev` 후 http://localhost:3000 접속.

## 테스트

`npm test`

특정 파일만 실행:

```
npm test -- <파일명>
```

예: `npm test -- login.test.ts`

## Vercel 배포

1. 이 저장소(https://github.com/bawo3/KimHouse.git)를 Vercel 프로젝트로 연결합니다.
2. Vercel 프로젝트 환경변수에 `SESSION_JWT_SECRET`과 `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`를 모두 등록합니다 — GitHub 관련 변수가 없으면 회원가입 신청/승인/회원관리가 배포 환경에서 조용히 실패합니다.
3. `main` 브랜치에 push하면 자동으로 재배포됩니다(데이터 파일이 git에 커밋되어 있으므로, 데이터 변경도 push만으로 반영됩니다).

## 범위

로그인(이름+연락처), 세대별 트리 뷰 조회, 공개 회원가입 신청(이름+세대+연락처), 관리자 승인, 회원관리(연락처 수정, owner의 admin 권한 부여/회수)까지 구현되어 있습니다. 회원관리 화면에서 인물을 직접 추가하거나 삭제하는 기능, "자녀로 추가"(부모 선택 후 자동 세대 계산), 여러 명을 한 번에 등록해 승인 요청하는 흐름, 검색/확대축소 같은 기능은 아직 없습니다.
