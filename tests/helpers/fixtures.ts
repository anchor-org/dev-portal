import { join } from 'node:path';
import { bundleSpec, getOperations, type Operation } from './bundle';
import { ANCHOR_REPO_PATH, anchorRepoExists, readDirText, readDirTextRecursive } from './anchor-source';

const SPEC_PATH = join(process.cwd(), 'docs', 'openapi.yaml');

export const spec = bundleSpec(SPEC_PATH);
export const ops: Operation[] = getOperations(spec);
export const schemas: Record<string, any> = spec.components?.schemas ?? {};
export const declaredTags = new Set<string>((spec.tags ?? []).map((t: any) => t.name));

export function opsForTag(tag: string): Operation[] {
  return ops.filter(({ op }) => (op.tags ?? []).includes(tag));
}

const sqlText = anchorRepoExists ? readDirText(join(ANCHOR_REPO_PATH, 'supabase-sql'), '.sql') : '';
const libText = anchorRepoExists ? readDirText(join(ANCHOR_REPO_PATH, 'lib'), '.ts') : '';
const appText = anchorRepoExists ? readDirTextRecursive(join(ANCHOR_REPO_PATH, 'app'), '.tsx') : '';

export const clientText = `${libText}\n${appText}`;
export const sqlFnNames = new Set(
  [...sqlText.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\(/gi)].map((m) => m[1])
);
export const rpcCallsInClient = new Set(
  [...clientText.matchAll(/supabase\.rpc\(\s*'([a-zA-Z_]+)'/g)].map((m) => m[1])
);
export const tableCallsInClient = new Set(
  [...clientText.matchAll(/\.from\(\s*'([a-zA-Z_]+)'\s*\)/g)].map((m) => m[1])
);

export { ANCHOR_REPO_PATH, anchorRepoExists };
