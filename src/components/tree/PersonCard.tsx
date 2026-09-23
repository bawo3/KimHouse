import type { Member, Spouse } from "@/lib/members/schema";
import styles from "./PersonCard.module.css";

// (라벨, 값) 쌍 목록에서 값이 있는 항목만 "라벨: 값" 문자열로 변환하는 공용 헬퍼
// - formatOptionalFields/formatSpouseOptionalFields가 공유하는 "값 있으면 push" 패턴을 한 곳에 모았다.
function formatFields(pairs: Array<[label: string, value: string | undefined]>): string[] {
  return pairs.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
}

// 본인(Member)의 선택 필드를 화면에 표시할 문자열 목록으로 변환한다.
function formatOptionalFields(member: Member): string[] {
  return formatFields([
    ["생년월일", member.birthDate],
    ["한자", member.hanjaName],
    ["연락처", member.phone],
    ["거주지", member.address],
    ["기일", member.deathDate],
  ]);
}

// 배우자(Spouse)의 선택 필드를 화면에 표시할 문자열 목록으로 변환한다.
function formatSpouseOptionalFields(spouse: Spouse): string[] {
  return formatFields([
    ["생년월일", spouse.birthDate],
    ["성씨/본관", spouse.clanName],
    ["연락처", spouse.phone],
    ["기일", spouse.deathDate],
  ]);
}

// 한 명의 인물 정보를 카드 형태로 렌더링하는 내부 전용 컴포넌트
// - 이름/필수정보(세대 또는 "배우자")는 일반 크기로
// - 선택 정보는 작은 글씨의 목록으로 표시
// - role="group" + aria-label로 스크린리더 사용자에게 "이 카드가 누구의 정보인지"를 구조적으로 전달한다.
function PersonInfo({
  name,
  requiredLabel,
  optionalFields,
  isSpouse,
  ariaLabel,
}: {
  name: string;
  requiredLabel: string;
  optionalFields: string[];
  isSpouse?: boolean;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={isSpouse ? `${styles.card} ${styles.spouseCard}` : styles.card}
    >
      <p className={styles.name}>{name}</p>
      <p className={styles.required}>{requiredLabel}</p>
      {optionalFields.length > 0 && (
        <ul className={styles.optionalList}>
          {optionalFields.map((field) => (
            <li key={field} className={styles.optionalItem}>
              {field}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 트리 뷰의 가장 기본 단위: 인물(및 배우자) 카드
// - member.spouse.name이 있을 때만 배우자 카드를 나란히 렌더링한다.
export function PersonCard({ member }: { member: Member }) {
  return (
    <div className={styles.pair} data-person-id={member.id}>
      <PersonInfo
        name={member.name}
        requiredLabel={`${member.generation}대손`}
        optionalFields={formatOptionalFields(member)}
        ariaLabel={`${member.name} 정보`}
      />
      {member.spouse?.name && (
        <PersonInfo
          name={member.spouse.name}
          requiredLabel="배우자"
          optionalFields={formatSpouseOptionalFields(member.spouse)}
          isSpouse
          ariaLabel={`${member.name}의 배우자 ${member.spouse.name} 정보`}
        />
      )}
    </div>
  );
}
