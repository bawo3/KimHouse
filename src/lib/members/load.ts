import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseMembers, type Member } from "@/lib/members/schema";

// 시드 데이터 파일의 경로 (프로젝트 루트 기준 data/members.json)
const DATA_FILE_PATH = join(process.cwd(), "data", "members.json");

// data/members.json 파일을 읽어서 파싱 + 검증까지 마친 Member 배열로 반환한다.
// 실제 파싱/검증 로직은 schema.ts의 parseMembers를 그대로 재사용한다 (중복 구현 금지).
export function loadMembersFromDisk(): Member[] {
  const raw = readFileSync(DATA_FILE_PATH, "utf-8");
  return parseMembers(raw);
}
