// scripts/feed-memos.js
// 把碎碎念注入 atom.xml(RSS/Atom feed),让订阅者也能收到碎碎念更新。
'use strict'

function escapeXml(s) {
  return String(s == null ? '' : s).replace(/[<>&'"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  ))
}

hexo.extend.filter.register('after_generate', async function () {
  const path = (hexo.config.feed && hexo.config.feed.path) || 'atom.xml'
  const memos = hexo.locals.get('data').shuoshuo
  if (!memos || !memos.length) return

  const route = hexo.route
  if (!route.list().includes(path)) return

  // 读取现有 atom.xml
  const stream = route.get(path)
  let xml = ''
  for await (const chunk of stream) xml += chunk.toString()

  const siteUrl = hexo.config.url.replace(/\/$/, '')
  const memosUrl = siteUrl + '/memos/'
  const authorXml = `<author><name>${escapeXml(hexo.config.author || 'Author')}</name></author>`

  // 按日期倒序,与 feed 惯例(最新在前)一致
  const sorted = memos.slice().sort((a, b) => new Date(b.date) - new Date(a.date))

  const entries = sorted.map(item => {
    const html = hexo.render.renderSync({ text: item.content || '', engine: 'markdown' })
    const date = new Date(item.date)
    const dateIso = isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
    const title = '碎碎念 · ' + dateIso.slice(0, 10)
    const id = memosUrl + '#' + dateIso
    const tags = (item.tags || []).map(t => `<category term="${escapeXml(t)}"/>`).join('')
    return `<entry>${authorXml}${tags}<content type="html"><![CDATA[${html}]]></content><id>${id}</id><link href="${memosUrl}"/><published>${dateIso}</published><title>${escapeXml(title)}</title><updated>${dateIso}</updated></entry>`
  }).join('')

  // 更新 feed 级 <updated>(第一个)为最新碎碎念时间,若它比当前 feed 更新时间新
  const latestMemoTs = sorted[0] ? new Date(sorted[0].date).getTime() : 0
  if (!isNaN(latestMemoTs)) {
    xml = xml.replace(/<updated>([^<]+)<\/updated>/, (m, cur) => {
      const curTs = new Date(cur).getTime()
      return (!isNaN(curTs) && latestMemoTs <= curTs) ? m
        : '<updated>' + new Date(latestMemoTs).toISOString() + '</updated>'
    })
  }

  // 注入到 </feed> 前
  const newXml = xml.replace('</feed>', entries + '</feed>')
  route.set(path, newXml)
  hexo.log.info('[feed-memos] 注入 ' + sorted.length + ' 条碎碎念到 ' + path)
})
