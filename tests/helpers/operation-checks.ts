import { describe, expect, it } from 'vitest';
import type { Operation } from './bundle';

/** Per-operation structural checks, shared across every domain's unit.spec.ts. */
export function describeOperationChecks(ops: Operation[], declaredTags: Set<string>) {
  describe.each(ops)('$method $path', ({ path, method, op }) => {
    it('has a summary', () => {
      expect(op.summary).toBeTruthy();
    });

    it('has an operationId', () => {
      expect(op.operationId).toBeTruthy();
    });

    it('has at least one response', () => {
      expect(Object.keys(op.responses ?? {}).length).toBeGreaterThan(0);
    });

    it('has at least one tag', () => {
      expect(op.tags?.length).toBeGreaterThan(0);
    });

    it.each<string>(op.tags ?? [])('tag "%s" is declared at the top level', (tag) => {
      expect(declaredTags.has(tag)).toBe(true);
    });

    if (path.startsWith('/rpc/')) {
      it('RPC path uses POST', () => {
        expect(method).toBe('post');
      });

      it('requestBody declares application/json when required', () => {
        if (!op.requestBody?.required) return;
        expect(op.requestBody?.content?.['application/json']).toBeTruthy();
      });
    }

    const responseEntries = Object.entries<any>(op.responses ?? {});

    it.each(responseEntries.filter(([status]) => status === '204'))(
      '%s response has no content body',
      (_status, resp) => {
        expect(Object.keys(resp.content ?? {}).length).toBe(0);
      }
    );

    it.each(responseEntries.filter(([status]) => status.startsWith('2') && status !== '204'))(
      '%s response has a content schema',
      (_status, resp) => {
        expect(resp.content?.['application/json']).toBeTruthy();
      }
    );
  });
}
