// Shared helpers for the AI-readable surfaces (robots.txt, sitemap.xml,
// llms.txt, Markdown mirrors, /ai/ guide, manifest).
//
// Everything here is deterministic by construction: no Date.now(), no network,
// no randomness. Output depends only on repository content and config.
'use strict'

const { full_url_for } = require('hexo-util')

const FRONT_MATTER_RE = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const formatterCache = new Map()

function escapeHtml (value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => HTML_ESCAPES[ch])
}

function stripFrontMatter (raw) {
  return String(raw == null ? '' : raw).replace(FRONT_MATTER_RE, '')
}

function siteUrl (hexo) {
  return String(hexo.config.url || '').replace(/\/+$/, '')
}

// Absolute URL for a source-relative route path. Uses the same encoder the
// theme uses for <link rel="canonical">, so sitemap locs and canonicals agree
// byte for byte (spaces -> %20, CJK -> UTF-8 percent-encoding).
function absoluteUrl (hexo, routePath) {
  return full_url_for.call({ config: { url: siteUrl(hexo) } }, String(routePath))
}

// Hexo routes a path ending in '/' to '.../index.html'. Pretty URLs are on, so
// that file is also the canonical form served for the directory URL.
function routeIndexPath (routePath) {
  const path = String(routePath).replace(/^\/+/, '')
  return path.endsWith('/') ? path + 'index.html' : path
}

function canonicalOf (hexo, routePath) {
  return absoluteUrl(hexo, routeIndexPath(routePath))
}

// Markdown mirror lives beside the canonical HTML file: .../index.md.
function mirrorOf (canonical) {
  return canonical.replace(/index\.html$/, 'index.md')
}

function toDate (value) {
  if (value == null) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value.valueOf === 'function' && typeof value.toDate === 'function') {
    return value.toDate().getTime()
  }
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function asDate (value) {
  if (value == null) return null
  if (value instanceof Date) return value
  if (typeof value.toDate === 'function') return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

// Site-local calendar date (config.timezone, defaults to UTC). A fixed locale
// keeps the string stable across machines.
function formatDate (hexo, value) {
  const date = asDate(value)
  if (!date) return ''
  const timeZone = hexo.config.timezone || 'UTC'
  let formatter = formatterCache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    formatterCache.set(timeZone, formatter)
  }
  return formatter.format(date)
}

// First real paragraph of a Markdown body, flattened to one line. Derived from
// the author's own text — used for index one-liners, never for new claims.
function firstParagraph (markdown) {
  const lines = String(markdown || '').split(/\r?\n/)
  let buffer = []
  let inFence = false
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      if (buffer.length) break
      continue
    }
    if (inFence) continue
    const trimmed = line.trim()
    if (!trimmed) {
      if (buffer.length) break
      continue
    }
    if (/^(#{1,6}\s|<|\||-{3,}|!\[|\{%|>|[-*+]\s|\d+[.)]\s)/.test(trimmed)) {
      if (buffer.length) break
      continue
    }
    buffer.push(trimmed)
  }
  return flattenMarkdown(buffer.join(' '))
}

function flattenMarkdown (text) {
  return String(text || '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_~`]/g, '')
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate (text, limit) {
  const value = String(text || '').trim()
  if (value.length <= limit) return value
  return value.slice(0, limit).replace(/[，、；：,.;:\s]+$/, '') + '…'
}

module.exports = {
  escapeHtml,
  escapeXml: escapeHtml,
  stripFrontMatter,
  flattenMarkdown,
  siteUrl,
  absoluteUrl,
  routeIndexPath,
  canonicalOf,
  mirrorOf,
  toDate,
  formatDate,
  firstParagraph,
  truncate
}
