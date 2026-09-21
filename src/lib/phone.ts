// 연락처(전화번호) 문자열을 숫자만 남도록 정규화한다.
// - 하이픈(-)이나 공백 등 숫자가 아닌 문자는 모두 제거한다.
// - 값이 없으면(빈 문자열, null, undefined) 빈 문자열을 반환한다.
// - 로그인 대조 로직(Task 5)에서 "하이픈 유무와 무관하게" 연락처를 비교할 때 사용한다.
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/[^0-9]/g, "");
}
