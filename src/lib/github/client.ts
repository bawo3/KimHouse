import { Octokit } from "octokit";

// GitHub API 호출에 필요한 설정값을 한데 묶은 타입.
// Octokit 인스턴스를 포함시켜서, commitFile/deleteFileIfExists 내부에서
// getConfig()를 한 번만 호출하고 그 결과를 그대로 재사용하도록 한다
// (그렇지 않으면 getExistingSha가 또 getConfig()를 불러서 Octokit이 중복 생성된다).
interface GithubConfig {
  octokit: Octokit;
  owner: string;
  repo: string;
  branch: string;
}

// GitHub API 호출에 필요한 설정값(토큰, owner, repo, branch)을 환경변수에서 읽어온다.
// 환경변수가 하나라도 빠지면 즉시 에러를 던져서, 잘못된 설정으로 조용히 실패하는 것을 막는다.
function getConfig(): GithubConfig {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token || !owner || !repo) {
    throw new Error(
      "GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO 환경변수가 모두 설정되어야 GitHub API를 쓸 수 있습니다."
    );
  }

  return { octokit: new Octokit({ auth: token }), owner, repo, branch };
}

// 저장소에 해당 경로의 파일이 이미 존재하는지 확인하고, 있다면 그 파일의 sha를 반환한다.
// 파일이 없을 때(404)는 undefined를 반환하고, 그 외의 에러(인증 실패, 네트워크 오류 등)는
// 그대로 다시 던져서 호출한 쪽에서 실패를 알아챌 수 있게 한다.
// 이미 만들어진 config를 인자로 받아서 Octokit 인스턴스를 재사용한다(중복 생성 방지).
async function getExistingSha(config: GithubConfig, path: string): Promise<string | undefined> {
  const { octokit, owner, repo, branch } = config;
  try {
    const response = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
    const data = response.data as { sha?: string };
    return data.sha;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return undefined;
    throw error;
  }
}

// 파일을 커밋한다. 기존 파일이 있으면 sha를 함께 보내 덮어쓰고, 없으면 새로 생성한다.
// GitHub API는 파일 내용을 base64로 인코딩해서 받기 때문에 여기서 변환해준다.
export async function commitFile(path: string, content: string, message: string): Promise<void> {
  const config = getConfig();
  const sha = await getExistingSha(config, path);

  await config.octokit.rest.repos.createOrUpdateFileContents({
    owner: config.owner,
    repo: config.repo,
    path,
    message,
    branch: config.branch,
    sha,
    content: Buffer.from(content, "utf-8").toString("base64"),
  });
}

// 파일이 존재하면 삭제하고, 없으면 아무 것도 하지 않는다(에러를 던지지 않고 조용히 끝낸다).
export async function deleteFileIfExists(path: string, message: string): Promise<void> {
  const config = getConfig();
  const sha = await getExistingSha(config, path);
  if (!sha) return;

  await config.octokit.rest.repos.deleteFile({
    owner: config.owner,
    repo: config.repo,
    path,
    message,
    branch: config.branch,
    sha,
  });
}
