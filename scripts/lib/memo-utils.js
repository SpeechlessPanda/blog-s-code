// scripts/lib/memo-utils.js
// 碎碎念（memos/shuoshuo）相关的共享工具，供 atom-feed.js / search-memos.js /
// memo-comment-count.js 复用，避免日期解析、slug 生成、XML 转义三处漂移。
'use strict'

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

// 碎碎念条目数据里的 key：显式 key 优先，否则由日期生成
// （与主题 shuoshuo.pug 前端渲染时的兜底公式保持一致）
function memoDataKey (item) {
  return item.key || ('memo-' + String(item.date || '').replace(/[^0-9a-zA-Z]/g, '-'))
}

// 为全部碎碎念生成与 atom-feed 相同的唯一 slug（/memos/<slug>/），
// 同一分钟内有多条时按文件内出现顺序加序号去重（文件顺序稳定，slug 即稳定）。
// 返回与 memos 等长的数组；日期非法的条目对应位置为 null。
function memoSlugs (memos) {
  const used = new Set()
  return memos.map(item => {
    const date = parseMemoDate(item.date)
    if (!date) return null
    const stamp = pathStamp(date)
    let slug = stamp
    for (let i = 2; used.has(slug); i++) slug = `${stamp}-${i}`
    used.add(slug)
    return slug
  })
}

module.exports = {
  MEMO_TZ_OFFSET,
  escapeXml,
  cdata,
  stripHtml,
  parseMemoDate,
  pathStamp,
  memoDataKey,
  memoSlugs
}
