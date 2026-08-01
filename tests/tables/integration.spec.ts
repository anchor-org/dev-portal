import { describe, expect, it } from 'vitest';
import { anchorRepoExists, opsForTag, tableCallsInClient } from '../helpers/fixtures';

/**
 * Unlike RPCs (split across four tags — an undocumented one has no
 * domain to be attributed to), every table endpoint the client can reach
 * lives under this one "Tables" tag, so both directions of the check
 * (documented ↔ actually used) safely belong here.
 */
describe.skipIf(!anchorRepoExists)('Tables vs. anchor source', () => {
  const tableOps = opsForTag('Tables');
  const specTablePaths = new Set(tableOps.map((o) => o.path.replace(/^\//, '')));

  it('found table .from() calls in client code', () => {
    expect(tableCallsInClient.size).toBeGreaterThan(0);
  });

  it.each([...tableCallsInClient].sort())('client-queried table "%s" has a documented table path', (name) => {
    expect(specTablePaths.has(name)).toBe(true);
  });

  it.each([...specTablePaths].sort())('documented table path "%s" is actually used by the client', (name) => {
    expect(tableCallsInClient.has(name)).toBe(true);
  });
});
