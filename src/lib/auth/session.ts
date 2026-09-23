import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

// 세션 토큰(JWT) 안에 들어가는 정보
// - memberId: 로그인한 인물의 id (필수)
// - role: "admin"인 경우에만 값이 존재 (관리자 표시용, Task 3 스키마와 동일)
export interface SessionPayload {
  memberId: string;
  role?: "admin";
}

// JWT 서명/검증에 쓰는 비밀키를 환경변수에서 읽어온다.
// - 별도 세션 저장소(DB) 없이 서명된 토큰만으로 로그인 상태를 유지하므로
//   이 비밀키가 새어나가면 누구나 토큰을 위조할 수 있다. 외부에 노출하지 않는다.
function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_JWT_SECRET;
  if (!secret) {
    throw new Error("SESSION_JWT_SECRET 환경변수가 설정되지 않았습니다.");
  }
  return encoder.encode(secret);
}

// 로그인 성공 시 호출: 인물 정보를 담은 서명된 JWT를 발급한다.
// - 만료 기간은 30일. 그 이후에는 다시 로그인해야 한다.
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ memberId: payload.memberId, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

// 요청에 담긴 세션 토큰을 검증한다.
// - 서명이 올바르지 않거나(위변조), 만료됐거나, 형식이 잘못된 토큰이면 null을 반환한다.
// - 호출하는 쪽에서는 null 여부만 확인하면 되므로 예외 처리를 신경 쓸 필요가 없다.
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.memberId !== "string") return null;
    return {
      memberId: payload.memberId,
      role: payload.role === "admin" ? "admin" : undefined,
    };
  } catch {
    return null;
  }
}
