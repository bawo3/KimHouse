import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Member } from "@/lib/members/schema";

const mockCommitFile = vi.fn();
const mockGetSession = vi.fn();
const mockLoadMembersFromDisk = vi.fn();

// commitFile은 실제 GitHub API를 호출하므로 mock 처리한다 (register/actions.test.ts 패턴 재사용).
vi.mock("@/lib/github/client", () => ({
  commitFile: mockCommitFile,
}));

// assertElevated()가 세션을 확인하는 부분을 독립적으로 테스트하기 위해 mock 처리한다.
vi.mock("@/lib/auth/getSession", () => ({
  getSession: mockGetSession,
}));

// data/members.json 실제 파일 내용에 테스트가 의존하지 않도록 mock 처리한다.
vi.mock("@/lib/members/load", () => ({
  loadMembersFromDisk: mockLoadMembersFromDisk,
}));

const baseMembers: Member[] = [
  { id: "parent-1", name: "김할아버지", generation: 5, parentId: null, role: "owner" },
];

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ memberId: "admin-1", role: "admin" });
  mockLoadMembersFromDisk.mockReturnValue([...baseMembers]);
});

describe("addMemberAction", () => {
  it("이름이 없으면 에러를 반환하고 commitFile을 호출하지 않는다", async () => {
    const { addMemberAction } = await import("./actions");
    const formData = buildFormData({ name: "   ", generation: "6" });

    const result = await addMemberAction({}, formData);

    expect(result.error).toBeDefined();
    expect(mockCommitFile).not.toHaveBeenCalled();
  });

  it("parentId가 존재하는 회원을 가리키면 generation이 parent+1로 계산되어 커밋된다", async () => {
    mockCommitFile.mockResolvedValue(undefined);
    const { addMemberAction } = await import("./actions");
    // 클라이언트가 잘못된(혹은 무관한) generation 값을 같이 보내도 서버가 무시하고 재계산해야 한다.
    const formData = buildFormData({ name: "김손자", parentId: "parent-1", generation: "999" });

    const result = await addMemberAction({}, formData);

    expect(result.success).toBe(true);
    expect(mockCommitFile).toHaveBeenCalledTimes(1);

    const [, content] = mockCommitFile.mock.calls[0];
    const committed = JSON.parse(content as string) as Member[];
    const added = committed.find((member) => member.name === "김손자");
    expect(added?.generation).toBe(6);
    expect(added?.parentId).toBe("parent-1");
  });

  it("parentId가 존재하지 않는 id면 에러를 반환한다", async () => {
    const { addMemberAction } = await import("./actions");
    const formData = buildFormData({ name: "김손자", parentId: "no-such-id" });

    const result = await addMemberAction({}, formData);

    expect(result.error).toBeDefined();
    expect(mockCommitFile).not.toHaveBeenCalled();
  });

  it("parentId 없이 generation이 정수가 아니면 에러를 반환한다", async () => {
    const { addMemberAction } = await import("./actions");
    const formData = buildFormData({ name: "김독립", generation: "3.5" });

    const result = await addMemberAction({}, formData);

    expect(result.error).toBeDefined();
    expect(mockCommitFile).not.toHaveBeenCalled();
  });

  it("parentId 없이 generation이 0 이하이면 에러를 반환한다", async () => {
    const { addMemberAction } = await import("./actions");
    const formData = buildFormData({ name: "김독립", generation: "0" });

    const result = await addMemberAction({}, formData);

    expect(result.error).toBeDefined();
    expect(mockCommitFile).not.toHaveBeenCalled();
  });

  it("정상 입력이면 성공하고 커밋된 배열에 새 레코드가 추가된다", async () => {
    mockCommitFile.mockResolvedValue(undefined);
    const { addMemberAction } = await import("./actions");
    const formData = buildFormData({
      name: "김독립",
      generation: "3",
      birthDate: "1990-01-01",
      hanjaName: "金獨立",
      phone: "01000000000",
      address: "서울",
      deathDate: "",
      spouseName: "이배우자",
      spouseBirthDate: "1991-02-02",
      spouseClanName: "전주 이씨",
      spousePhone: "01099998888",
      spouseDeathDate: "",
    });

    const result = await addMemberAction({}, formData);

    expect(result.success).toBe(true);
    expect(mockCommitFile).toHaveBeenCalledTimes(1);

    const [path, content, message] = mockCommitFile.mock.calls[0];
    expect(path).toBe("data/members.json");
    expect(message).toContain("김독립");

    const committed = JSON.parse(content as string) as Member[];
    expect(committed).toHaveLength(baseMembers.length + 1);

    const added = committed.find((member) => member.name === "김독립");
    expect(added).toBeDefined();
    expect(added?.generation).toBe(3);
    expect(added?.parentId).toBeNull();
    expect(added?.birthDate).toBe("1990-01-01");
    expect(added?.hanjaName).toBe("金獨立");
    expect(added?.phone).toBe("01000000000");
    expect(added?.address).toBe("서울");
    expect(added?.deathDate).toBeUndefined();
    expect(added?.spouse).toEqual({
      name: "이배우자",
      birthDate: "1991-02-02",
      clanName: "전주 이씨",
      phone: "01099998888",
      deathDate: undefined,
    });
    // role은 이 폼에서 절대 설정될 수 없어야 한다 (권한 상승 방지).
    expect(added?.role).toBeUndefined();
  });

  it("배우자 이름을 입력하지 않으면 spouse 필드 자체가 없다", async () => {
    mockCommitFile.mockResolvedValue(undefined);
    const { addMemberAction } = await import("./actions");
    const formData = buildFormData({ name: "김독립", generation: "3" });

    const result = await addMemberAction({}, formData);

    expect(result.success).toBe(true);
    const [, content] = mockCommitFile.mock.calls[0];
    const committed = JSON.parse(content as string) as Member[];
    const added = committed.find((member) => member.name === "김독립");
    expect(added?.spouse).toBeUndefined();
  });

  it("세션이 없으면 에러를 던지고 commitFile을 호출하지 않는다", async () => {
    mockGetSession.mockResolvedValue(null);
    const { addMemberAction } = await import("./actions");
    const formData = buildFormData({ name: "김독립", generation: "3" });

    await expect(addMemberAction({}, formData)).rejects.toThrow();
    expect(mockCommitFile).not.toHaveBeenCalled();
  });

  it("일반 회원(role 없음) 세션이면 에러를 던지고 commitFile을 호출하지 않는다", async () => {
    mockGetSession.mockResolvedValue({ memberId: "member-1" });
    const { addMemberAction } = await import("./actions");
    const formData = buildFormData({ name: "김독립", generation: "3" });

    await expect(addMemberAction({}, formData)).rejects.toThrow();
    expect(mockCommitFile).not.toHaveBeenCalled();
  });
});
