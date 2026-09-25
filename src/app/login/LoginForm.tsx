"use client";

import { useActionState } from "react";
import { loginAction, type LoginFormState } from "./actions";

const initialState: LoginFormState = {};

// 로그인 폼: 세대/이름/연락처를 입력받아 서버 액션(loginAction)으로 전달한다.
// - useActionState가 폼 상태(에러 메시지)와 제출 진행 여부(isPending)를 관리해 준다.
export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction}>
      <label>
        세대 (선택 — 관리자는 생략 가능)
        <input name="generation" type="number" inputMode="numeric" />
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
