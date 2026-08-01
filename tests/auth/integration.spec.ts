import { describe, expect, it } from 'vitest';
import { anchorRepoExists, clientText } from '../helpers/fixtures';

/**
 * Auth has no backing SQL function to cross-check against (GoTrue is a
 * managed Supabase service, not our own `public.*` schema) — instead,
 * verify the client actually calls the Supabase Auth SDK methods each
 * documented operation claims to model.
 */
describe.skipIf(!anchorRepoExists)('Auth vs. anchor source', () => {
  const expectedCalls: Record<string, string> = {
    'POST /auth/v1/signup': 'supabase.auth.signUp(',
    'POST /auth/v1/token (password grant, via signInWithPassword)': 'supabase.auth.signInWithPassword(',
    'POST /auth/v1/logout': 'supabase.auth.signOut(',
  };

  it.each(Object.entries(expectedCalls))('%s — client calls %s', (_label, call) => {
    expect(clientText.includes(call), `expected to find "${call}" somewhere in anchor's client code`).toBe(true);
  });
});
