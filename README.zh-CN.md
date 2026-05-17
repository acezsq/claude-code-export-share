# Claude Code Export Share

将 Claude Code 当前会话导出为静态网页，并通过 PinMe/IPFS 发布为公开、永久的分享链接。

English README: [README.md](./README.md)

## 在 Claude Code 中快速使用

安装 CLI：

```bash
npm install -g github:acezsq/claude-code-export-share
```

安装并登录 PinMe：

```bash
npm install -g pinme
pinme login
```

安装 Claude Code skill：

```bash
mkdir -p ~/.claude/skills/export-share/scripts
curl -fsSL https://raw.githubusercontent.com/acezsq/claude-code-export-share/main/.claude/skills/export-share/SKILL.md \
  -o ~/.claude/skills/export-share/SKILL.md
curl -fsSL https://raw.githubusercontent.com/acezsq/claude-code-export-share/main/.claude/skills/export-share/scripts/export-share.sh \
  -o ~/.claude/skills/export-share/scripts/export-share.sh
chmod +x ~/.claude/skills/export-share/scripts/export-share.sh
```

如果 Claude Code 已经在运行，建议重启一次，让它加载新的 skill。

然后可以在 Claude Code 里使用 slash command：

```text
/export-share
/export-share list
/export-share export-current
/export-share help
```

也可以直接用自然语言对话触发：

```text
请使用 export-share 发布当前 Claude Code 会话
用 export-share 分享这次 Claude Code 对话
请用 export-share 只导出当前会话，不要发布
```

Skill 会根据你的请求选择对应的脚本命令。没有参数的 `/export-share` 默认会执行公开发布：

```bash
claude-share publish --current --yes
```

这会创建一个公开、永久的 PinMe/IPFS 页面。只有在确认当前会话可以公开分享时再运行。

如果你用自然语言说“只导出，不要发布”，Claude Code 会选择 `export-current`；如果你说“分享/发布当前对话”，会选择 `publish-current`。

## 安装方式

直接从 GitHub 全局安装 CLI：

```bash
npm install -g github:acezsq/claude-code-export-share
```

或者 clone 仓库后本地链接：

```bash
git clone https://github.com/acezsq/claude-code-export-share.git
cd claude-code-export-share
npm install
npm run build
npm link
```

安装 PinMe：

```bash
npm install -g pinme
pinme login
```

验证 CLI：

```bash
claude-share
```

## CLI 用法

列出当前项目的 sessions：

```bash
claude-share list
```

导出当前项目最近的 session：

```bash
claude-share export --current
```

导出指定 session：

```bash
claude-share export --session <session-id> --claude-dir ~/.claude --out .claude-share/<session-id>
```

发布当前项目最近的 session：

```bash
claude-share publish --current
```

跳过确认并发布指定 session：

```bash
claude-share publish --session <session-id> --yes
```

## 本地预览

生成的页面会通过浏览器 `fetch` 加载 `transcript.json`，所以建议用本地 Web Server 预览，不要直接双击打开 `index.html`：

```bash
cd .claude-share/<session-id>
python3 -m http.server 4173
```

然后打开 `http://localhost:4173`。

## 公开分享提醒

发布后的页面是公开的，并且设计上是永久链接。Claude Code transcript 是明文内容，可能包含 prompt、文件内容、命令输出、工具结果和 secret。

本工具默认会遮蔽常见 secret pattern，但 redaction 是 best-effort，不能保证移除所有敏感信息。

发布到 IPFS 类系统后，即使删除 pin 或网关链接，内容也可能继续被访问。

## Skill 内置命令

本仓库包含 skill：

```text
.claude/skills/export-share/
  SKILL.md
  scripts/export-share.sh
```

它支持这些命令：

```text
/export-share                 # 默认发布当前会话
/export-share publish-current # 发布当前会话
/export-share list            # 列出当前项目 sessions
/export-share export-current  # 只本地导出，不发布
/export-share install-cli     # 安装 claude-share CLI
/export-share help            # 查看帮助
```
