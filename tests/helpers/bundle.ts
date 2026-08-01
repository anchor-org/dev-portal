import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Resolves all $refs/multi-file structure via `redocly bundle` and returns the parsed JSON. */
export function bundleSpec(specPath: string): any {
  const tmpPath = join(tmpdir(), `openapi-bundle-${randomUUID()}.json`);
  try {
    execFileSync(
      'npx',
      ['--yes', '@redocly/cli@latest', 'bundle', specPath, '--ext', 'json', '-o', tmpPath],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    return JSON.parse(readFileSync(tmpPath, 'utf-8'));
  } finally {
    try {
      unlinkSync(tmpPath);
    } catch {
      // already gone, fine
    }
  }
}

export type Operation = { path: string; method: string; op: any };

export function getOperations(spec: any): Operation[] {
  const ops: Operation[] = [];
  for (const [path, methods] of Object.entries<any>(spec.paths ?? {})) {
    for (const [method, op] of Object.entries<any>(methods)) {
      if (['get', 'post', 'patch', 'put', 'delete'].includes(method)) {
        ops.push({ path, method, op });
      }
    }
  }
  return ops;
}
