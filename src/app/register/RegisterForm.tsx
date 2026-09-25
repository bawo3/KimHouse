"use client";

import { useActionState } from "react";
import { registerAction, type RegisterFormState } from "./actions";

const initialState: RegisterFormState = {};

// 회원가입 신청 폼: 이름/세대/연락처를 입력받아 서버 액션(registerAction)으로 전달한다.
// - 로그인 없이 누구나 접근하므로 role 등 권한 관련 입력칸은 의도적으로 없다.
// - useActionState가 폼 상태(에러/성공 메시지)와 제출 진행 여부(isPending)를 관리해 준다.
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
