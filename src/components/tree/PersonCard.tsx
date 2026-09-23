import type { Member, Spouse } from "@/lib/members/schema";
import styles from "./PersonCard.module.css";

// 본인(Member)의 선택 필드를 화면에 표시할 문자열 목록으로 변환한다.
function formatOptionalFields(member: Member): string[] {
  const fields: string[] = [];
  if (member.birthDate) fields.push(`생년월일: ${member.birthDate}`);
  if (member.hanjaName) fields.push(`한자: ${member.hanjaName}`);
  if (member.phone) fields.push(`연락처: ${member.phone}`);
  if (member.address) fields.push(`거주지: ${member.address}`);
  if (member.deathDate) fields.push(`기일: ${member.deathDate}`);
  return fields;
}

// 배우자(Spouse)의 선택 필드를 화면에 표시할 문자열 목록으로 변환한다.
function formatSpouseFields(spouse: Spouse): string[] {
  const fields: string[] = [];
  if (spouse.birthDate) fields.push(`생년월일: ${spouse.birthDate}`);
  if (spouse.clanName) fields.push(`성씨/본관: ${spouse.clanName}`);
  if (spouse.phone) fields.push(`연락처: ${spouse.phone}`);
  if (spouse.deathDate) fields.push(`기일: ${spouse.deathDate}`);
  return fields;
}

// 한 명의 인물 정보를 카드 형태로 렌더링하는 내부 전용 컴포넌트
// - 이름/필수정보(세대 또는 "배우자")는 일반 크기로
// - 선택 정보는 작은 글씨의 목록으로 표시
function PersonInfo({
  name,
  requiredLabel,
  optionalFields,
  isSpouse,
}: {
  name: string;
  requiredLabel: string;
  optionalFields: string[];
  isSpouse?: boolean;
}) {
  return (
    <div className={isSpouse ? `${styles.card} ${styles.spouseCard}` : styles.card}>
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
      />
      {member.spouse?.name && (
        <PersonInfo
          name={member.spouse.name}
          requiredLabel="배우자"
          optionalFields={formatSpouseFields(member.spouse)}
          isSpouse
        />
      )}
    </div>
  );
}
