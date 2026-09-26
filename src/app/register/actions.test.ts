import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCommitFile = vi.fn();

// commitFile은 실제 GitHub API를 호출하므로, registerAction의 검증 로직만
// 독립적으로 테스트하기 위해 mock 처리한다 (Task 5 client.test.ts의 패턴 참고).
vi.mock("@/lib/github/client", () => ({
  commitFile: mockCommitFile,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("registerAction", () => {
  it("세대가 정수가 아니면 에러를 반환하고 commitFile을 호출하지 않는다", async () => {
    const { registerAction } = await import("./actions");
    const formData = buildFormData({ name: "김삼순", generation: "3.5", phone: "01011112222" });

    const result = await registerAction({}, formData);

    expect(result.error).toBeDefined();
    expect(mockCommitFile).not.toHaveBeenCalled();
  });

  it("세대가 0 이하이면 에러를 반환한다", async () => {
    const { registerAction } = await import("./actions");
    const formData = buildFormData({ name: "김삼순", generation: "0", phone: "01011112222" });

    const result = await registerAction({}, formData);

    expect(result.error).toBeDefined();
    expect(mockCommitFile).not.toHaveBeenCalled();
  });

  it("이름이 비어 있으면 에러를 반환한다", async () => {
    const { registerAction } = await import("./actions");
    const formData = buildFormData({ name: "  ", generation: "3", phone: "01011112222" });

    const result = await registerAction({}, formData);

    expect(result.error).toBeDefined();
    expect(mockCommitFile).not.toHaveBeenCalled();
  });

  it("연락처가 비어 있으면 에러를 반환한다", async () => {
    const { registerAction } = await import("./actions");
    const formData = buildFormData({ name: "김삼순", generation: "3", phone: "" });

    const result = await registerAction({}, formData);

    expect(result.error).toBeDefined();
    expect(mockCommitFile).not.toHaveBeenCalled();
  });

  it("입력이 모두 올바르면 commitFile을 호출하고 성공 상태를 반환한다", async () => {
    mockCommitFile.mockResolvedValue(undefined);
    const { registerAction } = await import("./actions");
    const formData = buildFormData({ name: "김삼순", generation: "3", phone: "01011112222" });

    const result = await registerAction({}, formData);

    expect(result.success).toBe(true);
    expect(mockCommitFile).toHaveBeenCalledTimes(1);

    const [path, content, message] = mockCommitFile.mock.calls[0];
    expect(path).toMatch(/^data\/pending\/.+\.json$/);
    expect(message).toContain("김삼순");

    const parsed = JSON.parse(content as string);
    expect(parsed.member).toEqual({
      name: "김삼순",
      generation: 3,
      parentId: null,
      phone: "01011112222",
    });
  });
});
