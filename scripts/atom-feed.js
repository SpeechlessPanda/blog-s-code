// scripts/atom-feed.js
// 自定义 Atom feed 生成器，替代 hexo-generator-feed（官方插件只遍历 posts，看不到 _data 里的碎碎念）。
// 功能：
//   1. 文章 + 碎碎念（source/_data/shuoshuo.yml）按日期倒序混排进同一个 atom.xml
//   2. 文章「更新距发布超过 1 天」时改变条目 guid，RSS 阅读器会当作新条目推送 —— 订阅者能感知旧文更新
//      （依赖部署 workflow 按 git 历史恢复文件 mtime，否则 CI 上所有文章 updated 都等于构建时间）
//   3. 碎碎念日期按 +08:00 显式解析，与构建机器时区无关，保证 guid 稳定
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

function postSummary (post) {
  if (post.description) return post.description
  if (post.intro) return post.intro
  if (post.excerpt) return post.excerpt
  if (post.content) return post.content.substring(0, EXCERPT_LIMIT)
  return ''
}

function buildPostEntry (post, authorXml) {
  const published = post.date.toDate()
  const updated = post.updated ? post.updated.toDate() : published
  // 更新距发布超过阈值 → 改变 guid，让订阅者收到"更新"通知；否则 guid 保持稳定（permalink）
  const meaningfulUpdate = (updated - published) > UPDATE_NOTIFY_MS
  const id = post.permalink + (meaningfulUpdate ? '#' + updated.toISOString() : '')
  const categories = [
    ...(post.categories ? post.categories.toArray() : []),
    ...(post.tags ? post.tags.toArray() : [])
  ].map(item => `<category term="${escapeXml(item.name)}" scheme="${escapeXml(item.permalink)}"/>`).join('')
  const content = (post.content || '').replace(/[\x00-\x1F\x7F]/g, '') // eslint-disable-line no-control-regex

  return {
    published,
    xml: `<entry>${authorXml}${categories}<content type="html">${cdata(content)}</content>` +
      `<id>${escapeXml(id)}</id><link href="${escapeXml(post.permalink)}"/>` +
      `<published>${published.toISOString()}</published>` +
      `<summary type="html">${cdata(postSummary(post))}</summary>` +
      `<title>${escapeXml(post.title)}</title><updated>${updated.toISOString()}</updated></entry>`
  }
}

function buildMemoEntry (item, memosUrl, author) {
  const date = parseMemoDate(item.date)
  if (!date) return null
  const html = hexo.render.renderSync({ text: item.content || '', engine: 'markdown' })
    .replace(/[\x00-\x1F\x7F]/g, '') // eslint-disable-line no-control-regex
  // guid 用北京时间戳，本地/CI 构建结果一致
  const beijing = new Date(date.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 16)
  const id = `${memosUrl}#${beijing}`
  const tags = (item.tags || []).map(t => `<category term="${escapeXml(t)}"/>`).join('')
  const authorXml = `<author><name>${escapeXml(item.author || author)}</name></author>`

  return {
    published: date,
    xml: `<entry>${authorXml}${tags}<content type="html">${cdata(html)}</content>` +
      `<id>${escapeXml(id)}</id><link href="${escapeXml(memosUrl)}"/>` +
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

  // 文章条目（选取逻辑与官方插件一致）
  const posts = locals.posts.sort('-date').filter(post => post.draft !== true).limit(POST_LIMIT)
  const entries = posts.toArray().map(post => buildPostEntry(post, authorXml))

  // 碎碎念条目（全部）
  const memos = locals.data && locals.data.shuoshuo
  if (memos && memos.length) {
    for (const item of memos) {
      const entry = buildMemoEntry(item, memosUrl, config.author)
      if (entry) entries.push(entry)
    }
  }

  // 文章与碎碎念按发布日期倒序混排
  entries.sort((a, b) => b.published - a.published)

  const feedUpdated = entries.length ? entries[0].published : new Date()
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

  return { path: FEED_PATH, data: xml }
})
