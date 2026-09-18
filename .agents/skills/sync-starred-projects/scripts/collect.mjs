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

async function ghApi(path) {
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
    throw new Error(`gh api ${path} failed (${code}): ${stderr.trim() || stdout.trim()}`);
  }
  return JSON.parse(stdout);
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
      error: String(err.message || err),
    };
  }
});

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
  const json = await ghApi(`repos/${full}`);
  return {
    full_name: json.full_name,
    stargazers_count: json.stargazers_count,
    formatted: formatStars(json.stargazers_count),
    description: json.description,
    homepage: json.homepage || "",
    topics: json.topics || [],
  };
});

const payload = {
  date: new Date().toISOString().slice(0, 10),
  blogCount: blog.length,
  starredCount: starred.length,
  starChanged: blog.filter((r) => r.starChanged).length,
  renamed: blog.filter((r) => r.renamed),
  errors: blog.filter((r) => r.error),
  blog,
  newStars,
  skippedDeleted,
  skippedOwn,
};

process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
