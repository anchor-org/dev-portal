import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { walkRefs } from '../helpers/schema';
import { declaredTags, ops, schemas, spec } from '../helpers/fixtures';

/** Spec-wide checks that aren't specific to any one API domain/tag. */

describe('spec metadata', () => {
  it('declares OpenAPI 3.0.x', () => {
    expect(spec.openapi).toMatch(/^3\.0/);
  });
  it('has an info.title', () => {
    expect(spec.info?.title).toBeTruthy();
  });
  it('has an info.version', () => {
    expect(spec.info?.version).toBeTruthy();
  });
  it('declares at least one server', () => {
    expect(spec.servers?.length).toBeGreaterThan(0);
  });
  it('declares at least one security scheme', () => {
    expect(Object.keys(spec.components?.securitySchemes ?? {}).length).toBeGreaterThan(0);
  });
  it('declares at least one tag', () => {
    expect(declaredTags.size).toBeGreaterThan(0);
  });
});

describe('operationIds', () => {
  it('are all unique across every domain', () => {
    const ids = ops.map(({ op }) => op.operationId).filter(Boolean);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });
});

describe('components.schemas', () => {
  it('has at least one schema', () => {
    expect(Object.keys(schemas).length).toBeGreaterThan(0);
  });

  const allSchemaRefs = [...new Set(walkRefs(spec.paths))].filter((r) =>
    r.startsWith('#/components/schemas/')
  );

  it.each(allSchemaRefs)('$ref "%s" resolves to a declared schema', (ref) => {
    const name = ref.split('/').pop()!;
    expect(schemas[name]).toBeTruthy();
  });

  describe.each(Object.entries(schemas))('%s', (_name, schema: any) => {
    // Always at least one assertion per schema — vitest errors on a
    // describe block with zero `it`s, which a schema with no uuid/enum/
    // allOf properties would otherwise produce.
    it('is an object schema', () => {
      expect(schema.type ?? 'object').toBe('object');
    });

    const allOfRefs = (schema.allOf ?? []).filter((sub: any) => sub.$ref);
    it.each<any>(allOfRefs)('allOf $ref "%s" resolves', (sub) => {
      expect(schemas[sub.$ref.split('/').pop()!]).toBeTruthy();
    });

    const props = Object.entries<any>(schema.properties ?? {});

    it.each(props.filter(([, p]) => p.format === 'uuid'))('%s (format=uuid) is typed string', (_pname, p) => {
      expect(p.type).toBe('string');
    });

    it.each(props.filter(([, p]) => p.enum))('%s enum has >= 2 values', (_pname, p) => {
      expect(p.enum.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('generated site (index.html)', () => {
  const htmlPath = join(process.cwd(), 'index.html');
  const exists = existsSync(htmlPath);

  it('exists', () => {
    expect(exists, 'run `redocly build-docs` first').toBe(true);
  });

  const opIds = ops.map(({ op }) => op.operationId).filter(Boolean);
  const html = exists ? readFileSync(htmlPath, 'utf-8') : '';

  it.each(exists ? opIds : [])('contains operationId "%s"', (id) => {
    expect(html).toContain(id);
  });

  it.skipIf(!exists)('title matches spec info.title', () => {
    expect(html).toContain(spec.info.title);
  });

  it.skipIf(!exists)('includes the generated light/dark theme controls', () => {
    expect(html).toContain('id="anchor-theme-styles"');
    expect(html).toContain('id="anchor-theme-toggle"');
    expect(html).toContain('id="anchor-theme-script"');
    expect(html).toContain('.menu-content label');
    expect(html).toContain('.menu-content > div:nth-child(2) > div:nth-child(2)');
    expect(html).toContain('.redoc-wrap > div:nth-child(2)');
  });
});
