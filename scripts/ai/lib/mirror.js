// Markdown mirror rendering.
//
// The mirror is built from the *source* Markdown body, not from rendered HTML:
// that is the only form that preserves fenced code, tables and math without a
// second Markdown conversion. Theme-only tag syntax is converted explicitly and
// anything unrecognised is left in place so verify-ai-assets.js fails loudly
// instead of silently dropping content.
'use strict'

const { siteUrl } = require('./util')

const MORE_RE = /<!--\s*more\s*-->/gi
const HIDE_TOGGLE_RE = /\{%\s*hideToggle\s+([\s\S]*?)\s*%\}/g
const END_HIDE_TOGGLE_RE = /\{%\s*endhideToggle\s*%\}/g
const ROOT_RELATIVE_LINK_RE = /(!?\[[^\]]*\]\()(\/(?!\/)[^)\s]*)\)/g

function convertThemeTags (markdown) {
  return String(markdown)
    .replace(MORE_RE, '')
    // A hideToggle is a collapsible section: keep its title as a real heading so
    // the chapter structure survives in plain Markdown.
    .replace(HIDE_TOGGLE_RE, (match, title) => `### ${title.trim()}`)
    .replace(END_HIDE_TOGGLE_RE, '')
}

function absolutizeLinks (hexo, markdown) {
  const base = siteUrl(hexo)
  return String(markdown).replace(ROOT_RELATIVE_LINK_RE, (match, prefix, path) => `${prefix}${base}${path})`)
}

function transformBody (hexo, body) {
  return absolutizeLinks(hexo, convertThemeTags(body)).trim()
}

function metaLines (hexo, post) {
  const lines = [
    `原文（HTML）：${post.canonical}`,
    `Markdown 镜像：${post.mirror}`,
    '作者：SpeechlessPanda'
  ]
  if (post.series) {
    lines.push(`系列：${post.series.title}（第 ${post.series.ordinal} 篇，共 ${post.series.total} 篇）`)
  }
  lines.push(`首次发布：${post.published}`)
  lines.push(`最后更新：${post.updated}`)
  if (post.tags.length) lines.push(`标签：${post.tags.join('、')}`)
  lines.push(`版权：CC BY-NC-SA 4.0 · ${siteUrl(hexo)}/rights/`)
  return lines
}

function buildPostMirror (hexo, post) {
  return [
    `# ${post.title}`,
    '',
    ...metaLines(hexo, post).map(line => `> ${line}`),
    '',
    transformBody(hexo, post.body),
    ''
  ].join('\n')
}

// Series landing mirror: the index page has no article body, so the mirror is
// its description plus an ordered chapter list pointing at chapter mirrors.
function buildSeriesMirror (hexo, series) {
  const lines = [
    `# ${series.title}`,
    '',
    `> 原文（HTML）：${series.canonical}`,
    `> Markdown 镜像：${series.mirror}`,
    `> 章节数：${series.members.length}`,
    `> 首次发布：${series.created}`,
    `> 最后更新：${series.updated}`,
    `> 版权：CC BY-NC-SA 4.0 · ${siteUrl(hexo)}/rights/`,
    ''
  ]
  if (series.descriptionMarkdown) lines.push(transformBody(hexo, series.descriptionMarkdown), '')
  lines.push('## 章节', '')
  for (const member of series.members) {
    lines.push(`${member.series.ordinal}. [${member.title}](${member.mirror})（${member.published}）`)
  }
  lines.push('')
  return lines.join('\n')
}

module.exports = { buildPostMirror, buildSeriesMirror, transformBody }
