// /ai/ page route + the rel="alternate text/markdown" / rel="describedby"
// discovery links, and the home-page social-icon accessibility label.
//
// Both hooks work on rendered HTML without touching the theme: the generator
// reuses the theme's own `page` layout, and the filters add attributes to
// markup that already exists.
'use strict'

const { buildHtml } = require('./lib/guide')
const { collect } = require('./lib/posts')

const LLMS_URL = '/llms.txt'
const HTML_ROUTE_RE = /index\.html$/

// Page route: normal theme chrome, toolbar/description visible, comments off.
hexo.extend.generator.register('ai-guide', function (locals) {
  const data = (locals.data && locals.data.ai) || {}
  const model = collect(this, locals)
  return {
    path: 'ai/index.html',
    layout: ['page'],
    data: {
      title: 'AI 阅读',
      description: '给 AI 与人类读者的机器可读入口:llms.txt、Markdown 镜像与精选目录。',
      keywords: ['llms.txt', 'Markdown', 'AI 阅读'],
      comments: false,
      top_img: false,
      aside: false,
      content: buildHtml(this, model, data)
    }
  }
})

// Article/series HTML -> mirror map. Built once per generate (after the theme
// has attached `blog_series` and unpublished series indexes), then read by the
// HTML filter so every page is touched exactly once.
hexo.extend.filter.register('before_generate', function () {
  const model = collect(this, this.locals.toObject())
  const map = new Map()
  for (const post of [...model.posts, ...model.chapters]) map.set(post.rel, post.mirrorUrl)
  for (const series of model.series) map.set(series.rel, series.mirrorUrl)
  this._aiMirrors = map
}, 20)

hexo.extend.filter.register('after_render:html', function (html, data) {
  const relPath = this && this.page && this.page.path ? this.page.path : data && data.path
  const map = hexo._aiMirrors
  if (!map || !relPath || !HTML_ROUTE_RE.test(relPath)) return html
  const mirror = map.get(relPath)
  if (!mirror) return html
  if (html.includes('rel="alternate" type="text/markdown"')) return html
  const tags = [
    `<link rel="alternate" type="text/markdown" href="${mirror}">`,
    `<link rel="describedby" href="${LLMS_URL}">`
  ].join('\n')
  const index = html.indexOf('</head>')
  return index === -1 ? html : html.slice(0, index) + tags + '\n' + html.slice(index)
})

// Accessibility: the social anchors in the author card and header have a title
// but no accessible name for screen readers. Add aria-label from the existing
// title on every `a.social-icon` (idempotent, only when missing).
hexo.extend.filter.register('after_render:html', function (html, data) {
  const relPath = this && this.page && this.page.path ? this.page.path : data && data.path
  if (relPath !== 'index.html') return html
  return html.replace(/<a\b[^>]*\bclass="social-icon"[^>]*>/g, tag => {
    if (/\baria-label=/.test(tag)) return tag
    const title = /\btitle="([^"]*)"/.exec(tag)
    if (!title || !title[1]) return tag
    const label = title[1].replace(/"/g, '&quot;')
    return tag.replace(/>$/, ` aria-label="${label}">`)
  })
})
