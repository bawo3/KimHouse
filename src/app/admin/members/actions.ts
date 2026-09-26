"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { commitFile } from "@/lib/github/client";
import { loadMembersFromDisk } from "@/lib/members/load";
import { getSession } from "@/lib/auth/getSession";
import { isElevatedRole } from "@/lib/auth/requireElevatedRole";
import type { Member } from "@/lib/members/schema";

// 연락처 수정은 admin/owner 모두 가능해야 하므로, 기존 가드 헬퍼를 그대로 재사용한다.
async function assertElevated(): Promise<void> {
  const session = await getSession();
  if (!isElevatedRole(session)) {
    throw new Error("권한이 없습니다.");
  }
}

// role 변경은 owner만 할 수 있어야 한다(승인 권한은 김재현만 부여할 수 있다는 요구사항).
async function assertOwner(): Promise<void> {
  const session = await getSession();
  if (session?.role !== "owner") {
    throw new Error("owner만 할 수 있는 작업입니다.");
  }
}

// 회원의 연락처(phone)를 수정한다.
// - admin/owner 둘 다 실행할 수 있다.
export async function updateMemberPhoneAction(memberId: string, formData: FormData): Promise<void> {
  await assertElevated();

  const phone = formData.get("phone");
  const members = loadMembersFromDisk();
  const target = members.find((member) => member.id === memberId);
  if (!target) throw new Error("존재하지 않는 인물입니다.");

  // 빈 문자열(공백만 입력한 경우 포함)은 "연락처 없음" 상태로 취급해 undefined로 저장한다.
  target.phone = typeof phone === "string" && phone.trim() ? phone.trim() : undefined;

  await commitFile(
    "data/members.json",
    JSON.stringify(members, null, 2),
    `Update contact info for ${target.name}`
  );

  revalidatePath("/admin/members");
}

// 회원의 role(admin 권한 부여/회수)을 수정한다.
export async function updateMemberRoleAction(memberId: string, formData: FormData): Promise<void> {
  // role 변경은 owner만 가능 — 일반 admin은 이 화면에서 select 자체가 노출되지 않지만,
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

// 회원관리 폼(useActionState)이 화면에 보여줄 상태
// - error가 있으면 화면에 에러 메시지를 띄운다.
// - success가 true면 "등록 완료" 안내로 전환하고 폼을 비운다(연속 추가를 위해 화면은 유지).
export interface AddMemberFormState {
  error?: string;
  success?: boolean;
}

// FormData의 선택(optional) 텍스트 필드를 읽어 앞뒤 공백을 정리한다.
// 값이 없거나 공백만 있으면 "값 없음" 상태로 취급해 undefined를 반환한다.
// (birthDate/hanjaName/phone/address/deathDate/배우자 필드 등 여러 곳에서 반복되는 패턴이라 하나로 묶는다.)
function readOptionalText(formData: FormData, field: string): string | undefined {
  const value = formData.get(field);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

// 회원관리 화면에서 admin/owner가 사람을 직접 추가한다(승인 절차 없이 즉시 커밋).
// - parentId를 선택하면 generation은 항상 서버에서 parent.generation + 1로 계산한다
//   (클라이언트가 함께 보낸 generation 값은 이 경우 무시한다).
// - parentId가 비어 있으면 generation을 폼에서 직접 받아 양의 정수인지 검증한다
//   (register/actions.ts의 registerAction과 동일한 검증 패턴).
// - role 필드는 이 폼에서 아예 읽지 않는다 — 추가되는 인물은 항상 role 미지정 상태이며,
//   role 변경은 updateMemberRoleAction에서만 가능하다(권한 상승 경로 차단).
export async function addMemberAction(
  _prevState: AddMemberFormState,
  formData: FormData
): Promise<AddMemberFormState> {
  await assertElevated();

  const nameRaw = formData.get("name");
  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  if (!name) {
    return { error: "이름을 입력해 주세요." };
  }

  const parentIdRaw = formData.get("parentId");
  const parentId = typeof parentIdRaw === "string" ? parentIdRaw.trim() : "";

  const members = loadMembersFromDisk();

  let generation: number;
  if (parentId) {
    const parent = members.find((member) => member.id === parentId);
    if (!parent) {
      return { error: "존재하지 않는 부모입니다." };
    }
    generation = parent.generation + 1;
  } else {
    const generationRaw = formData.get("generation");
    const parsedGeneration = Number(generationRaw);
    if (
      !generationRaw ||
      Number.isNaN(parsedGeneration) ||
      !Number.isInteger(parsedGeneration) ||
      parsedGeneration <= 0
    ) {
      return { error: "세대를 올바르게 입력해 주세요." };
    }
    generation = parsedGeneration;
  }

  const spouseName = readOptionalText(formData, "spouseName");
  const spouse = spouseName
    ? {
        name: spouseName,
        birthDate: readOptionalText(formData, "spouseBirthDate"),
        clanName: readOptionalText(formData, "spouseClanName"),
        phone: readOptionalText(formData, "spousePhone"),
        deathDate: readOptionalText(formData, "spouseDeathDate"),
      }
    : undefined;

  const newMember: Member = {
    id: randomUUID(),
    name,
    generation,
    parentId: parentId || null,
    birthDate: readOptionalText(formData, "birthDate"),
    hanjaName: readOptionalText(formData, "hanjaName"),
    phone: readOptionalText(formData, "phone"),
    address: readOptionalText(formData, "address"),
    deathDate: readOptionalText(formData, "deathDate"),
    spouse,
  };

  const updatedMembers = [...members, newMember];

  await commitFile(
    "data/members.json",
    JSON.stringify(updatedMembers, null, 2),
    `Add member ${name}`
  );

  revalidatePath("/admin/members");

  return { success: true };
}
