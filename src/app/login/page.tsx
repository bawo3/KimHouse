import { LoginForm } from "./LoginForm";

// 로그인 페이지: 세대/이름/연락처를 입력해 명부에 접근할 수 있는지 확인하는 화면
export default function LoginPage() {
  return (
    <main>
      <h1>가족 확인</h1>
      <p>세대, 이름, 연락처를 입력하면 명부를 볼 수 있습니다.</p>
      <LoginForm />
    </main>
  );
}
