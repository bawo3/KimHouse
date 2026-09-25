"use server";

import { randomUUID } from "node:crypto";
import { commitFile } from "@/lib/github/client";

// 회원가입 신청 폼(useActionState)이 화면에 보여줄 상태
// - error가 있으면 화면에 에러 메시지를 띄운다.
// - success가 true면 접수 완료 안내로 전환한다.
export interface RegisterFormState {
  error?: string;
  success?: boolean;
}

// 회원가입 신청 폼 제출 시 실행되는 서버 액션
// - 로그인 없이 누구나 호출할 수 있으므로, 신청자가 role 등 권한 관련 값을
//   직접 지정하지 못하도록 name/generation/phone만 입력받는다(권한 상승 방지).
// - 검증을 통과하면 data/pending/<id>.json 파일로 커밋해 관리자 승인을 기다리게 한다.
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

  // GitHub API 호출 로직은 재구현하지 않고 기존 commitFile을 그대로 재사용한다.
  await commitFile(
    `data/pending/${id}.json`,
    JSON.stringify(request, null, 2),
    `Add registration request for ${name.trim()}`
  );

  return { success: true };
}
