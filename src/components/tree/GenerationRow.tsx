import type { Member } from "@/lib/members/schema";
import { PersonCard } from "./PersonCard";
import styles from "./GenerationRow.module.css";

// 세대별 배경색을 순환시키는 팔레트 개수 (GenerationRow.module.css의 data-palette 1~5와 맞춘다)
const PALETTE_SIZE = 5;

// 한 세대(generation)에 속한 인물들을 가로로 나열하는 행 컴포넌트
// - 세대 번호를 라벨로 보여주고, 각 인물은 PersonCard로 재사용해서 렌더링한다.
// - 세대 번호에 따라 팔레트 인덱스(1~5)를 순환시켜 은은한 배경색을 구분한다.
export function GenerationRow({ generation, members }: { generation: number; members: Member[] }) {
  const paletteIndex = ((generation - 1) % PALETTE_SIZE) + 1;

  return (
    <section className={styles.row} data-generation={generation} data-palette={paletteIndex}>
      <span className={styles.label}>{generation}대</span>
      <div className={styles.cards}>
        {members.map((member) => (
          <PersonCard key={member.id} member={member} />
        ))}
      </div>
    </section>
  );
}
