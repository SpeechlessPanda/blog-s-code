// Builds the single article model every AI surface shares, so robots/sitemap/
// llms.txt/mirrors/guide can never disagree on URLs, dates or membership.
//
// Two path forms are kept apart on purpose:
//   * `rel` / `mirrorRel` — raw route paths, identical to the files Hexo writes
//     under public/ (CJK and spaces stay literal);
//   * `url` / `mirrorUrl` — percent-encoded absolute URLs, identical to the
//     page's <link rel="canonical"> and its rel="alternate" mirror link.
// Mixing them makes the server decode a literal %-name and 404.
//
// Series membership comes from the theme's `blog_series` metadata (the theme
// owns the folder convention and unpublishes the series index pages); this
// module only re-groups published posts and reads the series index record for
// its description.
'use strict'

const {
  canonicalOf,
  routeIndexPath,
  stripFrontMatter,
  toDate,
  formatDate,
  firstParagraph,
  flattenMarkdown,
  truncate
} = require('./util')

function normalizeSource (source) {
  return String(source || '').replace(/\\/g, '/')
}

function publishedSeriesIndexes (hexo) {
  const indexes = new Map()
  for (const post of hexo.model('Post').toArray()) {
    const match = /^_posts\/([^/]+)\/index\.md$/.exec(normalizeSource(post.source))
    if (match) indexes.set(match[1], post)
  }
  return indexes
}

function summarize (post) {
  if (post.description) return String(post.description).trim()
  const body = stripFrontMatter(post.raw)
  return truncate(firstParagraph(body), 90)
}

function relativeUrl (canonical) {
  return canonical.replace(/^https?:\/\/[^/]+/, '')
}

function shapePost (hexo, post) {
  const rel = routeIndexPath(post.path)
  const canonical = canonicalOf(hexo, rel)
  return {
    source: normalizeSource(post.source),
    title: String(post.title || '').trim(),
    rel,
    mirrorRel: rel.replace(/index\.html$/, 'index.md'),
    url: relativeUrl(canonical),
    mirrorUrl: relativeUrl(canonical).replace(/index\.html$/, 'index.md'),
    canonical,
    mirror: canonical.replace(/index\.html$/, 'index.md'),
    description: post.description ? String(post.description).trim() : '',
    published: formatDate(hexo, post.date),
    updated: formatDate(hexo, post.updated || post.date),
    tags: post.tags && post.tags.toArray ? post.tags.toArray().map(tag => tag.name) : [],
    summary: summarize(post),
    body: stripFrontMatter(post.raw),
    series: post.blog_series && post.blog_series.slug
      ? { slug: post.blog_series.slug, title: post.blog_series.title }
      : null
  }
}

function collect (hexo, locals) {
  const posts = locals.posts.toArray().filter(post => post.published !== false && toDate(post.date))
  const seriesMap = new Map()
  const independent = []

  for (const post of posts) {
    const meta = post.blog_series
    if (!meta || !meta.slug) {
      independent.push(post)
      continue
    }
    let entry = seriesMap.get(meta.slug)
    if (!entry) {
      entry = {
        slug: meta.slug,
        title: String(meta.title || meta.slug),
        path: routeIndexPath(meta.path),
        members: []
      }
      seriesMap.set(meta.slug, entry)
    }
    entry.members.push(post)
  }

  const indexes = publishedSeriesIndexes(hexo)
  const series = []
  for (const entry of seriesMap.values()) {
    entry.members.sort((a, b) => toDate(a.date) - toDate(b.date))
    const index = indexes.get(entry.slug)
    const description = index && index.description ? String(index.description).trim() : ''
    const shaped = entry.members.map(post => shapePost(hexo, post))
    shaped.forEach((post, i) => {
      post.series = { slug: entry.slug, title: entry.title, ordinal: i + 1, total: shaped.length }
    })
    const canonical = canonicalOf(hexo, entry.path)
    const url = relativeUrl(canonical)
    series.push({
      slug: entry.slug,
      title: entry.title,
      rel: entry.path,
      mirrorRel: entry.path.replace(/index\.html$/, 'index.md'),
      url,
      mirrorUrl: url.replace(/index\.html$/, 'index.md'),
      canonical,
      mirror: canonical.replace(/index\.html$/, 'index.md'),
      description: flattenMarkdown(description),
      descriptionMarkdown: description,
      created: formatDate(hexo, entry.members[0].date),
      updated: formatDate(hexo, entry.members.reduce((latest, post) => {
        return Math.max(latest, toDate(post.updated || post.date))
      }, 0)),
      members: shaped
    })
  }

  // Chapters are listed inside their series; the flat post list keeps only
  // standalone articles so llms.txt does not repeat the same link twice.
  independent.sort((a, b) => toDate(b.date) - toDate(a.date))
  series.sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : 0))

  const shapedPosts = independent.map(post => shapePost(hexo, post))
  const chapters = series.flatMap(entry => entry.members)
  const bySource = new Map([...shapedPosts, ...chapters].map(post => [post.source, post]))

  return { posts: shapedPosts, chapters, series, bySource }
}

module.exports = { collect, shapePost, normalizeSource }
