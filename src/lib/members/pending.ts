import { z } from "zod";
import { spouseSchema } from "@/lib/members/schema";

// pending 요청은 아직 정식 id가 없는 "등록 신청" 상태의 인물 정보다.
// role은 절대 신청자가 직접 지정할 수 없어야 하므로(권한 상승 방지),
// 이 스키마에는 role 필드를 아예 정의하지 않는다 — 혹시 섞여 들어와도
// zod의 기본 strip 동작으로 조용히 제거된다.
const pendingMemberSchema = z.object({
  name: z.string().min(1),
  generation: z.number().int().positive(),
  parentId: z.string().min(1).nullable(),
  birthDate: z.string().optional(),
  hanjaName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  deathDate: z.string().optional(),
  spouse: spouseSchema.optional(),
});

export const pendingRequestSchema = z.object({
  id: z.string().min(1),
  submittedAt: z.string().min(1),
  member: pendingMemberSchema,
});

export type PendingMember = z.infer<typeof pendingMemberSchema>;
export type PendingRequest = z.infer<typeof pendingRequestSchema>;

export function parsePendingRequest(raw: string): PendingRequest {
  const json = JSON.parse(raw);
  return pendingRequestSchema.parse(json);
}
