// scripts/search-memos.js
// 把碎碎念数据注入 search.xml,使其可被本地搜索命中。
'use strict'

function escapeXml(s) {
  return String(s == null ? '' : s).replace(/[<>&'"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  ))
}

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

  // 构造碎碎念 entry
  const entries = memos.map(item => {
    const html = hexo.render.renderSync({ text: item.content || '', engine: 'markdown' })
    const content = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const tags = (item.tags || []).map(t => `<tag>${escapeXml(t)}</tag>`).join('')
    const dateStr = item.date ? new Date(item.date).toISOString().slice(0, 10) : ''
    const title = '碎碎念' + (dateStr ? ' · ' + dateStr : '')
    return `<entry><title>${escapeXml(title)}</title><url>/memos/</url><content><![CDATA[${content}]]></content><tags>${tags}</tags></entry>`
  }).join('')

  // 注入到 </search> 前
  const newXml = xml.replace('</search>', entries + '</search>')
  route.set(path, newXml)
  hexo.log.info('[search-memos] 注入 ' + memos.length + ' 条碎碎念到 ' + path)
})
