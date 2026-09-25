# 김해 김씨 문중 명부

세대별로 인물을 정리하고, 같은 세대를 가로 한 줄로 나란히 보여주는 가계도 트리 뷰 웹앱입니다.

기술 스택: Next.js(App Router), TypeScript, Vitest, zod, jose

## 로컬 실행

1. `npm install`
2. `.env.local.example`을 복사해 `.env.local`을 만들고 `SESSION_JWT_SECRET`에 임의의 긴 문자열을 넣습니다.
3. `data/members.json`의 시드 관리자 레코드(`name`, `phone`)를 실제 정보로 교체합니다.

   ⚠️ 보안 주의: 이 저장소는 현재 GitHub에 공개(public) 상태이며, `data/members.json`에는 실제 가족 구성원의 개인정보(이름, 연락처 등)가 들어갑니다. 로그인 인증이 연락처 일치 여부로 이루어지므로, 저장소가 공개 상태이면 누구나 그 연락처로 로그인할 수 있습니다(가족 구성원은 물론 관리자 계정도 포함). **실제 데이터를 입력하기 전에 반드시 GitHub 저장소를 비공개(Private)로 전환하십시오** (GitHub 저장소 페이지 → Settings → General → 맨 아래 "Danger Zone" → "Change repository visibility" → Private). Vercel 무료(Hobby) 티어에서도 비공개 저장소 배포가 지원됩니다.

4. `npm run dev` 후 http://localhost:3000 접속.

## 테스트

`npm test`

특정 파일만 실행:

```
npm test -- <파일명>
```

예: `npm test -- login.test.ts`

## Vercel 배포

1. 이 저장소(https://github.com/bawo3/KimHouse.git)를 Vercel 프로젝트로 연결합니다.
2. Vercel 프로젝트 환경변수에 `SESSION_JWT_SECRET`을 등록합니다.
3. `main` 브랜치에 push하면 자동으로 재배포됩니다(데이터 파일이 git에 커밋되어 있으므로, 데이터 변경도 push만으로 반영됩니다).

## 범위

이 버전은 로그인(세대+이름+연락처 대조)과 세대별 트리 뷰 조회까지만 구현되어 있습니다. 가족 구성원의 등록/수정 요청, 관리자 승인 화면, 회원관리, 검색/확대축소 같은 기능은 후속 계획(Plan B, Plan C)에서 추가됩니다.
