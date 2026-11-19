// sitemap.xml — replaces hexo-generator-sitemap (same generator id; site
// scripts load after plugins, so this one wins). baidusitemap.xml keeps its own
// plugin untouched.
//
// Rules, each verified by tools/verify-ai-assets.js:
//   * every loc is the canonical HTML URL (…/index.html), byte-identical to the
//     page's <link rel="canonical">;
//   * only canonical public pages: no drafts, no noindex memos, no Markdown
//     mirrors, no 404, no pagination duplicates;
//   * lastmod is the post's real update time (updated_option: mtime, restored
//     from git history in CI), never the build clock.
'use strict'

const { canonicalOf, formatDate, escapeXml, toDate } = require('./lib/util')
const { collect } = require('./lib/posts')

function build (hexo, locals) {
  const model = collect(hexo, locals)
  const all = [...model.posts, ...model.chapters]
  const entries = []

  // Listing pages share the newest article they can show. Computing that from
  // the model keeps the claim true even when a post is removed.
  const newest = all.reduce((latest, post) => Math.max(latest, toDate(post.updated)), 0)
  const newestStr = formatDate(hexo, newest)
  entries.push({ loc: canonicalOf(hexo, 'index.html'), lastmod: newestStr })
  entries.push({ loc: canonicalOf(hexo, hexo.config.archive_dir + '/'), lastmod: newestStr })
  entries.push({ loc: canonicalOf(hexo, hexo.config.tag_dir + '/'), lastmod: newestStr })

  const blogDir = String((hexo.config.index_generator || {}).path || '').replace(/^\/+|\/+$/g, '')
  if (blogDir) entries.push({ loc: canonicalOf(hexo, blogDir + '/'), lastmod: newestStr })

  for (const post of all) entries.push({ loc: post.canonical, lastmod: post.updated })
  for (const series of model.series) entries.push({ loc: series.canonical, lastmod: series.updated })

  // Tag archives: lastmod is the newest post carrying the tag.
  for (const tag of locals.tags.toArray()) {
    const posts = all.filter(post => post.tags.includes(tag.name))
    const latest = posts.reduce((value, post) => Math.max(value, toDate(post.updated)), 0)
    entries.push({ loc: canonicalOf(hexo, tag.path), lastmod: formatDate(hexo, latest) })
  }

  // Standalone public pages (/about/, /rights/, /ai/, /link/, …). The memos
  // timeline is deliberately excluded: its content is client-rendered and its
  // per-item pages are noindex.
  for (const page of locals.pages.toArray()) {
    if (page.sitemap === false) continue
    if (page.source === 'memos/index.md') continue
    entries.push({ loc: canonicalOf(hexo, page.path), lastmod: formatDate(hexo, page.updated || page.date) })
  }
  // /ai/ is a generator route, not a Page model.
  entries.push({ loc: canonicalOf(hexo, 'ai/'), lastmod: newestStr })

  const seen = new Set()
  return entries
    .filter(entry => entry.loc && !seen.has(entry.loc) && seen.add(entry.loc))
    .sort((a, b) => (a.loc < b.loc ? -1 : a.loc > b.loc ? 1 : 0))
}

function render (entries) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ]
  for (const entry of entries) {
    lines.push('  <url>', `    <loc>${escapeXml(entry.loc)}</loc>`)
    if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`)
    lines.push('  </url>')
  }
  lines.push('</urlset>', '')
  return lines.join('\n')
}

hexo.extend.generator.register('sitemap', function (locals) {
  return { path: 'sitemap.xml', data: render(build(this, locals)) }
})

module.exports = { build, render }
