// scripts/memo-comment-count.js
// 构建时通过 GitHub GraphQL 查询 Giscus discussions 评论数,写入碎碎念页的 shuoshuo-data;
// 浏览器端据此决定:有评论的常态展开评论区,无评论的保持按钮。
// 直接在 after_generate 改 memos/index.html 的 shuoshuo-data JSON,避免 data 重新加载覆盖。
'use strict'

const GISCUS_QUERY = 'query($owner:String!,$name:String!,$categoryId:ID){repository(owner:$owner,name:$name){discussions(first:100,categoryId:$categoryId,orderBy:{field:UPDATED_AT,direction:DESC}){nodes{title comments{totalCount}}}}}'

hexo.extend.filter.register('after_generate', async function () {
  const memosPath = 'memos/index.html'
  const route = hexo.route
  if (!route.list().includes(memosPath)) return

  // 读取 memos/index.html
  const stream = route.get(memosPath)
  let html = ''
  for await (const chunk of stream) html += chunk.toString()

  // 解析 shuoshuo-data JSON
  const match = html.match(/<script type="application\/json" id="shuoshuo-data">([\s\S]*?)<\/script>/)
  if (!match) return
  let data
  try {
    data = JSON.parse(match[1])
  } catch (e) {
    hexo.log.warn('[memo-comment-count] shuoshuo-data JSON 解析失败,跳过')
    return
  }
  if (!data || !data.length) return

  const setZero = () => data.forEach(item => { item.commentCount = 0 })

  const token = process.env.GH_DISCUSSION_TOKEN
  if (!token) {
    hexo.log.warn('[memo-comment-count] 未配置 GH_DISCUSSION_TOKEN,评论数默认 0(评论默认折叠)')
    setZero()
  } else {
    const giscus = (hexo.theme.config && hexo.theme.config.giscus) || {}
    const repo = giscus.repo
    if (!repo) {
      hexo.log.warn('[memo-comment-count] 未配置 giscus.repo,评论数默认 0')
      setZero()
    } else {
      const [owner, name] = repo.split('/')
      const categoryId = giscus.category_id || null
      let titleToCount = {}
      try {
        const res = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'hexo-memo-comment-count',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: GISCUS_QUERY, variables: { owner, name, categoryId } })
        })
        if (!res.ok) {
          hexo.log.warn(`[memo-comment-count] GraphQL HTTP ${res.status},评论数默认 0`)
          setZero()
        } else {
          const json = await res.json()
          const nodes = (json && json.data && json.data.repository && json.data.repository.discussions && json.data.repository.discussions.nodes) || []
          nodes.forEach(n => { titleToCount[n.title] = n.comments.totalCount })
          hexo.log.info(`[memo-comment-count] 查到 ${nodes.length} 条 discussion`)
          data.forEach(item => {
            const dataKey = item.key || ('memo-' + String(item.date || '').replace(/[^0-9a-zA-Z]/g, '-'))
            const term = `/memos?key=${dataKey}`
            item.commentCount = titleToCount[term] || 0
          })
        }
      } catch (e) {
        hexo.log.warn(`[memo-comment-count] GraphQL 查询失败: ${e.message},评论数默认 0`)
        setZero()
      }
    }
  }

  // 写回 shuoshuo-data JSON
  const newData = JSON.stringify(data)
  const newHtml = html.replace(match[0], `<script type="application/json" id="shuoshuo-data">${newData}</script>`)
  route.set(memosPath, newHtml)

  const withComments = data.filter(d => d.commentCount > 0).length
  hexo.log.info(`[memo-comment-count] ${withComments}/${data.length} 条碎碎念有评论,将自动展开`)
})
