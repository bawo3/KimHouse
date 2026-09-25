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
// - role: 관리자 등급을 나타내며, 값이 없으면 일반 회원이다.
//   - "admin": 일반 관리자. 회원가입 승인/회원관리 등을 수행할 수 있다.
//   - "owner": 최상위 소유자(문중 대표 전용). admin의 모든 권한에 더해,
//     다른 사람에게 admin 권한을 부여하거나 회수할 수 있는 유일한 등급이다.
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
  role: z.enum(["admin", "owner"]).optional(),
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
