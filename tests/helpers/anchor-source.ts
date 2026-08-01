import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ANCHOR_REPO_PATH = process.env.ANCHOR_REPO_PATH ?? join(process.cwd(), '..', 'anchor');
export const anchorRepoExists = existsSync(ANCHOR_REPO_PATH);

/** Concatenates every file matching `ext` directly under `dir` (non-recursive). */
export function readDirText(dir: string, ext: string): string {
  if (!existsSync(dir)) return '';
  return readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => readFileSync(join(dir, f), 'utf-8'))
    .join('\n');
}

/** Same as readDirText, but walks subdirectories too (app/**\/*.tsx has nested routes). */
export function readDirTextRecursive(dir: string, ext: string): string {
  if (!existsSync(dir)) return '';
  let text = '';
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      text += readDirTextRecursive(full, ext);
    } else if (entry.name.endsWith(ext)) {
      text += readFileSync(full, 'utf-8') + '\n';
    }
  }
  return text;
}
