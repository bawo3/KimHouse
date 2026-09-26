"use server";

import { revalidatePath } from "next/cache";
import { commitFile } from "@/lib/github/client";
import { loadMembersFromDisk } from "@/lib/members/load";
import { getSession } from "@/lib/auth/getSession";
import { isElevatedRole } from "@/lib/auth/requireElevatedRole";

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
