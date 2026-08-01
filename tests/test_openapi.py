#!/usr/bin/env python3
"""Unit + integration tests for docs/openapi.yaml (Anchor API docs).

Unit tests check the spec's internal structure in isolation — they always
run, no external dependencies beyond this repo.

Integration tests cross-check the spec against the real SQL functions and
TypeScript client code in the `anchor` repo. They need that repo checked
out somewhere on disk — point ANCHOR_REPO_PATH at it, or let it default to
`../anchor` (a sibling checkout, the normal local layout). If it can't be
found, integration checks are skipped (not failed) so this still works as
a docs-only sanity check.

Usage:
    python3 tests/test_openapi.py
    ANCHOR_REPO_PATH=/path/to/anchor python3 tests/test_openapi.py
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

DEV_PORTAL_ROOT = Path(__file__).resolve().parent.parent
SPEC_PATH = DEV_PORTAL_ROOT / "docs" / "openapi.yaml"
HTML_PATH = DEV_PORTAL_ROOT / "index.html"
ANCHOR_REPO = Path(os.environ.get("ANCHOR_REPO_PATH", DEV_PORTAL_ROOT.parent / "anchor"))

results = []
CATEGORY = ["unit"]


def check(name, condition, detail=""):
    results.append((CATEGORY[0], name, bool(condition), detail))


def bundle_spec(spec_path: Path) -> dict:
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        subprocess.run(
            ["npx", "--yes", "@redocly/cli@latest", "bundle", str(spec_path), "--ext", "json", "-o", str(tmp_path)],
            check=True,
            capture_output=True,
            text=True,
        )
        return json.loads(tmp_path.read_text())
    finally:
        tmp_path.unlink(missing_ok=True)


spec = bundle_spec(SPEC_PATH)


def get_operations():
    ops = []
    for path, methods in spec["paths"].items():
        for method, op in methods.items():
            if method in ("get", "post", "patch", "put", "delete"):
                ops.append((path, method, op))
    return ops


ops = get_operations()

# ============================================================
# UNIT TESTS — spec-internal correctness
# ============================================================

check("openapi version is 3.0.x", spec.get("openapi", "").startswith("3.0"))
check("info.title present", bool(spec.get("info", {}).get("title")))
check("info.version present", bool(spec.get("info", {}).get("version")))
check("at least one server declared", len(spec.get("servers", [])) > 0)
check("at least one security scheme declared", len(spec.get("components", {}).get("securitySchemes", {})) > 0)

declared_tags = {t["name"] for t in spec.get("tags", [])}
check(f"top-level tags declared ({len(declared_tags)})", len(declared_tags) > 0, str(declared_tags))

check(f"has paths ({len(spec['paths'])})", len(spec["paths"]) > 0)

for path in spec["paths"]:
    check(f"path starts with '/': {path}", path.startswith("/"))

check(f"total operations found: {len(ops)}", len(ops) > 0)

op_ids = []
for path, method, op in ops:
    check(f"[{method.upper()} {path}] has summary", bool(op.get("summary")), op.get("summary", "MISSING"))
    check(f"[{method.upper()} {path}] has operationId", bool(op.get("operationId")))
    if op.get("operationId"):
        op_ids.append(op["operationId"])
    check(f"[{method.upper()} {path}] has >=1 response", len(op.get("responses", {})) > 0)
    check(f"[{method.upper()} {path}] has >=1 tag", len(op.get("tags", [])) > 0)
    for tag in op.get("tags", []):
        check(f"[{method.upper()} {path}] tag '{tag}' is declared at top level", tag in declared_tags)
    if path.startswith("/rpc/"):
        check(f"[{method.upper()} {path}] RPC path uses POST", method == "post")
        rb = op.get("requestBody", {}).get("content", {})
        check(f"[{method.upper()} {path}] requestBody declares application/json", "application/json" in rb or not op.get("requestBody", {}).get("required", False))
    for status, resp in op.get("responses", {}).items():
        content = resp.get("content", {})
        if status in ("204",):
            check(f"[{method.upper()} {path}] 204 response has no content body", len(content) == 0)
        if status.startswith("2") and status != "204":
            check(f"[{method.upper()} {path}] {status} response has content schema", "application/json" in content)

dupes = [oid for oid in set(op_ids) if op_ids.count(oid) > 1]
check(f"all operationIds unique ({len(op_ids)} total)", len(dupes) == 0, f"dupes: {dupes}")

schemas = spec.get("components", {}).get("schemas", {})
check(f"components.schemas has entries ({len(schemas)})", len(schemas) > 0, str(list(schemas.keys())))


def walk_refs(obj, path=""):
    found = []
    if isinstance(obj, dict):
        if "$ref" in obj:
            found.append(obj["$ref"])
        for k, v in obj.items():
            found += walk_refs(v, path + "/" + k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            found += walk_refs(v, path + f"[{i}]")
    return found


all_refs = walk_refs(spec["paths"])
for ref in set(all_refs):
    if ref.startswith("#/components/schemas/"):
        name = ref.split("/")[-1]
        check(f"$ref resolves: {ref}", name in schemas)

for name, schema in schemas.items():
    props = schema.get("properties", {})
    if "allOf" in schema:
        for sub in schema["allOf"]:
            if "$ref" in sub:
                check(f"schema {name}.allOf $ref resolves", sub["$ref"].split("/")[-1] in schemas)
    for pname, pschema in props.items():
        if pschema.get("format") == "uuid":
            check(f"schema {name}.{pname} format=uuid is typed string", pschema.get("type") == "string")
        if "enum" in pschema:
            check(f"schema {name}.{pname} enum has >=2 values", len(pschema["enum"]) >= 2, str(pschema["enum"]))

# ============================================================
# INTEGRATION — generated HTML matches this spec
# ============================================================
if HTML_PATH.exists():
    html_text = HTML_PATH.read_text()
    missing_ops = [oid for oid in op_ids if oid not in html_text]
    check(f"index.html contains all {len(op_ids)} operationIds from current spec", len(missing_ops) == 0, f"missing: {missing_ops}")
    check("index.html title matches spec info.title", spec["info"]["title"] in html_text)
else:
    check("index.html exists for drift check", False, "not found — run redocly build-docs first")

# ============================================================
# INTEGRATION TESTS — spec vs. actual SQL / TypeScript source in `anchor`
# ============================================================
CATEGORY[0] = "integration"

if not ANCHOR_REPO.exists():
    check(
        f"anchor repo available at {ANCHOR_REPO}",
        False,
        "SKIPPED — set ANCHOR_REPO_PATH to enable cross-repo integration checks",
    )
else:
    sql_text = ""
    for f in (ANCHOR_REPO / "supabase-sql").glob("*.sql"):
        sql_text += f.read_text() + "\n"

    sql_fn_names = set(re.findall(r"create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\(", sql_text, re.IGNORECASE))

    lib_ts_text = ""
    for f in (ANCHOR_REPO / "lib").glob("*.ts"):
        lib_ts_text += f.read_text() + "\n"
    for f in (ANCHOR_REPO / "app").rglob("*.tsx"):
        lib_ts_text += f.read_text() + "\n"

    rpc_calls_in_client = set(re.findall(r"supabase\.rpc\(\s*'([a-zA-Z_]+)'", lib_ts_text))
    table_calls_in_client = set(re.findall(r"\.from\(\s*'([a-zA-Z_]+)'\s*\)", lib_ts_text))

    spec_rpc_names = {path.split("/rpc/")[-1] for path, method, op in ops if path.startswith("/rpc/")}
    spec_table_paths = {path.lstrip("/") for path, method, op in ops if not path.startswith("/rpc/") and not path.startswith("/auth/")}

    check(f"SQL functions found in supabase-sql/*.sql ({len(sql_fn_names)})", len(sql_fn_names) > 0, str(sorted(sql_fn_names)))
    check(f"RPC calls found in lib/*.ts + app/**/*.tsx ({len(rpc_calls_in_client)})", len(rpc_calls_in_client) > 0, str(sorted(rpc_calls_in_client)))
    check(f"table .from() calls found in client code ({len(table_calls_in_client)})", len(table_calls_in_client) > 0, str(sorted(table_calls_in_client)))

    for name in sorted(spec_rpc_names):
        check(f"documented RPC '{name}' has a matching SQL function definition", name in sql_fn_names)

    for name in sorted(rpc_calls_in_client):
        check(f"client-called RPC '{name}' is documented in openapi.yaml", name in spec_rpc_names)

    for name in sorted(table_calls_in_client):
        check(f"client-queried table '{name}' has a documented table path", name in spec_table_paths)

    for name in sorted(spec_table_paths):
        check(f"documented table path '{name}' is actually used by the client", name in table_calls_in_client)

    # Cross-check request-body param names against the actual .rpc(name, {...}) call sites.
    def extract_rpc_call_params(fn_name, text):
        m = re.search(r"supabase\.rpc\(\s*'" + re.escape(fn_name) + r"'\s*(?:,\s*\{([^}]*)\})?", text)
        if not m or not m.group(1):
            return set()
        return set(re.findall(r"(\w+)\s*:", m.group(1)))

    for path, method, op in ops:
        if not path.startswith("/rpc/"):
            continue
        fn_name = path.split("/rpc/")[-1]
        if fn_name not in rpc_calls_in_client:
            continue
        client_params = extract_rpc_call_params(fn_name, lib_ts_text)
        schema = op.get("requestBody", {}).get("content", {}).get("application/json", {}).get("schema", {})
        spec_params = set(schema.get("properties", {}).keys())
        if client_params:
            missing = client_params - spec_params
            check(f"[{fn_name}] client-sent params all documented", len(missing) == 0, f"missing from spec: {missing}" if missing else "")

    # Cross-check response field names the client actually reads (row.xxx) against the schema properties.
    FN_BOUNDARY_RE = re.compile(r"(?:export\s+)?(?:async\s+)?function\s+\w+")

    def extract_row_fields(fn_name, text):
        # Scope the search to the enclosing function block that contains the
        # `.rpc('fn_name'` call, not a fixed-size window — a fixed window bleeds
        # into whatever unrelated code happens to follow. Boundaries must match
        # ANY function declaration (export async function, or a plain unexported
        # helper like `function mapTransaction`), not just exported async ones —
        # otherwise a helper mapper between two RPC calls gets swept into the
        # window as if it belonged to the wrong call.
        idx = text.find(f"'{fn_name}'")
        if idx == -1:
            return set()
        starts = [m.start() for m in FN_BOUNDARY_RE.finditer(text)]
        before = [s for s in starts if s <= idx]
        after = [s for s in starts if s > idx]
        fn_start = before[-1] if before else idx
        fn_end = after[0] if after else len(text)
        window = text[fn_start:fn_end]
        return set(re.findall(r"row\.(\w+)", window))

    def resolve_schema(schema):
        """Fully dereference $ref / allOf / array-items into a flat properties dict."""
        if not schema:
            return {}
        if "$ref" in schema:
            name = schema["$ref"].split("/")[-1]
            return resolve_schema(schemas.get(name, {}))
        if schema.get("type") == "array":
            return resolve_schema(schema.get("items", {}))
        props = {}
        for sub in schema.get("allOf", []):
            props.update(resolve_schema(sub))
        props.update(schema.get("properties", {}))
        return props

    def resolve_response_schema_props(op):
        for status, resp in op.get("responses", {}).items():
            if not status.startswith("2") or status == "204":
                continue
            schema = resp.get("content", {}).get("application/json", {}).get("schema", {})
            return resolve_schema(schema)
        return {}

    for path, method, op in ops:
        if not path.startswith("/rpc/"):
            continue
        fn_name = path.split("/rpc/")[-1]
        fields_read = extract_row_fields(fn_name, lib_ts_text)
        if not fields_read:
            continue
        props = resolve_response_schema_props(op)
        missing = fields_read - set(props.keys())
        check(f"[{fn_name}] fields read by client (row.*) exist in response schema", len(missing) == 0, f"missing: {missing}" if missing else "")

# ============================================================
# REPORT
# ============================================================
passed = [r for r in results if r[2]]
failed = [r for r in results if not r[2]]

for cat in ("unit", "integration"):
    cat_results = [r for r in results if r[0] == cat]
    cat_passed = [r for r in cat_results if r[2]]
    print(f"{cat.upper():12s} {len(cat_passed):4d} / {len(cat_results):4d} passed")

print(f"\n{'='*70}\nTOTAL CHECKS: {len(results)}   PASSED: {len(passed)}   FAILED: {len(failed)}\n{'='*70}\n")

if failed:
    print("FAILURES:\n")
    for cat, name, ok, detail in failed:
        print(f"  ✗ [{cat}] {name}")
        if detail:
            print(f"      {detail}")
else:
    print("All checks passed.")

sys.exit(1 if failed else 0)
