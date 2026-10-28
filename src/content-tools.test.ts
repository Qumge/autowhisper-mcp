import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerContentTools } from "./content-tools.js";
import { contentContract } from "./content-contract.js";

const fixture = JSON.parse(readFileSync(new URL("../test/fixtures/agent_content_contract.json", import.meta.url), "utf8"));

test("packaged schemas match the Rails-exported offline contract", () => {
  assert.deepEqual(contentContract, fixture);
});

test("real SDK tools preserve direct API requests, receipts and explicit scope", async () => {
  const calls: Array<{ method: string; path: string; payload: Record<string, unknown> }> = [];
  const response = { request_id: "sdk_request_001", request_state: "accepted", task_id: null, quote: { credits_total: 23 }, next_poll_after_ms: 3000 };
  const server = new McpServer({ name: "test", version: "1" });
  registerContentTools(server, {
    async get(path, payload) { calls.push({ method: "GET", path, payload }); return response; },
    async post(path, payload) { calls.push({ method: "POST", path, payload }); return response; },
  });
  const client = new Client({ name: "test-client", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const list = await client.listTools();
    assert.deepEqual(list.tools.map(t => t.name), fixture.content_capabilities.tools.map((t: {name: string}) => t.name));
    for (const tool of list.tools) {
      const expected = fixture.content_capabilities.tools.find((t: {name: string}) => t.name === tool.name);
      assert.deepEqual(Object.keys(tool.inputSchema.properties || {}).sort(), Object.keys(expected.inputSchema.properties).sort());
      assert.deepEqual([...(tool.inputSchema.required || [])].sort(), [...expected.inputSchema.required].sort());
      assert.equal(tool.annotations?.readOnlyHint, expected.annotations.readOnlyHint);
    }
    const args = { workspace_id: 12, request_id: "sdk_request_001", product_id: 34, brief: {content_language: "en"}, items: [{key: "one", content_type: "ugc", format: {duration_sec: 15}}] };
    const created = await client.callTool({name: "autowhisper_create_content", arguments: args});
    assert.deepEqual(calls, [{method: "POST", path: "/api/content/tasks", payload: args}]);
    assert.deepEqual(JSON.parse((created.content as Array<{text: string}>)[0].text), response);
    const update = { workspace_id: 12, request_id: "sdk_update_001", task_id: 56, operation: "resume", item_ids: [78], expected_task_revision: 3, expected_revisions: {"78": 4}, preview_approval: {operation_id: 9, revision: 4, preview_digest: "saved", credits: 20} };
    await client.callTool({name: "autowhisper_update_task", arguments: update});
    const {task_id: _task, ...body} = update;
    assert.deepEqual(calls[1], {method: "POST", path: "/api/content/tasks/56/operations", payload: body});
    await client.callTool({name: "autowhisper_context", arguments: {workspace_id: 12, product_id: 34}});
    assert.deepEqual(calls[2], {method: "GET", path: "/api/content/context", payload: {workspace_id: 12, product_id: 34}});
    await client.callTool({name: "autowhisper_task", arguments: {workspace_id: 12, request_id: "sdk_request_001"}});
    assert.deepEqual(calls[3], {method: "GET", path: "/api/content/requests/sdk_request_001", payload: {workspace_id: 12}});
    await client.callTool({name: "autowhisper_task", arguments: {workspace_id: 12, task_id: 56}});
    assert.equal(calls[4].path, "/api/content/tasks/56");
    for (const invalid of [{request_id: "sdk_request_001"}, {workspace_id: 12}, {workspace_id: 12, task_id: 56, request_id: "sdk_request_001"}]) {
      const result = await client.callTool({name: "autowhisper_task", arguments: invalid});
      assert.equal(result.isError, true);
    }
    assert.equal(calls.length, 5, "invalid calls and background polling must not send requests");
  } finally { await client.close(); await server.close(); }
});

test("direct API failures keep their machine readable error and next actions", async () => {
  const failure = {error: {code: "stale_revision", message: "Refresh task", retryable: false, details: {}}, next_actions: [{operation: "refresh"}]};
  const server = new McpServer({name: "test", version: "1"});
  registerContentTools(server, {async get() { return failure; }, async post() { return failure; }});
  const client = new Client({name: "test", version: "1"});
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b); await client.connect(a);
  try {
    const result = await client.callTool({name: "autowhisper_task", arguments: {workspace_id: 12, task_id: 56}});
    assert.equal(result.isError, true);
    assert.deepEqual(JSON.parse((result.content as Array<{text: string}>)[0].text), failure);
  } finally { await client.close(); await server.close(); }
});
