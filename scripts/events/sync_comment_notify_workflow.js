const fs = require('node:fs')
const path = require('node:path')

hexo.extend.filter.register('after_generate', () => {
    const sourceDir = path.join(hexo.base_dir, '.github', 'workflows')
    const targetDir = path.join(hexo.public_dir, '.github', 'workflows')
    const publishRepoWorkflows = new Set([
        'comment-email-notify.yml',
        'deploy-notify.yml',
        'search-engine-ping.yml',
        'retry-pages-deploy.yml'
    ])

    if (!fs.existsSync(sourceDir)) {
        hexo.log.warn('[workflow-sync] Missing directory .github/workflows')
        return
    }

    const files = fs
        .readdirSync(sourceDir)
        .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
        .filter(file => publishRepoWorkflows.has(file))

    if (files.length === 0) {
        hexo.log.warn('[workflow-sync] No publish-repo workflows found in .github/workflows')
        return
    }

    fs.mkdirSync(targetDir, { recursive: true })
    for (const file of files) {
        // Windows 检出时 core.autocrlf=true 会把工作区文件变成 CRLF，直接原样 copy
        // 会让发布仓与源仓字节数恒定不同（如 search-engine-ping.yml 50 行差 50 字节），
        // 真实内容差异被行尾符噪音淹没。统一归一化为 LF 再写出。
        const raw = fs.readFileSync(path.join(sourceDir, file))
        const normalized = Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
        fs.writeFileSync(path.join(targetDir, file), normalized)

        if (raw.length !== normalized.length) {
            hexo.log.info(
                `[workflow-sync] Normalized CRLF→LF in ${file} (${raw.length} → ${normalized.length} bytes)`
            )
        }
    }

    hexo.log.info(`[workflow-sync] Synced ${files.length} workflow file(s) to public/.github/workflows`)
})
