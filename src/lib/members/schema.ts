import { z } from "zod";

// 배우자(스포즈) 정보 스키마
// - name만 필수이고, 나머지는 기록이 없을 수도 있어서 모두 optional로 둔다.
export const spouseSchema = z.object({
  name: z.string().min(1),
  birthDate: z.string().optional(),
  clanName: z.string().optional(),
  phone: z.string().optional(),
  deathDate: z.string().optional(),
});

// 문중 명부에 들어가는 한 사람(인물)의 정보 스키마
// - id: 고유 식별자
// - generation: 몇 세대인지 (1 이상의 정수)
// - parentId: 부모의 id. 최상위 조상은 parentId가 null.
// - role: "admin"인 경우에만 값이 존재 (관리자 표시용)
export const memberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  generation: z.number().int().positive(),
  parentId: z.string().min(1).nullable(),
  birthDate: z.string().optional(),
  hanjaName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  deathDate: z.string().optional(),
  role: z.literal("admin").optional(),
  spouse: spouseSchema.optional(),
});

// members.json 전체 파일은 인물 정보의 배열이다.
export const membersFileSchema = z.array(memberSchema);

export type Spouse = z.infer<typeof spouseSchema>;
export type Member = z.infer<typeof memberSchema>;

// 문자열(raw JSON)을 받아 파싱 + 검증까지 한 번에 수행한다.
// JSON.parse나 zod 검증에서 실패하면 예외를 던진다.
export function parseMembers(raw: string): Member[] {
  const json = JSON.parse(raw);
  return membersFileSchema.parse(json);
}
