import { describe, expect, it } from 'vitest';
import { ANCHOR_REPO_PATH, anchorRepoExists, clientText, ops, rpcCallsInClient, sqlFnNames } from '../helpers/fixtures';

/**
 * Checks that only make sense at the whole-spec level: an undocumented
 * RPC has no tag/domain to belong to, so "is every client call documented
 * *somewhere*" can't be attributed to a single domain folder the way the
 * reverse direction (documented RPC has a SQL function) can.
 */

describe('anchor repo availability', () => {
  it(`is checked out at ${ANCHOR_REPO_PATH}`, () => {
    expect(anchorRepoExists, 'set ANCHOR_REPO_PATH to enable integration checks').toBe(true);
  });
});

describe.skipIf(!anchorRepoExists)('RPC completeness', () => {
  it('found SQL function definitions', () => {
    expect(sqlFnNames.size).toBeGreaterThan(0);
  });

  it('found RPC calls in client code', () => {
    expect(rpcCallsInClient.size).toBeGreaterThan(0);
  });

  const specRpcNames = new Set(
    ops.filter((o) => o.path.startsWith('/rpc/')).map((o) => o.path.split('/rpc/')[1])
  );

  it.each([...rpcCallsInClient].sort())('client-called RPC "%s" is documented somewhere in openapi.yaml', (name) => {
    expect(specRpcNames.has(name)).toBe(true);
  });
});

describe.skipIf(!anchorRepoExists)('sanity: client source was actually found', () => {
  it('clientText is non-empty', () => {
    expect(clientText.trim().length).toBeGreaterThan(0);
  });
});
