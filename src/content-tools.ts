import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { contentContract } from "./content-contract.js";

export interface ContentApiClient {
  get(path: string, params: Record<string, unknown>): Promise<unknown>;
  post(path: string, payload: Record<string, unknown>): Promise<unknown>;
}

type Schema = {type?: string | string[]; properties?: Record<string, Schema>; required?: string[];
  additionalProperties?: boolean | Schema; items?: Schema; enum?: string[]; pattern?: string;
  minLength?: number; maxLength?: number; minimum?: number; minItems?: number; maxItems?: number};
type Definition = {name: string; description: string; method: string; path: string; inputSchema: Schema;
  annotations: {title?: string; readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean; openWorldHint: boolean}};

// Generated Rails schemas are the source of truth; this converts their public
// JSON Schema subset into the SDK's validators without a second field list.
function validator(schema: Schema): z.ZodTypeAny {
  if (Array.isArray(schema.type)) {
    const alternatives = schema.type.map(type => validator({...schema, type}));
    return z.union(alternatives as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  }
  switch (schema.type) {
    case "null": return z.null();
    case "boolean": return z.boolean();
    case "integer": return z.number().int().min(schema.minimum ?? Number.MIN_SAFE_INTEGER);
    case "string": {
      let value = z.string().min(schema.minLength ?? 0);
      if (schema.maxLength !== undefined) value = value.max(schema.maxLength);
      if (schema.pattern) value = value.regex(new RegExp(schema.pattern));
      return schema.enum ? z.enum(schema.enum as [string, ...string[]]) : value;
    }
    case "array": return z.array(validator(schema.items || {})).min(schema.minItems ?? 0).max(schema.maxItems ?? Number.MAX_SAFE_INTEGER);
    case "object": {
      if (!schema.properties) return z.record(typeof schema.additionalProperties === "object" ? validator(schema.additionalProperties) : z.unknown());
      const required = new Set(schema.required || []);
      const shape = Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, required.has(key) ? validator(value) : validator(value).optional()]));
      return schema.additionalProperties === false ? z.object(shape).strict() : z.object(shape).passthrough();
    }
    default: return z.unknown();
  }
}

function receipt(data: unknown, isError = false) {
  return {content: [{type: "text" as const, text: JSON.stringify(data)}], ...(isError ? {isError: true} : {})};
}

export function registerContentTools(server: McpServer, client: ContentApiClient): void {
  for (const definition of contentContract.content_capabilities.tools as unknown as Definition[]) {
    server.registerTool(definition.name, {description: definition.description,
      inputSchema: validator(definition.inputSchema) as z.AnyZodObject, annotations: definition.annotations}, async (args: Record<string, unknown>) => {
      const payload = {...args};
      let path = definition.path;
      if (definition.name === "autowhisper_task") {
        if ((payload.request_id !== undefined) === (payload.task_id !== undefined)) {
          return receipt({error: {code: "invalid_request", message: "Provide exactly one request_id or task_id", retryable: false, details: {}}, next_actions: []}, true);
        }
        if (payload.request_id !== undefined) { path = `/api/content/requests/${payload.request_id}`; delete payload.request_id; }
        else { path = `/api/content/tasks/${payload.task_id}`; delete payload.task_id; }
      } else if (definition.name === "autowhisper_update_task") {
        path = `/api/content/tasks/${payload.task_id}/operations`; delete payload.task_id;
      }
      try {
        const data = await (definition.method === "GET" ? client.get(path, payload) : client.post(path, payload));
        return receipt(data, !!(data && typeof data === "object" && "error" in data && data.error));
      } catch {
        return receipt({error: {code: "submission_unknown", message: "The API response was not received. Read the same request_id before retrying the identical request.", retryable: false, details: {}}, next_actions: []}, true);
      }
    });
  }
}
