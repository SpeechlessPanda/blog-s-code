// llms.txt — single machine-readable index at the site root.
//
// Structure follows llmstxt.org v2: H1 name, one blockquote summary, H2 sections
// whose bodies are Markdown link lists, optional section last, and a short note
// on other entry points. Prose is derived from `source/_data/ai.yml` (curated)
// or from the article model (dates, titles, URLs); nothing here is invented.
//
// Links use the model's already-relative, percent-encoded URLs so the file works
// when the site is served from a subpath and matches the HTML canonicals.
'use strict'

const { truncate } = require('./lib/util')
const { collect } = require('./lib/posts')

function summaryFor (post) {
  return post.description || post.summary
}

function listLatest (model, limit) {
  return [...model.posts, ...model.chapters]
    .sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0))
    .slice(0, limit)
}

function build (hexo, locals, data) {
  const model = collect(hexo, locals)
  const site = data.site || {}
  const about = data.about || {}
  const tags = locals.tags.toArray().slice().sort((a, b) => a.name.localeCompare(b.name))
  const featured = (data.featured || [])
    .map(item => ({ item, post: model.bySource.get(String(item.source || '').replace(/\\/g, '/')) }))
    .filter(entry => entry.post)
  const projects = (data.projects || []).filter(item => item && item.name && item.url)
  const latest = listLatest(model, Number(data.latest_count) || 5)

  const lines = []
  lines.push(`# ${hexo.config.title}`)
  lines.push('')
  lines.push(`> ${site.tagline || hexo.config.description || ''}`)
  lines.push('')

  const aboutLines = []
  if (site.description) aboutLines.push(String(site.description).trim())
  if (about.name && about.description) aboutLines.push(`作者：${about.name}。${about.description}`)
  if (about.contact) aboutLines.push(`联系：${about.contact}`)
  if (aboutLines.length) {
    lines.push('## 关于本站')
    lines.push('')
    for (const line of aboutLines) lines.push(line, '')
  }

  lines.push('## 内容组织')
  lines.push('')
  lines.push('- 文章：按发布时间归档于 [归档](/archives/index.html)，按标签聚合于 [标签](/tags/index.html)，分页列表见 [博客](/blog/index.html)。')
  lines.push('- 系列：以文件夹归组，每个系列有聚合页与 Markdown 镜像，章节按写作顺序推进。')
  lines.push('- 碎碎念：独立时间线，保持 `noindex`，不进入本索引与 sitemap。')
  if (site.organization) lines.push('- ' + String(site.organization).replace(/\s+/g, ' ').trim())
  lines.push('')

  lines.push('## 主题索引')
  lines.push('')
  for (const tag of tags) {
    const topic = (data.topics || []).find(item => item.name === tag.name)
    const description = topic && topic.description ? String(topic.description).trim() : ''
    lines.push(`- [${tag.name}](/tags/${encodeURIComponent(tag.name)}/)：${description || `${tag.length} 篇`}`)
  }
  lines.push('')

  lines.push('## 精选文章')
  lines.push('')
  for (const { item, post } of featured) {
    const summary = item.summary ? String(item.summary).trim() : summaryFor(post)
    lines.push(`- [${post.title}](${post.url})（${post.published}）：${summary}`)
    lines.push(`  - Markdown: ${post.mirrorUrl}`)
  }
  lines.push('')
  if (data.notes && data.notes.featureSelection) lines.push(String(data.notes.featureSelection).trim(), '')

  if (model.series.length) {
    lines.push('## 系列与章节')
    lines.push('')
    for (const series of model.series) {
      const description = series.description ? `：${series.description}` : ''
      lines.push(`- [${series.title}](${series.url})${description}`)
      lines.push(`  - Markdown: ${series.mirrorUrl}`)
      for (const member of series.members) {
        lines.push(`  - [${member.series.ordinal}. ${member.title}](${member.url})（${member.published}）：${summaryFor(member)}`)
      }
    }
    lines.push('')
  }

  lines.push('## 最近更新')
  lines.push('')
  for (const post of latest) {
    lines.push(`- [${post.title}](${post.url})（${post.published}）：${truncate(summaryFor(post), 90)}`)
  }
  lines.push('')

  if (projects.length) {
    lines.push('## 项目与开源项目')
    lines.push('')
    for (const item of projects) lines.push(`- [${item.name}](${item.url})：${String(item.description || '').trim()}`)
    lines.push('')
    if (data.notes && data.notes.projectsSource) lines.push(String(data.notes.projectsSource).trim(), '')
  }

  lines.push('## 版权与 AI 使用偏好')
  lines.push('')
  lines.push('- 版权许可：除另有说明，本站原创文字采用 CC BY-NC-SA 4.0（署名—非商业性使用—相同方式共享）。商业授权请联系作者。')
  lines.push('- AI 使用：允许检索、索引与带来源链接的引用与总结；默认不希望本站内容用于模型训练。')
  lines.push('- 机器信号：训练偏好通过 robots.txt 中的 `__usage_ai-training` 策略组与 `Content-Usage: train-ai=n` 表达；两者均为 Internet-Draft 草案，属于偏好表达，不改变版权许可，也不构成法律许可。')
  lines.push('- 完整说明：/rights/index.html')
  lines.push('')

  lines.push('## 辅助入口')
  lines.push('')
  lines.push('- 站点地图：/sitemap.xml')
  lines.push('- 爬虫规则：/robots.txt')
  lines.push('- 订阅源：/atom.xml')
  lines.push('- 人类阅读入口：/ai/index.html')
  lines.push('')

  return lines.join('\n')
}

hexo.extend.generator.register('ai-llms-txt', function (locals) {
  const data = (locals.data && locals.data.ai) || {}
  return { path: 'llms.txt', data: build(this, locals, data) }
})

module.exports = { build }
