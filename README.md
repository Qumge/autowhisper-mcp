# AutoWhisper MCP

[English](README.md) · [简体中文](README.zh-CN.md)

**Turn your product into marketing content from the agent you already use.**
AutoWhisper gives your agent access to the same products, creative tasks, review queue, publishing connections and results as the web dashboard. Make UGC videos, images and social posts; review the result, then publish to the accounts you have connected.

[Connect your agent to AutoWhisper](https://autowhisper.xyz/en/skill?utm_source=github&utm_medium=readme&utm_campaign=agent_integrations&utm_content=mcp_intro) · [Explore the companion Skill](https://github.com/Qumge/autowhisper-skill)

## Start with one product

1. Connect this MCP server and authorize your AutoWhisper account.
2. Give your agent a product URL, or choose an existing product in a workspace.
3. Ask for a creative, inspect its preview and cost, then decide whether to render or publish.

Try these prompts:

> “Show my products and connected accounts. Don’t start any generation.”
>
> “For this product, prepare one UGC video. Show the preview and quoted cost before continuing.”
>
> “Show which posts failed and how the published content performed.”

## Connect by URL

For clients that support remote HTTP MCP and its authentication, use:

```text
https://autowhisper.xyz/mcp
```

In Claude Code:

```bash
claude mcp add --transport http autowhisper https://autowhisper.xyz/mcp
```

Then open `/mcp`, select AutoWhisper and authenticate. Other compatible clients use their own connector setup. Authorize on the AutoWhisper page; you do not need to paste a token into a conversation. An AutoWhisper account is required.

Prefer a Claude Code plugin that installs the Skill and MCP together? Follow the [companion Skill quick start](https://github.com/Qumge/autowhisper-skill#quick-start).

## Local stdio alternative

For clients that need a local process, Node.js 18+ is required:

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

Ask the agent to connect to AutoWhisper. `autowhisper_connect` returns an approval link and picks up authorization without a restart. Skill and local MCP share `~/.config/autowhisper/credentials.json`.

Already have an API token? Set `AUTOWHISPER_API_TOKEN` in the server environment or secret store. Keep it out of chat and source control.

| Setting | Default | Purpose |
| --- | --- | --- |
| `AUTOWHISPER_API_TOKEN` | Optional | Existing token; otherwise use the approval flow. |
| `AUTOWHISPER_CREDENTIALS` | `~/.config/autowhisper/credentials.json` | Override the shared credential-file path. |
| `AUTOWHISPER_BASE_URL` | `https://autowhisper.xyz` | Self-hosted or staging API origin. |

## What the tools do

| Task | Tools |
| --- | --- |
| Connect and choose a workspace | `autowhisper_connect`, `autowhisper_status`, `autowhisper_products_summary`, `autowhisper_products` |
| Read product facts, materials and presets | `autowhisper_context` |
| Create, revise, resume or render an explicit content request | `autowhisper_create_content`, `autowhisper_update_task`, `autowhisper_task` |
| Plan marketing or discuss an ambiguous creative request | `autowhisper_cmo` |
| Review content and inspect delivery | `autowhisper_feed`, `autowhisper_posts`, `autowhisper_platforms` |
| Edit text or take an explicit action | `autowhisper_edit_content`, `autowhisper_action`, `autowhisper_confirm` |
| Check credits and results | `autowhisper_wallet`, `autowhisper_performance` |

Use the read tools for facts; they avoid a paid CMO chat turn. Explicit supported content requests use context → create/update → confirmation/review → task query. Marketing judgment can use CMO consultation. All four direct-content tools require `workspace_id`; writes also require a stable `request_id`. Check the server-returned capabilities and next actions: a tool in source or a package does not guarantee it is enabled for every account.

### Preview, rendering and publishing are separate

- `accepted` acknowledges a request; `applied` means it reached the native task. Only `delivery_complete=true` confirms the requested deliverable is ready. A script or first frame is not a finished video.
- Generation and CMO consultation use AutoWhisper credits. Read the quote and actual `billing`; charges, refunds and included usage are distinct. Inspect [your wallet](https://autowhisper.xyz/en/wallet) for your account’s current balance and terms.
- **Approving a feed item can render, charge and publish to connected platforms.** Follow the returned confirmation. With no compatible account connected, it schedules nothing; connecting later does not retroactively publish it.
- On an uncertain response, query the original `request_id` or CMO `message_id` before retrying. Reuse identical request payloads and IDs; do not start another charged turn to recover the first.
- Use the server-returned preview approval and current revisions when resuming or rendering. `previous_previews` is history; current partial artifacts are not a completed result.
- AutoWhisper can prepare content and marketing advice. Publishing does not guarantee traffic, sales or ad-campaign execution. Competitor research occurred only if the actual task returns evidence of it.

For the detailed workflow and API reference, see the [AutoWhisper Skill](https://github.com/Qumge/autowhisper-skill).

## MCP or Skill?

MCP supplies callable tools; the Skill teaches an agent when and how to use the workflow. Use MCP alone for tool access, or both for the guided product → preview → review → publish workflow. They use the same AutoWhisper account and native tasks.

[Start with your product on AutoWhisper](https://autowhisper.xyz/en/skill?utm_source=github&utm_medium=readme&utm_campaign=agent_integrations&utm_content=mcp_footer)

## Development

```bash
npm ci
AUTOWHISPER_CONTRACT_FILE=test/fixtures/agent_content_contract.json npm test
```

This builds TypeScript and runs offline contract/behavior checks. Regenerate the fixture from the Rails contract test (`UPDATE_AGENT_CONTENT_CONTRACT=1`) and `src/content-contract.ts` together when changing the API. A passing fixture is separate from production rollout or a real generation/publishing test.

## License

MIT. The open-source license covers this client; hosted AutoWhisper usage follows the service’s account terms and credits.
