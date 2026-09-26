"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);
  // 제출 시점의 입력값 스냅샷 - 검증 실패로 폼이 초기화됐을 때 그대로 복원하기 위해 보관한다.
  // 화면을 다시 그릴 필요가 없는 값이라 useState 대신 ref로 들고 있는다.
  const lastSubmittedValuesRef = useRef<Record<string, string>>({});
  const hasParent = parentId !== NO_PARENT_VALUE;

  // React는 폼 액션을 실행하기 전에 폼의 입력칸들을 먼저 초기화한다 - 성공/실패 여부와 무관하게 항상 일어난다.
  // 그래서 "성공했을 때만 지워질 것"이라 가정하면 안 되고, 지워지기 전(=제출하는 바로 그 순간)에
  // FormData 스냅샷으로 전체 필드 값을 미리 붙잡아 둬야 실패 시에도 값을 되돌려 줄 수 있다.
  function formAction(formData: FormData) {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        values[key] = value;
      }
    }
    lastSubmittedValuesRef.current = values;
    setLastAddedName(values.name ?? "");
    return dispatchAddMember(formData);
  }

  useEffect(() => {
    if (state.success) {
      // 성공: 부모 선택 상태만 별도로 초기화한다.
      // (다른 입력칸들은 React가 이미 비워둔 상태 그대로 두고, <select>는 이 컴포넌트가
      //  value={parentId}로 직접 제어하고 있어서 자동 초기화 대상이 아니므로 여기서 리셋한다.)
      setParentId(NO_PARENT_VALUE);
      return;
    }

    if (state.error && formRef.current) {
      // 실패: React가 제출 직전에 이미 지워버린 값들을 방금 캡처해 둔 스냅샷으로 복원한다.
      // 오탈자 하나 때문에 11개 필드를 전부 다시 입력하게 만들지 않기 위함.
      // parentId는 <select value={parentId}>가 React state로 그대로 제어하고 있어 따로 복원할 필요가 없다.
      for (const [key, value] of Object.entries(lastSubmittedValuesRef.current)) {
        if (key === "parentId") continue;
        const field = formRef.current.elements.namedItem(key);
        if (field instanceof HTMLInputElement) {
          field.value = value;
        }
      }
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
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
