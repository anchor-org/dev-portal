import { describe, expect, it } from 'vitest';
import type { Operation } from './bundle';
import { resolveSchema } from './schema';

function extractRpcCallParams(fnName: string, text: string): Set<string> {
  const re = new RegExp(`supabase\\.rpc\\(\\s*'${fnName}'\\s*(?:,\\s*\\{([^}]*)\\})?`);
  const m = text.match(re);
  if (!m || !m[1]) return new Set();
  return new Set([...m[1].matchAll(/(\w+)\s*:/g)].map((mm) => mm[1]));
}

// A fixed-size window bleeds into whatever unrelated code happens to
// follow; boundaries must match ANY function declaration (exported async,
// or a plain unexported helper like `function mapTransaction`), not just
// exported async ones — otherwise a helper mapper between two RPC calls
// gets swept into the window as if it belonged to the wrong call.
const FN_BOUNDARY_RE = /(?:export\s+)?(?:async\s+)?function\s+\w+/g;

function extractRowFields(fnName: string, text: string): Set<string> {
  const idx = text.indexOf(`'${fnName}'`);
  if (idx === -1) return new Set();
  const starts = [...text.matchAll(FN_BOUNDARY_RE)].map((m) => m.index!);
  const before = starts.filter((s) => s <= idx);
  const after = starts.filter((s) => s > idx);
  const fnStart = before.length ? before[before.length - 1] : idx;
  const fnEnd = after.length ? after[0] : text.length;
  const window = text.slice(fnStart, fnEnd);
  return new Set([...window.matchAll(/row\.(\w+)/g)].map((m) => m[1]));
}

function resolveResponseSchemaProps(op: any, schemas: Record<string, any>): Record<string, any> {
  for (const [status, resp] of Object.entries<any>(op.responses ?? {})) {
    if (!status.startsWith('2') || status === '204') continue;
    return resolveSchema(resp.content?.['application/json']?.schema ?? {}, schemas);
  }
  return {};
}

/**
 * RPC-vs-anchor-source checks for one domain's RPC operations: every
 * documented RPC has a matching SQL function, request params the client
 * actually sends are all documented, and response fields the client reads
 * (`row.*`) exist in the documented response schema.
 */
export function describeRpcIntegrationChecks(params: {
  ops: Operation[];
  sqlFnNames: Set<string>;
  clientText: string;
  schemas: Record<string, any>;
}) {
  const { ops, sqlFnNames, clientText, schemas } = params;
  const rpcOps = ops.filter((o) => o.path.startsWith('/rpc/'));

  describe('SQL function definitions', () => {
    it.each(rpcOps.map((o) => o.path.split('/rpc/')[1]))(
      'documented RPC "%s" has a matching SQL function',
      (name) => {
        expect(sqlFnNames.has(name)).toBe(true);
      }
    );
  });

  describe('request params vs. client calls', () => {
    it.each(rpcOps)('[$path] client-sent params are all documented', ({ path, op }) => {
      const fnName = path.split('/rpc/')[1];
      const clientParams = extractRpcCallParams(fnName, clientText);
      if (clientParams.size === 0) return;
      const schema = op.requestBody?.content?.['application/json']?.schema ?? {};
      const specParams = new Set(Object.keys(schema.properties ?? {}));
      const missing = [...clientParams].filter((p) => !specParams.has(p));
      expect(missing, `missing from spec: ${missing.join(', ')}`).toEqual([]);
    });
  });

  describe('response fields vs. client reads', () => {
    const opsWithRowReads = rpcOps
      .map((o) => ({ ...o, fields: extractRowFields(o.path.split('/rpc/')[1], clientText) }))
      .filter((o) => o.fields.size > 0);

    it.each(opsWithRowReads)('[$path] fields read by client (row.*) exist in response schema', ({ op, fields }) => {
      const props = resolveResponseSchemaProps(op, schemas);
      const missing = [...fields].filter((f) => !(f in props));
      expect(missing, `missing: ${missing.join(', ')}`).toEqual([]);
    });
  });
}
