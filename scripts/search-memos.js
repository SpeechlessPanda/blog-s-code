// scripts/search-memos.js
// 把碎碎念数据注入 search.xml，使其可被本地搜索命中。
// 每条碎碎念的 url 指向 atom-feed.js 生成的独立页 /memos/<时间戳>/，
// 搜索结果可以直接跳到对应碎碎念，而不是全部落在 /memos/。
'use strict'

const { escapeXml, cdata, parseMemoDate, memoSlugs } = require('./lib/memo-utils')

hexo.extend.filter.register('after_generate', async function () {
  const cfg = hexo.config.search || {}
  const path = cfg.path || 'search.xml'
  if (!path.endsWith('.xml')) return // 仅处理 xml 格式

  const memos = hexo.locals.get('data').shuoshuo
  if (!memos || !memos.length) return

  const route = hexo.route
  if (!route.list().includes(path)) return

  // 读取现有 search.xml
  const stream = route.get(path)
  let xml = ''
  for await (const chunk of stream) xml += chunk.toString()

  const slugs = memoSlugs(memos)

  // 构造碎碎念 entry
  const entries = memos.map((item, i) => {
    const html = hexo.render.renderSync({ text: item.content || '', engine: 'markdown' })
    const content = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const tags = (item.tags || []).map(t => `<tag>${escapeXml(t)}</tag>`).join('')
    const date = parseMemoDate(item.date)
    const dateStr = date ? date.toISOString().slice(0, 10) : ''
    const title = '碎碎念' + (dateStr ? ' · ' + dateStr : '')
    const url = slugs[i] ? `/memos/${slugs[i]}/` : '/memos/'
    return `<entry><title>${escapeXml(title)}</title><url>${escapeXml(url)}</url><content>${cdata(content)}</content><tags>${tags}</tags></entry>`
  }).join('')

  // 注入到 </search> 前
  const newXml = xml.replace('</search>', entries + '</search>')
  route.set(path, newXml)
  hexo.log.info('[search-memos] 注入 ' + memos.length + ' 条碎碎念到 ' + path)
})
