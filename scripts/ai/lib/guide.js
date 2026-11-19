// /ai/ — human-visible entry point for the AI-readable surfaces.
//
// The page is a normal Hexo page route (layout: page) so it inherits the theme
// chrome; only its content HTML is generated here. All links come from the same
// article model as llms.txt/sitemap/mirrors, so counts cannot drift.
'use strict'

const { escapeHtml, truncate } = require('./util')

const STYLES = [
  '.ai-guide{--ai-muted:var(--card-meta)}',
  '.ai-guide .ai-lead{font-size:1.05em}',
  '.ai-guide .ai-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;margin:1.2rem 0}',
  '.ai-guide .ai-card{background:var(--card-bg);border:1px solid var(--hr-border);border-radius:8px;padding:1rem 1.1rem;box-shadow:var(--card-box-shadow)}',
  '.ai-guide .ai-card h3{margin-top:0;margin-bottom:.4rem;font-size:1.05em}',
  '.ai-guide .ai-card p{margin:0;color:var(--ai-muted);font-size:.95em;line-height:1.7}',
  '.ai-guide .ai-list{list-style:none;padding-left:0;margin:1rem 0}',
  '.ai-guide .ai-list>li{padding:.75rem 0;border-bottom:1px dashed var(--hr-border)}',
  '.ai-guide .ai-list>li:last-child{border-bottom:none}',
  '.ai-guide .ai-list .ai-meta{display:block;color:var(--ai-muted);font-size:.85em;margin-top:.2rem}',
  '.ai-guide .ai-list .ai-summary{display:block;margin-top:.3rem;font-size:.95em;line-height:1.7}',
  '.ai-guide .ai-chips{display:flex;flex-wrap:wrap;gap:.6rem;margin:1rem 0;padding:0;list-style:none}',
  '.ai-guide .ai-chips li{margin:0}',
  '.ai-guide .ai-chips a{display:inline-block;padding:.3rem .8rem;border:1px solid var(--hr-border);border-radius:999px;font-size:.9em}',
  '.ai-guide .ai-chips a:hover{background:var(--btn-bg);color:var(--btn-color)}',
  '.ai-guide .ai-note{color:var(--ai-muted);font-size:.9em;line-height:1.7}',
  '.ai-guide .ai-sub{padding-left:1.2rem;margin:.4rem 0 .8rem;font-size:.95em}',
  '.ai-guide .ai-sub li{margin:.25rem 0}'
].join('')

function href (relPath) {
  return '/' + String(relPath).replace(/^\/+/, '')
}

function tagPath (name) {
  return '/tags/' + encodeURIComponent(name) + '/'
}

function buildCards (model, data) {
  const cards = []
  for (const item of data.featured || []) {
    const post = model.bySource.get(String(item.source || '').replace(/\\/g, '/'))
    if (!post) continue // verify-ai-assets reports missing curated sources
    cards.push({
      title: post.title,
      href: href(post.url),
      meta: [post.published, ...post.tags].join(' · '),
      summary: item.summary ? String(item.summary).trim() : post.summary
    })
  }
  return cards
}

function buildTopics (model, data) {
  const counts = new Map()
  for (const post of [...model.posts, ...model.chapters]) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) || 0) + 1)
  }
  return (data.topics || [])
    .map(topic => ({
      name: String(topic.name || '').trim(),
      description: String(topic.description || '').trim(),
      count: counts.get(String(topic.name || '').trim()) || 0
    }))
    .filter(topic => topic.name)
}

function buildLatest (model, limit) {
  return [...model.posts, ...model.chapters]
    .sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0))
    .slice(0, limit)
}

function buildHtml (hexo, model, data) {
  const cards = buildCards(model, data)
  const topics = buildTopics(model, data)
  const latest = buildLatest(model, Number(data.latest_count) || 5)
  const projects = (data.projects || []).filter(item => item && item.name && item.url)
  const site = data.site || {}
  const tagline = String(site.tagline || hexo.config.description || '')
  const about = String(site.about || '')

  const out = []
  out.push('<div class="ai-guide">')
  out.push('<style>' + STYLES + '</style>')
  out.push('<p class="ai-lead">' + escapeHtml(tagline) + (about ? ' ' + escapeHtml(about) : '') +
    ' 这一页同时服务两类读者:AI 阅读器从这里进入机器可读的 <a href="/llms.txt">llms.txt</a> 与 Markdown 镜像;人类读者可以把它当作精选目录。</p>')

  out.push('<h2 id="machine">给 AI 读者</h2>')
  out.push('<div class="ai-cards">')
  out.push('<div class="ai-card"><h3><a href="/llms.txt">llms.txt</a></h3><p>站点定位、主题索引、精选文章、系列章节、项目与版权政策的单文件索引,遵循 llmstxt.org 的 H1 + 摘要 + H2 链接列表结构。</p></div>')
  out.push('<div class="ai-card"><h3>Markdown 镜像</h3><p>每篇文章与每个系列在其 HTML 地址旁提供同目录 <code>index.md</code>,正文为原始 Markdown,文件头包含规范 URL、发布时间与许可信息。</p></div>')
  out.push('<div class="ai-card"><h3><a href="/rights/">版权与内容使用政策</a></h3><p>CC BY-NC-SA 4.0 许可、商业授权、AI 使用偏好与爬虫规则的完整说明。</p></div>')
  out.push('</div>')

  if (cards.length) {
    out.push('<h2 id="featured">精选文章</h2>')
    out.push('<ul class="ai-list">')
    for (const card of cards) {
      out.push('<li><a href="' + escapeHtml(card.href) + '">' + escapeHtml(card.title) + '</a><span class="ai-meta">' +
        escapeHtml(card.meta) + '</span><span class="ai-summary">' + escapeHtml(card.summary) + '</span></li>')
    }
    out.push('</ul>')
  }

  if (model.series.length) {
    out.push('<h2 id="series">系列与章节</h2>')
    for (const series of model.series) {
      out.push('<h3><a href="' + escapeHtml(href(series.url)) + '">' + escapeHtml(series.title) + '</a></h3>')
      if (series.description) out.push('<p class="ai-note">' + escapeHtml(series.description) + '</p>')
      out.push('<ol class="ai-sub">')
      for (const member of series.members) {
        out.push('<li><a href="' + escapeHtml(href(member.url)) + '">' + escapeHtml(member.title) +
          '</a> <span class="ai-meta">' + escapeHtml(member.published) + '</span></li>')
      }
      out.push('</ol>')
    }
  }

  if (topics.length) {
    out.push('<h2 id="topics">按主题浏览</h2>')
    out.push('<ul class="ai-chips">')
    for (const topic of topics) {
      out.push('<li><a href="' + escapeHtml(tagPath(topic.name)) + '" title="' + escapeHtml(topic.description) + '">' +
        escapeHtml(topic.name) + ' · ' + topic.count + '</a></li>')
    }
    out.push('</ul>')
  }
  out.push('<p class="ai-note">全部标签见 <a href="/tags/">标签页</a>;全部文章见 <a href="/blog/">博客列表</a>与 <a href="/archives/">归档</a>。</p>')

  if (latest.length) {
    out.push('<h2 id="latest">最近更新</h2>')
    out.push('<ul class="ai-list">')
    for (const post of latest) {
      out.push('<li><a href="' + escapeHtml(href(post.url)) + '">' + escapeHtml(post.title) + '</a><span class="ai-meta">' +
        escapeHtml(post.published) + '</span><span class="ai-summary">' + escapeHtml(truncate(post.summary, 90)) + '</span></li>')
    }
    out.push('</ul>')
  }

  if (projects.length) {
    out.push('<h2 id="projects">项目与开源项目</h2>')
    out.push('<ul class="ai-list">')
    for (const item of projects) {
      out.push('<li><a href="' + escapeHtml(item.url) + '" rel="noopener" target="_blank">' + escapeHtml(item.name) +
        '</a><span class="ai-summary">' + escapeHtml(String(item.description || '')) + '</span></li>')
    }
    out.push('</ul>')
  }

  out.push('<h2 id="human">人类入口</h2>')
  out.push('<p class="ai-note"><a href="/blog/">博客列表</a> · <a href="/archives/">归档</a> · <a href="/tags/">标签</a> · <a href="/about/">关于</a> · <a href="/link/">友链</a></p>')

  out.push('<h2 id="crawl">机器入口</h2>')
  out.push('<ul class="ai-list">')
  out.push('<li><a href="/llms.txt">llms.txt</a><span class="ai-summary">本页对应的机器可读索引。</span></li>')
  out.push('<li><a href="/sitemap.xml">sitemap.xml</a><span class="ai-summary">规范公开页面的 XML 站点地图。</span></li>')
  out.push('<li><a href="/robots.txt">robots.txt</a><span class="ai-summary">爬虫规则与 AI 训练偏好信号。</span></li>')
  out.push('<li><a href="/atom.xml">atom.xml</a><span class="ai-summary">文章与碎碎念的 Atom 订阅源。</span></li>')
  out.push('<li><a href="/rights/">/rights/</a><span class="ai-summary">版权、AI 使用偏好与爬虫规则说明。</span></li>')
  out.push('</ul>')

  out.push('<p class="ai-note">Markdown 镜像与 llms.txt 在每次 <code>hexo generate</code> 时自动重建,新增或修改文章后无需手动维护。碎碎念保持 <code>noindex</code>,不出现在站点地图与本页索引中。</p>')
  out.push('</div>')
  return out.join('\n')
}

module.exports = { buildHtml }
