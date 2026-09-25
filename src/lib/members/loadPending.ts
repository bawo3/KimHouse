import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parsePendingRequest, type PendingRequest } from "@/lib/members/pending";

// pending 등록 신청 파일들이 저장되는 폴더 경로 (프로젝트 루트 기준 data/pending)
const PENDING_DIR_PATH = join(process.cwd(), "data", "pending");

// data/pending 폴더에 있는 모든 등록 신청(.json) 파일을 읽어서
// 파싱 + 검증까지 마친 PendingRequest 배열로 반환한다.
// 실제 파싱/검증 로직은 pending.ts의 parsePendingRequest를 그대로 재사용한다 (중복 구현 금지).
export function loadPendingRequestsFromDisk(): PendingRequest[] {
  if (!existsSync(PENDING_DIR_PATH)) return [];

  const files = readdirSync(PENDING_DIR_PATH).filter((file) => file.endsWith(".json"));

  return files.map((file) => {
    const raw = readFileSync(join(PENDING_DIR_PATH, file), "utf-8");
    return parsePendingRequest(raw);
  });
}
