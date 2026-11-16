#!/usr/bin/env bun
/**
 * Mechanical collect for sync-starred-projects.
 * Run from repo root:
 *   HTTPS_PROXY= HTTP_PROXY= bun .agents/skills/sync-starred-projects/scripts/collect.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), "../../../.."));
const BLOG = join(ROOT, "source/_posts/项目收藏.md");
const DELETED_FILE = join(ROOT, ".agents/skills/sync-starred-projects/references/deleted-projects.md");
const USER = "SpeechlessPanda";
const CONCURRENCY = 8;

function formatStars(n) {
  if (n >= 1000) return (Math.round(n / 100) / 10).toFixed(1) + "k";
  return String(n);
}

// 「本次新增」的页内锚点用：项目名转 proj- slug，与博客里的 <span id> 一致。
function slugName(name) {
  return (
    "proj-" +
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

function parseDeleted(text) {
  const names = new Set();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*-\s+([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+)/);
    if (m) names.add(m[1].toLowerCase());
  }
  return names;
}

function parseBlog(text) {
  const seen = new Set();
  const repos = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/https:\/\/github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)/);
    if (!m) continue;
    const owner = m[1];
    const repo = m[2];
    const key = `${owner}/${repo}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const sm = line.match(/⭐\s+([0-9]+(?:\.[0-9]+)?k?)/);
    repos.push({ owner, repo, key, blogStars: sm ? sm[1] : null });
  }
  return repos;
}

function ghEnv() {
  return {
    ...process.env,
    HTTPS_PROXY: "",
    HTTP_PROXY: "",
    http_proxy: "",
    https_proxy: "",
    ALL_PROXY: "",
    all_proxy: "",
  };
}

const RETRIES = 4;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ghApiOnce(path) {
  const proc = Bun.spawn(["gh", "api", path], {
    cwd: ROOT,
    env: ghEnv(),
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    const msg = stderr.trim() || stdout.trim();
    const status = Number((msg.match(/HTTP (\d{3})/) || [])[1]) || null;
    throw Object.assign(new Error(`gh api ${path} failed (${code}): ${msg}`), { status });
  }
  return JSON.parse(stdout);
}

// TLS handshake timeout / EOF 是 GitHub API 偶发问题，不是条目不存在。
// 不重试会让 blog[] 出现 null star，上游会把它当"数字没变"漏更新。
// 重试耗尽后保留 HTTP 状态码：404/451 是仓库被删除、转私有或 DMCA 封禁，
// 和网络错误必须分开处理（前者要从博客移除，后者要重跑）。
const GONE_STATUS = new Set([404, 451]);

async function ghApi(path) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      return await ghApiOnce(path);
    } catch (err) {
      lastErr = err;
      // 404/451 是确定性结果（删除、转私有、DMCA），重试只会拖慢并掩盖原因。
      if (GONE_STATUS.has(err.status)) break;
      if (attempt === RETRIES) break;
      await sleep(attempt * 900);
    }
  }
  throw lastErr;
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function allStarred() {
  const names = [];
  for (let page = 1; ; page++) {
    const rows = await ghApi(`users/${USER}/starred?per_page=100&page=${page}`);
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const row of rows) names.push(row.full_name);
    if (rows.length < 100) break;
  }
  return names;
}

const blogText = readFileSync(BLOG, "utf8");
const deleted = parseDeleted(readFileSync(DELETED_FILE, "utf8"));
const blogRepos = parseBlog(blogText);

const blog = await mapPool(blogRepos, CONCURRENCY, async (r) => {
  try {
    const json = await ghApi(`repos/${r.owner}/${r.repo}`);
    const formatted = formatStars(json.stargazers_count);
    return {
      blog: `${r.owner}/${r.repo}`,
      canonical: json.full_name,
      blogStars: r.blogStars,
      apiStars: json.stargazers_count,
      formatted,
      starChanged: r.blogStars !== formatted,
      renamed: json.full_name.toLowerCase() !== r.key,
      description: json.description,
      homepage: json.homepage || "",
      topics: json.topics || [],
      archived: json.archived === true,
      pushedAt: json.pushed_at || null,
      status: 200,
      gone: false,
      error: null,
    };
  } catch (err) {
    return {
      blog: `${r.owner}/${r.repo}`,
      canonical: `${r.owner}/${r.repo}`,
      blogStars: r.blogStars,
      apiStars: null,
      formatted: null,
      starChanged: false,
      renamed: false,
      description: null,
      homepage: "",
      topics: [],
      archived: false,
      pushedAt: null,
      status: err.status || null,
      gone: GONE_STATUS.has(err.status),
      error: String(err.message || err),
    };
  }
});

// 404/451 决定删除条目，值得再确认一次：排除偶发的鉴权抖动或代理拦截。
const goneRows = blog.filter((r) => r.gone);
for (const row of goneRows) {
  await sleep(1200);
  try {
    await ghApiOnce(`repos/${row.blog}`);
    row.gone = false;
    row.status = 200;
    row.error = `${row.error} (复查已存在，按瞬时错误处理)`;
  } catch (err) {
    if (!GONE_STATUS.has(err.status)) {
      // 复查变成网络错误 → 无法确认，交给人工
      row.gone = false;
      row.error = `${row.error} (复查失败: ${err.message})`;
    }
  }
}

const starred = await allStarred();
const inBlog = new Set();
for (const row of blog) {
  inBlog.add(row.blog.toLowerCase());
  inBlog.add(row.canonical.toLowerCase());
}

const skippedOwn = [];
const skippedDeleted = [];
const newStarNames = [];
for (const name of starred) {
  const key = name.toLowerCase();
  if (inBlog.has(key)) continue;
  if (key.startsWith(`${USER.toLowerCase()}/`)) {
    skippedOwn.push(name);
    continue;
  }
  if (deleted.has(key)) {
    skippedDeleted.push(name);
    continue;
  }
  newStarNames.push(name);
}

const newStars = await mapPool(newStarNames, CONCURRENCY, async (full) => {
  try {
    const json = await ghApi(`repos/${full}`);
    return {
      full_name: json.full_name,
      slug: slugName(json.name || full.split("/")[1]),
      stargazers_count: json.stargazers_count,
      formatted: formatStars(json.stargazers_count),
      description: json.description,
      homepage: json.homepage || "",
      topics: json.topics || [],
      status: 200,
      gone: false,
      error: null,
    };
  } catch (err) {
    return {
      full_name: full,
      stargazers_count: null,
      formatted: null,
      description: null,
      homepage: "",
      topics: [],
      status: err.status || null,
      gone: GONE_STATUS.has(err.status),
      error: String(err.message || err),
    };
  }
});

const goneBlog = blog.filter((r) => r.gone);
const goneNewStars = newStars.filter((r) => r.gone);
const transientErrors = [...blog, ...newStars].filter((r) => r.error && !r.gone);

// 锚点体检：文首「本次新增」的 #proj-* 必须命中正文 span，且 id 不得重复。
const anchorIds = [...blogText.matchAll(/<span id="(proj-[^"]+)"/g)].map((m) => m[1]);
const anchorHrefs = [...blogText.matchAll(/\]\([^)\s]*#(proj-[^)\s]+)\)/g)].map((m) => m[1]);
const dupAnchors = anchorIds.filter((id, i) => anchorIds.indexOf(id) !== i);
const brokenAnchors = anchorHrefs.filter((h) => !anchorIds.includes(h));

const payload = {
  date: new Date().toISOString().slice(0, 10),
  // ok 只反映"需要重跑"的失败；404/451 是可执行结论（删条目），不算失败。
  ok: transientErrors.length === 0,
  blogCount: blog.length,
  starredCount: starred.length,
  starChanged: blog.filter((r) => r.starChanged).length,
  renamed: blog.filter((r) => r.renamed),
  gone: goneBlog.map((r) => ({ blog: r.blog, status: r.status })),
  goneNewStars: goneNewStars.map((r) => ({ full_name: r.full_name, status: r.status })),
  archived: blog.filter((r) => r.archived).map((r) => r.blog),
  anchors: { broken: brokenAnchors, duplicated: [...new Set(dupAnchors)] },
  errors: transientErrors,
  blog,
  newStars,
  skippedDeleted,
  skippedOwn,
};

process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
