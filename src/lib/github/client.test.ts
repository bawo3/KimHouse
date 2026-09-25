import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetContent = vi.fn();
const mockCreateOrUpdateFileContents = vi.fn();
const mockDeleteFile = vi.fn();

// 참고: Octokit은 실제로 `new Octokit(...)`로 생성하는 클래스이므로,
// mock도 new로 호출 가능해야 한다. 화살표 함수는 JS 문법상 생성자로 쓸 수 없어서
// (`() => (...)` 는 new와 함께 쓰면 "is not a constructor" 에러가 남),
// 일반 function으로 구현해야 실제 Vitest 환경에서 정상 동작한다.
vi.mock("octokit", () => ({
  Octokit: vi.fn().mockImplementation(function () {
    return {
      rest: {
        repos: {
          getContent: mockGetContent,
          createOrUpdateFileContents: mockCreateOrUpdateFileContents,
          deleteFile: mockDeleteFile,
        },
      },
    };
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GITHUB_TOKEN = "test-token";
  process.env.GITHUB_OWNER = "bawo3";
  process.env.GITHUB_REPO = "KimHouse";
  process.env.GITHUB_BRANCH = "main";
});

describe("commitFile", () => {
  it("기존 파일이 없으면 sha 없이 새로 커밋한다", async () => {
    mockGetContent.mockRejectedValue({ status: 404 });
    mockCreateOrUpdateFileContents.mockResolvedValue({});

    const { commitFile } = await import("./client");
    await commitFile("data/pending/req-1.json", '{"hello":"world"}', "add pending request");

    expect(mockCreateOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "bawo3",
        repo: "KimHouse",
        path: "data/pending/req-1.json",
        message: "add pending request",
        branch: "main",
        sha: undefined,
      })
    );
  });

  it("기존 파일이 있으면 sha를 함께 보내 덮어쓴다", async () => {
    mockGetContent.mockResolvedValue({ data: { sha: "abc123" } });
    mockCreateOrUpdateFileContents.mockResolvedValue({});

    const { commitFile } = await import("./client");
    await commitFile("data/members.json", "[]", "update members");

    expect(mockCreateOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({ sha: "abc123" })
    );
  });
});

describe("deleteFileIfExists", () => {
  it("파일이 있으면 삭제한다", async () => {
    mockGetContent.mockResolvedValue({ data: { sha: "def456" } });
    mockDeleteFile.mockResolvedValue({});

    const { deleteFileIfExists } = await import("./client");
    await deleteFileIfExists("data/pending/req-1.json", "approve request");

    expect(mockDeleteFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: "data/pending/req-1.json", sha: "def456" })
    );
  });

  it("파일이 없으면 조용히 아무 것도 하지 않는다", async () => {
    mockGetContent.mockRejectedValue({ status: 404 });

    const { deleteFileIfExists } = await import("./client");
    await deleteFileIfExists("data/pending/missing.json", "no-op");

    expect(mockDeleteFile).not.toHaveBeenCalled();
  });
});
