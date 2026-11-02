# AutoWhisper MCP

[English](README.md) · [简体中文](README.zh-CN.md)

**在你常用的 Agent 里，把产品变成可审核、可发布的营销内容。**
AutoWhisper 把网页工作台的产品、创作任务、审核队列、平台连接和效果数据开放给 Agent。你可以制作 UGC 视频、图片与社交文案，先看预览，再决定是否渲染和发布到已连接的账号。

[连接 Agent，开始使用 AutoWhisper](https://autowhisper.xyz/zh/skill?utm_source=github&utm_medium=readme&utm_campaign=agent_integrations&utm_content=mcp_intro) · [了解配套 Skill](https://github.com/Qumge/autowhisper-skill/blob/main/README.zh-CN.md)

## 从一个产品开始

1. 连接 MCP，并授权你的 AutoWhisper 账号。
2. 提供产品网址，或选择某个工作区里已有的产品。
3. 请求一条内容，查看预览与费用，再决定是否继续制作或发布。

可以这样说：

> “看看我有哪些产品，连接了哪些账号，先不要生成内容。”
>
> “给这个产品准备一条 UGC 视频，继续之前先让我看预览和预计费用。”
>
> “列出发布失败的帖子，看看已发布内容的表现。”

## 通过网址连接

客户端需支持远程 HTTP MCP 及相应认证。连接地址：

```text
https://autowhisper.xyz/mcp
```

Claude Code：

```bash
claude mcp add --transport http autowhisper https://autowhisper.xyz/mcp
```

然后进入 `/mcp`，选择 AutoWhisper 并认证。其他兼容客户端通过各自的连接器设置添加网址，在 AutoWhisper 页面完成授权；不必把 token 贴进聊天。需要有 AutoWhisper 账号。

想在 Claude Code 一起装好 Skill 和 MCP？请看[配套 Skill 的快速开始](https://github.com/Qumge/autowhisper-skill/blob/main/README.zh-CN.md#快速开始)。

## 本地 stdio 连接

仅需要本地进程的客户端使用此方式，需 Node.js 18+：

```json
{
  "mcpServers": {
    "autowhisper": {
      "command": "npx",
      "args": ["-y", "autowhisper-mcp"]
    }
  }
}
```

让 Agent “连接 AutoWhisper”。`autowhisper_connect` 会返回授权链接，批准后自动生效，不必重启。Skill 与本地 MCP 共用 `~/.config/autowhisper/credentials.json`。

已有 API token 时，可以放进服务进程的 `AUTOWHISPER_API_TOKEN` 环境变量或密钥管理工具；不要写进聊天或 Git 仓库。

| 配置 | 默认值 | 用途 |
| --- | --- | --- |
| `AUTOWHISPER_API_TOKEN` | 可选 | 使用已有 token；未设置时走授权链接。 |
| `AUTOWHISPER_CREDENTIALS` | `~/.config/autowhisper/credentials.json` | 指定共享凭证文件。 |
| `AUTOWHISPER_BASE_URL` | `https://autowhisper.xyz` | 自建或测试环境的 API 地址。 |

## 能做什么

| 任务 | 工具 |
| --- | --- |
| 授权、选择工作区和产品 | `autowhisper_connect`、`autowhisper_status`、`autowhisper_products_summary`、`autowhisper_products` |
| 读取产品事实、素材和模板 | `autowhisper_context` |
| 明确要求的内容创建、修改、继续与渲染 | `autowhisper_create_content`、`autowhisper_update_task`、`autowhisper_task` |
| 营销策略或尚不明确的创意讨论 | `autowhisper_cmo` |
| 审核内容、查看发布进度 | `autowhisper_feed`、`autowhisper_posts`、`autowhisper_platforms` |
| 编辑文字、执行明确操作 | `autowhisper_edit_content`、`autowhisper_action`、`autowhisper_confirm` |
| 查看积分和效果 | `autowhisper_wallet`、`autowhisper_performance` |

查事实走读取工具，避免额外付费 CMO 对话；明确且受支持的创作要求走“上下文 → 创建／修改 → 确认／审核 → 查询任务”。四个直接创作工具均需 `workspace_id`，写入还需稳定的 `request_id`。以服务端返回的能力与下一步操作为准，代码或包里有工具不代表所有账号都已启用。

## 预览、渲染和发布分别确认

- `accepted` 仅表示收到了请求；`applied` 表示请求已进入原生任务。只有 `delivery_complete=true` 才代表请求的成品已交付；脚本和首帧不等于视频做好了。
- 生成和 CMO 咨询使用 AutoWhisper 积分。看报价及实际 `billing`，区分扣费、退款、套餐用量；余额及当前规则见[积分钱包](https://autowhisper.xyz/zh/wallet)。
- **批准 feed 卡片可能同时触发渲染、扣费和向已连接平台发布。** 按返回的确认流程执行；没有可用账号就不会排期，后来连接账号也不会补发旧批准内容。
- 响应不确定时先查原 `request_id` 或 CMO `message_id`。重试复用相同 ID 与参数，不能另开一次付费对话代替恢复。
- 继续／渲染要使用服务端返回的预览批准信息和当前版本。`previous_previews` 是历史记录，部分产物不是最终交付。
- 发布不保证流量、销售或广告投放已执行；只有实际任务给出证据，才能说做过竞品研究。

详细流程与 API 见[配套 Skill](https://github.com/Qumge/autowhisper-skill)。

## MCP 和 Skill 怎么选？

MCP 提供可调用的工具，Skill 提供如何使用的工作流。只需工具可单用 MCP；希望 Agent 按产品、预览、审核、发布的流程协作，可以两者一起用。共用同一个 AutoWhisper 账号与原生任务。

[带上你的产品，开始使用 AutoWhisper](https://autowhisper.xyz/zh/skill?utm_source=github&utm_medium=readme&utm_campaign=agent_integrations&utm_content=mcp_footer)

## 本地开发

```bash
npm ci
AUTOWHISPER_CONTRACT_FILE=test/fixtures/agent_content_contract.json npm test
```

编译 TypeScript 并运行离线合同与行为检查。API 修改时，从 Rails 合同测试导出 fixture（`UPDATE_AGENT_CONTENT_CONTRACT=1`），同步生成 `src/content-contract.ts`。fixture 通过不等于生产已启用，也不等于真实生成／发布测试通过。

## 许可证

MIT 适用于客户端代码；AutoWhisper 托管服务按账号条款和积分计费。
