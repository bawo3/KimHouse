"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { commitFile, deleteFileIfExists } from "@/lib/github/client";
import { loadMembersFromDisk } from "@/lib/members/load";
import { loadPendingRequestsFromDisk } from "@/lib/members/loadPending";
import { getSession } from "@/lib/auth/getSession";
import { isElevatedRole } from "@/lib/auth/requireElevatedRole";

// 승인/거절 액션 모두 admin/owner 권한이 있는 사용자만 실행할 수 있어야 한다.
// 세션 확인/권한 체크 로직은 기존 함수(getSession, isElevatedRole)를 그대로 재사용한다.
async function assertElevated(): Promise<void> {
  const session = await getSession();
  if (!isElevatedRole(session)) {
    throw new Error("권한이 없습니다.");
  }
}

// 가입 신청을 승인한다.
// - 신청 정보를 명부(members.json)에 새 인물로 추가하고, 대기 파일(data/pending/*.json)은 삭제한다.
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

// 가입 신청을 거절한다.
// - 명부에는 아무 영향을 주지 않고, 대기 파일만 삭제한다.
// - 이미 처리(삭제)된 요청이면 조용히 종료한다(에러를 던지지 않는다).
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
