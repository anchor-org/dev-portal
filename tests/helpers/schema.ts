/** Fully dereferences $ref / allOf / array-items into a flat properties map. */
export function resolveSchema(schema: any, schemas: Record<string, any>): Record<string, any> {
  if (!schema) return {};
  if (schema.$ref) {
    const name = schema.$ref.split('/').pop();
    return resolveSchema(schemas[name], schemas);
  }
  if (schema.type === 'array') {
    return resolveSchema(schema.items, schemas);
  }
  const props: Record<string, any> = {};
  for (const sub of schema.allOf ?? []) {
    Object.assign(props, resolveSchema(sub, schemas));
  }
  Object.assign(props, schema.properties ?? {});
  return props;
}

/** Recursively collects every `$ref` string found anywhere under `obj`. */
export function walkRefs(obj: any): string[] {
  const found: string[] = [];
  if (Array.isArray(obj)) {
    for (const v of obj) found.push(...walkRefs(v));
  } else if (obj && typeof obj === 'object') {
    if (typeof obj.$ref === 'string') found.push(obj.$ref);
    for (const v of Object.values(obj)) found.push(...walkRefs(v));
  }
  return found;
}
