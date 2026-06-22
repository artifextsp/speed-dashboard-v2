const GITHUB_API = "https://api.github.com";

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function ghFetch(path, token, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: { ...githubHeaders(token), ...options.headers },
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = data?.message || data?.errors?.[0]?.message || res.statusText;
    const error = new Error(`GitHub API (${res.status}): ${msg}`);
    error.status = res.status;
    throw error;
  }

  return data;
}

async function createBlob(content, token, owner, repo) {
  return ghFetch(`/repos/${owner}/${repo}/git/blobs`, token, {
    method: "POST",
    body: JSON.stringify({ content, encoding: "utf-8" }),
  });
}

async function buildTreeEntries(files, token, owner, repo) {
  const treeEntries = [];
  for (const [path, content] of Object.entries(files)) {
    const blob = await createBlob(content, token, owner, repo);
    treeEntries.push({
      path,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }
  return treeEntries;
}

async function createTree(entries, baseTreeSha, token, owner, repo) {
  const body = baseTreeSha ? { base_tree: baseTreeSha, tree: entries } : { tree: entries };
  return ghFetch(`/repos/${owner}/${repo}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function createCommit(message, treeSha, parentSha, token, owner, repo) {
  const body = { message, tree: treeSha };
  if (parentSha) body.parents = [parentSha];
  return ghFetch(`/repos/${owner}/${repo}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function updateRef(refSha, token, owner, repo, branch) {
  return ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
    method: "PATCH",
    body: JSON.stringify({ sha: refSha, force: false }),
  });
}

async function createBranchRef(refSha, token, owner, repo, branch) {
  return ghFetch(`/repos/${owner}/${repo}/git/refs`, token, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: refSha }),
  });
}

async function getBranchRef(owner, repo, branch, token) {
  try {
    return await ghFetch(`/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export function getGitHubConfig() {
  const owner = import.meta.env.VITE_GITHUB_OWNER || "artifextsp";
  const repo = import.meta.env.VITE_GITHUB_REPO || "PILOTO";
  const branch = import.meta.env.VITE_GITHUB_BRANCH || "main";
  const token = import.meta.env.VITE_GITHUB_PAT || "";

  return { owner, repo, branch, token };
}

export function validateGitHubConfig(config = getGitHubConfig()) {
  if (!config.token) {
    return {
      ok: false,
      error:
        "Falta VITE_GITHUB_PAT en .env.local. Crea un Personal Access Token con permiso repo.",
    };
  }
  return { ok: true };
}

/**
 * Publica archivos al repo de GitHub Pages en un solo commit.
 * Si el repo está vacío, crea la rama main con el primer commit.
 */
export async function publishToGitHub(files, options = {}) {
  const config = { ...getGitHubConfig(), ...options };
  const validation = validateGitHubConfig(config);
  if (!validation.ok) throw new Error(validation.error);

  const { owner, repo, branch, token } = config;
  const ref = await getBranchRef(owner, repo, branch, token);
  const isNewRepo = !ref;

  const treeEntries = await buildTreeEntries(files, token, owner, repo);
  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const message = isNewRepo
    ? `Inicializar sitio SPEED · ${timestamp}`
    : `Publicar sitio SPEED · ${timestamp}`;

  let tree;
  let commit;

  if (isNewRepo) {
    tree = await createTree(treeEntries, null, token, owner, repo);
    commit = await createCommit(message, tree.sha, null, token, owner, repo);
    await createBranchRef(commit.sha, token, owner, repo, branch);
  } else {
    const parentSha = ref.object.sha;
    const parentCommit = await ghFetch(
      `/repos/${owner}/${repo}/git/commits/${parentSha}`,
      token
    );
    tree = await createTree(treeEntries, parentCommit.tree.sha, token, owner, repo);
    commit = await createCommit(message, tree.sha, parentSha, token, owner, repo);
    await updateRef(commit.sha, token, owner, repo, branch);
  }

  return {
    commitSha: commit.sha,
    commitUrl: `https://github.com/${owner}/${repo}/commit/${commit.sha}`,
    siteUrl: `https://${owner}.github.io/${repo}/`,
    fileCount: treeEntries.length,
    initialized: isNewRepo,
  };
}
