"use client";

import { useActionState, useEffect, useState } from "react";
import { addMemberAction, type AddMemberFormState } from "./actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import type { Member } from "@/lib/members/schema";

const initialState: AddMemberFormState = {};

// 부모 없이 독립적으로 등록할 때 선택하는 옵션 값(빈 문자열) - <select>의 value="" 와 동일하게 맞춘다.
const NO_PARENT_VALUE = "";

// 회원관리 화면에서 admin/owner가 새 인물을 직접 추가하는 폼.
// - 부모를 선택하면 세대는 서버(addMemberAction)에서 parent.generation + 1로 자동 계산되므로,
//   세대 입력칸은 비활성화하고 안내 문구로 대체 표시한다.
// - role 관련 입력칸은 의도적으로 두지 않는다 - 새로 추가되는 인물은 항상 일반 회원 상태이며,
//   권한 변경은 기존 updateMemberRoleAction(owner 전용)에서만 가능하다(권한 상승 경로 차단).
// - 제출에 성공하면 폼을 그 자리에서 초기화한다 - 화면 전환 없이 바로 다음 사람을 이어서 입력할 수 있게 하기 위함
//   ("여러 명 연속 추가"를 자연스럽게 만드는 것이 이 폼의 핵심 요구사항).
export function AddMemberForm({ members }: { members: Member[] }) {
  const [state, dispatchAddMember] = useActionState(addMemberAction, initialState);
  const [parentId, setParentId] = useState(NO_PARENT_VALUE);
  const [lastAddedName, setLastAddedName] = useState("");
  const hasParent = parentId !== NO_PARENT_VALUE;

  // 제출된 이름을 먼저 기억해 둔 다음 실제 서버 액션(dispatchAddMember)에 그대로 전달한다.
  // - React는 액션이 성공적으로 끝나면 폼의 입력칸들을 자동으로 비우기 때문에(브라우저의 기본 제출 동작과 동일),
  //   그 이후에 DOM에서 이름 값을 다시 읽으려 하면 이미 지워진 뒤라 항상 빈 문자열만 얻게 된다.
  //   그래서 "지워지기 직전"이 아니라 "제출하는 바로 그 순간"에 이름을 미리 붙잡아 둔다.
  function formAction(formData: FormData) {
    const name = formData.get("name");
    setLastAddedName(typeof name === "string" ? name : "");
    return dispatchAddMember(formData);
  }

  // 서버 액션이 성공을 반환할 때마다(state가 새 객체로 바뀔 때마다) 부모 선택 상태를 초기화한다.
  // - 이름 등 일반 입력칸들은 React가 액션 성공 시 자동으로 비워주지만, <select>는 이 컴포넌트가
  //   value={parentId}로 직접 제어하고 있어서 자동 초기화 대상이 아니므로 별도로 리셋해야 한다.
  useEffect(() => {
    if (state.success) {
      setParentId(NO_PARENT_VALUE);
    }
  }, [state]);

  return (
    <form action={formAction}>
      <h2>회원 추가</h2>
      {state.success && lastAddedName && <p role="status">{lastAddedName}님을 등록했습니다.</p>}
      <label>
        이름
        <input name="name" type="text" required />
      </label>
      <label>
        부모
        <select
          name="parentId"
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
        >
          <option value={NO_PARENT_VALUE}>없음 (독립 등록, 세대 직접 입력)</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {`${member.name} (${member.generation}대손)`}
            </option>
          ))}
        </select>
      </label>
      <label>
        세대
        <input name="generation" type="number" inputMode="numeric" disabled={hasParent} />
      </label>
      {hasParent && <p>부모 세대에서 자동 계산됩니다.</p>}
      <label>
        생년월일
        <input name="birthDate" type="text" />
      </label>
      <label>
        한자 이름
        <input name="hanjaName" type="text" />
      </label>
      <label>
        연락처
        <input name="phone" type="text" />
      </label>
      <label>
        거주지
        <input name="address" type="text" />
      </label>
      <label>
        기일
        <input name="deathDate" type="text" />
      </label>
      <label>
        배우자 이름
        <input name="spouseName" type="text" />
      </label>
      <label>
        배우자 생년월일
        <input name="spouseBirthDate" type="text" />
      </label>
      <label>
        배우자 성씨·본관
        <input name="spouseClanName" type="text" />
      </label>
      <label>
        배우자 연락처
        <input name="spousePhone" type="text" />
      </label>
      <label>
        배우자 기일
        <input name="spouseDeathDate" type="text" />
      </label>
      {state.error && <p role="alert">{state.error}</p>}
      <SubmitButton label="추가" pendingLabel="추가 중..." />
    </form>
  );
}
