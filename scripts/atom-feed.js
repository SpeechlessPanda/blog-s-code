// scripts/atom-feed.js
// 自定义 Atom feed 生成器，替代 hexo-generator-feed（官方插件只遍历 posts，看不到 _data 里的碎碎念）。
// 功能：
//   1. 文章 + 碎碎念（source/_data/shuoshuo.yml）按日期倒序混排进同一个 atom.xml
//   2. 文章「更新距发布超过 1 天」时给条目换身份标识，RSS 阅读器会当作新条目推送
//      （依赖部署 workflow 按 git 历史恢复文件 mtime，否则 CI 上所有文章 updated 都等于构建时间）
//   3. 碎碎念日期按 +08:00 显式解析，与构建机器时区无关，保证 id 稳定
//
// 条目身份标识设计（兼容所有 RSS 阅读器的关键）：
//   id/link 的区分信息全部放在 URL **路径**里，不用 query 也不用 fragment——
//   有阅读器归一化 guid 时丢弃 fragment（如 RSSFlow），也有阅读器丢弃 query，
//   路径是唯一所有阅读器都不会动的成分。代价是这些 URL 必须真实可访问：
//   - 每条碎碎念生成独立页 /memos/<时间戳>/（noindex，附带返回 /memos/ 的链接）
//   - 每次旧文更新生成 stub 页 /文章路径/u/<更新时间>/（meta refresh 跳回原文）
//
// 注意：本脚本手写 XML，不依赖 hexo-util / feedsmith（pnpm 下它们不是顶层依赖，require 不到）。
// 需在 _config.yml 设置 feed.enable: false 关闭官方插件，避免两个 generator 抢同一路径。
'use strict'

const FEED_PATH = 'atom.xml'
const POST_LIMIT = 20
const EXCERPT_LIMIT = 140
const UPDATE_NOTIFY_MS = 24 * 60 * 60 * 1000 // 更新距发布超过此阈值才向订阅者推送
const MEMO_TZ_OFFSET = '+08:00' // 碎碎念里的日期按北京时间书写，显式指定避免受构建机器时区影响

function escapeXml (s) {
  return String(s == null ? '' : s).replace(/[<>&'"]/g, c => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  ))
}

// CDATA 中不能出现 "]]>"，拆分转义
function cdata (s) {
  return '<![CDATA[' + String(s == null ? '' : s).replace(/\]\]>/g, ']]]]><![CDATA[>') + ']]>'
}

function stripHtml (html) {
  return String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

// 碎碎念日期 "2026-08-23 23:30"（可带秒）按北京时间解析
function parseMemoDate (str) {
  const t = String(str).trim().replace(' ', 'T')
  const withSec = /T\d{2}:\d{2}:\d{2}/.test(t) ? t : t + ':00'
  const d = new Date(withSec + MEMO_TZ_OFFSET)
  return isNaN(d.getTime()) ? null : d
}

// Date -> 路径安全的时间戳 "2026-08-25T15-30"（统一用北京时间，与构建机器时区无关）
function pathStamp (date) {
  return new Date(date.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 16).replace(':', '-')
}

// Date -> 紧凑时间戳 "20260804-131600"（用于文章更新 stub 路径）
function compactStamp (date) {
  return date.toISOString().slice(0, 19).replace(/-/g, '').replace(/:/g, '').replace('T', '-')
}

function postSummary (post) {
  if (post.description) return post.description
  if (post.intro) return post.intro
  if (post.excerpt) return post.excerpt
  if (post.content) return post.content.substring(0, EXCERPT_LIMIT)
  return ''
}

// 碎碎念独立页：RSS 里碎碎念的链接要真实可点，主题 /memos/ 页由前端 JS 渲染、没有单条页面，
// 这里为每条生成一个极简 noindex 页面
function memoPageHtml (dateStr, contentHtml, memosUrl) {
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex,follow">' +
    `<title>碎碎念 · ${escapeXml(dateStr)}</title>` +
    `<link rel="canonical" href="${escapeXml(memosUrl)}">` +
    '<style>body{max-width:40rem;margin:3rem auto;padding:0 1rem;line-height:1.7;' +
    'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#24292f}' +
    'header{color:#6a737d;font-size:.9rem;margin-bottom:1rem}a{color:#1f6feb}img{max-width:100%}' +
    'footer{margin-top:2rem;font-size:.9rem}</style></head><body><article>' +
    `<header>碎碎念 · <time>${escapeXml(dateStr)}</time></header>` +
    `<div>${contentHtml}</div>` +
    `<footer><a href="${escapeXml(memosUrl)}">← 查看全部碎碎念</a></footer>` +
    '</article></body></html>'
}

// 旧文更新 stub 页：更新推送条目的链接指向这里，立即跳回原文
function updateStubHtml (post) {
  const url = post.permalink
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<meta name="robots" content="noindex,follow">' +
    `<meta http-equiv="refresh" content="0;url=${escapeXml(url)}">` +
    `<link rel="canonical" href="${escapeXml(url)}">` +
    `<title>${escapeXml(post.title)}（有更新）</title></head><body>` +
    `<p>《${escapeXml(post.title)}》有更新，正在跳转原文… <a href="${escapeXml(url)}">点击直达</a></p>` +
    '</body></html>'
}

function buildPostEntry (post, authorXml) {
  const published = post.date.toDate()
  const updated = post.updated ? post.updated.toDate() : published
  // 更新距发布超过阈值 → 条目 id/link 指向更新 stub 页（路径含更新时间戳，任何阅读器都无法折叠）；
  // 否则 id/link 保持稳定（permalink），避免误触发
  const meaningfulUpdate = (updated - published) > UPDATE_NOTIFY_MS
  const updateUrl = meaningfulUpdate ? `${post.permalink}u/${compactStamp(updated)}/` : null
  const id = updateUrl || post.permalink
  const categories = [
    ...(post.categories ? post.categories.toArray() : []),
    ...(post.tags ? post.tags.toArray() : [])
  ].map(item => `<category term="${escapeXml(item.name)}" scheme="${escapeXml(item.permalink)}"/>`).join('')
  const content = (post.content || '').replace(/[\x00-\x1F\x7F]/g, '') // eslint-disable-line no-control-regex

  return {
    published,
    updated,
    // 更新 stub 页路由（供 generator 一并输出）
    stubRoute: updateUrl ? { path: `${post.path}u/${compactStamp(updated)}/index.html`, data: updateStubHtml(post) } : null,
    xml: `<entry>${authorXml}${categories}<content type="html">${cdata(content)}</content>` +
      `<id>${escapeXml(id)}</id><link href="${escapeXml(id)}"/>` +
      `<published>${published.toISOString()}</published>` +
      `<summary type="html">${cdata(postSummary(post))}</summary>` +
      `<title>${escapeXml(post.title)}</title><updated>${updated.toISOString()}</updated></entry>`
  }
}

function buildMemoEntry (item, memosUrl, author, usedIds) {
  const date = parseMemoDate(item.date)
  if (!date) return null
  const html = hexo.render.renderSync({ text: item.content || '', engine: 'markdown' })
    .replace(/[\x00-\x1F\x7F]/g, '') // eslint-disable-line no-control-regex
  // 同一分钟内有多条碎碎念时按文件内出现顺序加序号去重（文件顺序稳定，id 即稳定）
  const stamp = pathStamp(date)
  let slug = stamp
  for (let i = 2; usedIds.has(slug); i++) slug = `${stamp}-${i}`
  usedIds.add(slug)
  const url = `${memosUrl}${slug}/`
  const tags = (item.tags || []).map(t => `<category term="${escapeXml(t)}"/>`).join('')
  const authorXml = `<author><name>${escapeXml(item.author || author)}</name></author>`
  const dateStr = stamp.slice(0, 10) + ' ' + stamp.slice(11).replace('-', ':')

  return {
    published: date,
    updated: date,
    // 碎碎念独立页路由
    pageRoute: { path: `memos/${slug}/index.html`, data: memoPageHtml(dateStr, html, memosUrl) },
    xml: `<entry>${authorXml}${tags}<content type="html">${cdata(html)}</content>` +
      `<id>${escapeXml(url)}</id><link href="${escapeXml(url)}"/>` +
      `<published>${date.toISOString()}</published>` +
      `<summary type="html">${cdata(stripHtml(html).substring(0, EXCERPT_LIMIT))}</summary>` +
      `<title>碎碎念</title><updated>${date.toISOString()}</updated></entry>`
  }
}

hexo.extend.generator.register('atom', function (locals) {
  const { config } = this
  let siteUrl = config.url
  if (siteUrl[siteUrl.length - 1] !== '/') siteUrl += '/'
  const memosUrl = siteUrl + 'memos/'
  const authorXml = `<author><name>${escapeXml(config.author || 'Author')}</name></author>`
  const routes = []

  // 文章条目（选取逻辑与官方插件一致）
  const posts = locals.posts.sort('-date').filter(post => post.draft !== true).limit(POST_LIMIT)
  const entries = posts.toArray().map(post => {
    const entry = buildPostEntry(post, authorXml)
    if (entry.stubRoute) routes.push(entry.stubRoute)
    return entry
  })

  // 碎碎念条目（全部）
  const memos = locals.data && locals.data.shuoshuo
  if (memos && memos.length) {
    const usedMemoIds = new Set()
    for (const item of memos) {
      const entry = buildMemoEntry(item, memosUrl, config.author, usedMemoIds)
      if (entry) {
        entries.push(entry)
        routes.push(entry.pageRoute)
      }
    }
  }

  // 文章与碎碎念按发布日期倒序混排
  entries.sort((a, b) => b.published - a.published)

  // feed 级 updated 取所有条目的最新 published/updated（碎碎念补录、旧文更新都反映）
  const feedUpdated = entries.length
    ? entries.reduce((max, e) => {
      const t = e.updated > e.published ? e.updated : e.published
      return t > max ? t : max
    }, new Date(0))
    : new Date()
  const xml = '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<feed xmlns="http://www.w3.org/2005/Atom">' +
    authorXml +
    '<generator uri="https://hexo.io/">Hexo</generator>' +
    `<id>${escapeXml(siteUrl)}</id>` +
    `<link href="${escapeXml(siteUrl)}" rel="alternate"/>` +
    `<link href="${escapeXml(siteUrl + FEED_PATH)}" rel="self"/>` +
    (config.author ? `<rights>All rights reserved ${new Date().getFullYear()}, ${escapeXml(config.author)}</rights>` : '') +
    `<subtitle>${escapeXml(config.subtitle || config.description || '')}</subtitle>` +
    `<title>${escapeXml(config.title)}</title>` +
    `<updated>${feedUpdated.toISOString()}</updated>` +
    entries.map(e => e.xml).join('') +
    '</feed>'

  return [{ path: FEED_PATH, data: xml }, ...routes]
})
