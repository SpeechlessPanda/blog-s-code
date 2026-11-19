// Markdown mirrors: one `index.md` beside every canonical `index.html`
// (articles and series landings), generated from the source Markdown.
//
// `mirrorRel` is the raw route path (what Hexo writes to disk); never pass the
// percent-encoded URL here or the file lands in a literally-%E6… directory.
'use strict'

const { collect } = require('./lib/posts')
const { buildPostMirror, buildSeriesMirror } = require('./lib/mirror')

hexo.extend.generator.register('ai-markdown-mirrors', function (locals) {
  const model = collect(this, locals)
  const routes = []
  for (const post of [...model.posts, ...model.chapters]) {
    routes.push({ path: post.mirrorRel, data: buildPostMirror(this, post) })
  }
  for (const series of model.series) {
    routes.push({ path: series.mirrorRel, data: buildSeriesMirror(this, series) })
  }
  return routes
})
