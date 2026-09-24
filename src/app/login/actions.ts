"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loadMembersFromDisk } from "@/lib/members/load";
import { findMatchingMember } from "@/lib/auth/login";
import { SESSION_COOKIE_NAME, createSessionToken } from "@/lib/auth/session";

// 로그인 폼(useActionState)이 화면에 보여줄 상태
// - error가 있으면 화면에 에러 메시지를 띄운다.
export interface LoginFormState {
  error?: string;
}

// 로그인 폼 제출 시 실행되는 서버 액션
// - 세대/이름/연락처 입력값을 받아 명부(members.json)와 대조한다.
// - 일치하는 인물이 있으면 세션 토큰을 쿠키에 저장하고 /tree로 이동시킨다.
// - 일치하지 않으면 에러 메시지를 담은 상태를 반환해 화면에 보여준다.
export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const generationRaw = formData.get("generation");
  const name = formData.get("name");
  const phone = formData.get("phone");

  const generation = Number(generationRaw);

  // 입력값 검증: 세 항목이 모두 채워져 있어야 한다.
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

  // 명부 로딩과 매칭 로직은 기존에 구현된 함수를 그대로 재사용한다(중복 구현 금지).
  const members = loadMembersFromDisk();
  const match = findMatchingMember(members, { generation, name: name.trim(), phone });

  if (!match) {
    return { error: "일치하는 정보를 찾을 수 없습니다. 세대·이름·연락처를 다시 확인해 주세요." };
  }

  // 로그인 성공: 세션 토큰(JWT)을 발급하고 쿠키에 저장한다.
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
