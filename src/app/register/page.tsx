import { RegisterForm } from "./RegisterForm";

// 회원가입 신청 페이지: 로그인 없이 누구나 접근할 수 있다.
export default function RegisterPage() {
  return (
    <main>
      <h1>회원가입 신청</h1>
      <p>이름, 세대, 연락처를 입력해 주세요. 관리자가 승인하면 로그인할 수 있습니다.</p>
      <RegisterForm />
    </main>
  );
}
