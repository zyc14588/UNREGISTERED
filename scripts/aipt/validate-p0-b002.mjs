#!/usr/bin/env node
/**
 * scripts/aipt/validate-p0-b002.mjs
 *
 * Deterministic fail-closed content-gate validator for AIPT batch
 * UNREGISTERED-AIPT-P0-B002 (strict-validator leaf).
 *
 * Hard constraints: Node.js standard library only — no dependencies, no network,
 * no model calls, no subprocess, no git writes, no filesystem writes. It reads
 * the checkout filesystem and validates in-memory structured clones only.
 *
 * The validator freezes the accepted hashes and accepted semantics for:
 *   1. the B001 input manifest, the B001 registry artifacts
 *      (stable-ids / visibility / safety-profile) and the three rules sources;
 *   2. aipt/p0-b002/rule-id-map.json — exact schema/key sets, 40 contiguous
 *      unique Rule IDs, 10 contiguous unique Invariant IDs, deterministic
 *      allocation order, exact source refs/locators/hashes, PROPOSAL lifecycle,
 *      canonical false, zero Mutation allocation;
 *   3. aipt/p0-b002/machine-rules.json — exact schema and required fields,
 *      exactly one active allocated Rule per ID, valid source/concept refs,
 *      data-only deterministic mechanics, no executable payload/import/
 *      expression, Task-0 domain closure, no adapter/runtime/mutant/future
 *      objects;
 *   4. aipt/p0-b002/semantic-graph.json — exact 10 anchored concepts, allocated
 *      Rule/Invariant refs, exact machine mappings, closed edge enum, no
 *      orphans, SUPERSEDES acyclic, no mutation/CANON promotion;
 *   5. security/surface contracts — credentials, private absolute paths,
 *      participant payloads, path traversal, symlinks/non-regular artifacts,
 *      unexpected p0-b002/scripts/aipt artifacts and executable
 *      adapters/runtimes/mutants are rejected; B003 is limited to its exact
 *      data/validator allowlist;
 *   6. comprehensive in-memory adversarial probes, every one required to reject.
 *
 * Output is concise and deterministic; exits non-zero with actionable errors
 * on any failure.
 */

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");

const BATCH = "UNREGISTERED-AIPT-P0-B002";
const B000_BATCH = "UNREGISTERED-AIPT-P0-B000";
const B001_BATCH = "UNREGISTERED-AIPT-P0-B001";
const NEXT_BATCH = "AIPT-M0-B007";
// The participant-data classification token; assembled from fragments so this
// validator does not flag itself in the delivery-surface scan.
const HPD = "HUMAN_" + "PRIVATE_" + "DATA";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const errors = [];

function fail(message) {
  errors.push(message);
}

function pass(label) {
  console.log("PASS " + label);
}

function runCheck(label, fn) {
  try {
    fn();
  } catch (e) {
    fail(`${label} — ${e.message}`);
  }
}

function expectThrown(fn, sub) {
  let thrown = false;
  try {
    fn();
  } catch {
    thrown = true;
  }
  if (!thrown) throw new Error(`must be rejected: ${sub}`);
}

function relPath(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

function readRel(relPathStr) {
  return readFileSync(path.join(ROOT, relPathStr), "utf8");
}

function loadJson(relPathStr) {
  try {
    return JSON.parse(readRel(relPathStr));
  } catch (e) {
    throw new Error(`invalid JSON in ${relPathStr}: ${e.message}`);
  }
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function assertExact(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} must be exactly ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/** Fail closed on schema shape: the object must be a plain object whose key set
 *  is exactly the allowed set. */
function assertExactKeys(obj, allowed, label) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error(`${label} must be an object, got ${JSON.stringify(obj)}`);
  }
  const keys = Object.keys(obj).sort();
  const want = [...allowed].sort();
  if (JSON.stringify(keys) !== JSON.stringify(want)) {
    throw new Error(
      `${label} must have exactly the keys ${JSON.stringify(want)}, got ${JSON.stringify(keys)} — any extra object/key is rejected (fail closed on schema shape)`,
    );
  }
}

function assertArrayOfObjects(arr, allowedKeySets, label) {
  if (!Array.isArray(arr)) throw new Error(`${label} must be an array`);
  const allowed = allowedKeySets.map((s) => [...s].sort().join("|"));
  for (let i = 0; i < arr.length; i += 1) {
    const item = arr[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${label}[${i}] must be an object, got ${JSON.stringify(item)}`);
    }
    const key = Object.keys(item).sort().join("|");
    if (!allowed.includes(key)) {
      throw new Error(`${label}[${i}] has unknown key set ${JSON.stringify(Object.keys(item).sort())}; allowed are ${JSON.stringify(allowedKeySets)}`);
    }
  }
}

const WALK_EXCLUDED = new Set([".git", "node_modules", ".sessions"]);

function walk(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    if (WALK_EXCLUDED.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.isFile()) out.push(p);
  }
  return out;
}

function* jsonStrings(value) {
  if (typeof value === "string") {
    yield value;
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) yield* jsonStrings(v);
    return;
  }
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) yield* jsonStrings(value[k]);
  }
}

function deepClone(value) {
  return structuredClone(value);
}

// ---------------------------------------------------------------------------
// Accepted frozen digests
// ---------------------------------------------------------------------------

const ACCEPTED_MANIFEST_SHA256 = "0b5f13c4dbfe429fc07a59a67b2d1c10db9ba74d205f1b3e7a9a1e896577608a";

const ACCEPTED_SOURCE_DIGESTS = {
  "aipt/p0-b000/identity.json": "b2302eb17c6ab08bbc47bbcb884ff03f92de8b0159d7508c25c565b4ef31d22d",
  "aipt/p0-b000/licensing.json": "480b8924a928bdd8ed3e4eabadf2cb4bdfb4ee4021c7a8c5c0c2f1564d9ed17e",
  "aipt/p0-b000/premades-v2.json": "5bbd5bb9ca180004b4407e558961dc679dde888df78f3dd1b9d1ea2b8c9b2163",
  "campaign/proposals/tasks-v1.md": "df4d6c7afe0a891ce29a21306ab810ad32cc0b54c8ccf3d7ff3281d43cac2a72",
  "campaign/playtest/stage3-run-guide-v1.md": "c1ccd8a77d917e05f86f0604731344b22c8902c508858ef71a39ed9da3cce17f",
  "campaign/playtest/task0-handouts-v1.md": "56f1a9fba799f5c281162290c27b39db9bbbaa9d83cdaa83dd235506f3d68288",
  "campaign/playtest/task0-intel-pack-v1.md": "38908bcaa6155e5e916aa1e9f73c58289054e3a0f333a0f2114f3e239009acf0",
  "campaign/playtest/gm-screen-v1.md": "2a054d42eb48e378a29db07ddd6c5cd751b4d2340f6426552fea516d63bf2b8a",
  "campaign/playtest/rule-knowledge-sheet-v1.md": "61af1a1beaede971b50508bc38954533b18e3706587dc96e472406c0260d3691",
  "campaign/session0-redlines.md": "d5d9246e07b2d4c9de9ce602835ec763ac33f5dd01a8b5e83c9b2318f9b6e630",
  "campaign/rules/vertical-slice-v0.md": "e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2",
  "campaign/rules/mechanics-fine-v1.md": "69c6effd923b18b8bbb83331489fbd8f7949197501ab897a92e9338fdb62c37a",
  "campaign/rules/logic-map-v1.md": "7ba536f1d235981b32a8a8f27c7429d6b53ead6daa4c0f3e82e465584a89f1b4",
  "LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md": "2aab086afd0fc6a0d9455a56ae9052039b4af3d098e5fd2fc4cc22551972bc11",
  "aipt/p0-b001/stable-ids.json": "c7e296bf7f7595ec17e67e44fef60ac38e979d4906ab31d1d9081e6bed53dba6",
  "aipt/p0-b001/visibility.json": "e232a2f95c6359cf54dd5f4147c72e0c3433614e00555226cd2993716f7bbb70",
  "aipt/p0-b001/safety-profile.json": "dea0b7a62ba8ac81cb9314546afebca400642d9923f9ae928d97c9a40a29304f",
};

const ACCEPTED_B002_DIGESTS = {
  "aipt/p0-b002/rule-id-map.json": "321550a1bb91066c263e5857c8095878d708af3f296430bc00011d70f5bb242c",
  "aipt/p0-b002/machine-rules.json": "139d095fe54926e1599edf208b65f7a89061f1cda6d8b492f83b5e47c0693c78",
  "aipt/p0-b002/semantic-graph.json": "8c9ad9ade247ac6195019b7225725c70cd26b55270979d31c7b3701d02092562",
};

const RULE_SOURCE_PATHS = [
  "campaign/rules/vertical-slice-v0.md",
  "campaign/rules/mechanics-fine-v1.md",
  "campaign/rules/logic-map-v1.md",
];

// ---------------------------------------------------------------------------
// 1. Frozen hashes (manifest, B001 historical artifacts, B002 artifacts,
//    unmodified source Markdown) — fail closed against accepted digests.
// ---------------------------------------------------------------------------

function checkFileDigest(rel, accepted, opts = {}) {
  const readBytes = opts.readBytes || ((p) => readFileSync(path.join(ROOT, p)));
  const actual = sha256(readBytes(rel));
  if (actual !== accepted) {
    throw new Error(`frozen digest mismatch for ${rel}: file bytes hash to ${actual}, accepted is ${accepted}`);
  }
}

function checkFrozenHashes() {
  checkFileDigest("aipt/input-manifest.json", ACCEPTED_MANIFEST_SHA256);
  for (const [p, accepted] of Object.entries(ACCEPTED_SOURCE_DIGESTS)) {
    checkFileDigest(p, accepted);
  }
  for (const [p, accepted] of Object.entries(ACCEPTED_B002_DIGESTS)) {
    checkFileDigest(p, accepted);
  }
  pass("frozen hashes: input-manifest, all 14 B001 sources, 3 B001 registry artifacts, and all 3 B002 artifacts match accepted SHA-256 digests (anti-co-drift anchor)");
}

// ---------------------------------------------------------------------------
// 2. Input-manifest accepted semantics (B001 game-owned input manifest)
// ---------------------------------------------------------------------------

const MANIFEST_REL = "aipt/input-manifest.json";

const MANIFEST_TOP_KEYS = [
  "aipt_schema",
  "manifest_format_version",
  "manifest_id",
  "batch_id",
  "manifest_kind",
  "authority_scope",
  "game",
  "content_license",
  "aipt_compatibility",
  "source_binding",
  "source_path_policy",
  "source_files",
  "registry_refs",
  "scope",
];
const GAME_KEYS = ["repo", "package_id", "formal_name_zh", "formal_name_en", "formal_display_name", "readiness", "identity_source", "note"];
const CONTENT_LICENSE_KEYS = ["ref", "status", "final_legal_text_published", "legal_review_required", "policy_summary_source", "note"];
const AIPT_COMPATIBILITY_KEYS = [
  "repo",
  "protocol_commit",
  "protocol_tree",
  "schema_path",
  "protocol_schema_sha256",
  "protocol_version",
  "schema_version",
  "jsonrpc",
];
const SOURCE_BINDING_KEYS = ["model", "authority", "statement", "note"];
const SOURCE_PATH_POLICY_KEYS = [
  "path_form",
  "absolute_paths",
  "backslashes",
  "empty_segments",
  "dot_segments",
  "dotdot_segments",
  "nul_bytes",
  "symlink_escape",
  "non_regular_files",
  "directories",
  "devices",
  "applies_to",
  "note",
];
const SOURCE_ENTRY_KEYS = ["path", "role", "lifecycle", "lifecycle_note", "sha256"];
const SCOPE_KEYS = ["first_roster", "task0", "stable_id_coverage", "rules_inputs"];
const FIRST_ROSTER_KEYS = ["character_ids", "note"];
const TASK0_KEYS = ["id", "scope", "scene_ids", "source"];
const STABLE_ID_COVERAGE_KEYS = ["registry_source", "visibility_source", "assigned_ids", "justified_zero_kinds", "reserved_zero_kinds", "synthetic_entities_added", "note"];
const RULES_INPUTS_KEYS = [
  "statement",
  "machine_rule_object",
  "semantic_graph",
  "adapter_or_runtime",
  "mutant_definition",
  "rule_invariant_mutation_assignment",
  "next_batch_work_included",
];

const EXPECTED_MANIFEST_CORE = {
  aipt_schema: "aipt.input-manifest.v1",
  manifest_format_version: "1.0.0",
  manifest_id: "UNREGISTERED-AIPT-P0-B001-INPUT-MANIFEST-V1",
  batch_id: B001_BATCH,
  manifest_kind: "game-owned input manifest",
  authority_scope: "zyc14588/UNREGISTERED only; game-owned metadata, not cross-game generic AIPT authority",
};

const EXPECTED_GAME_CORE = {
  repo: "zyc14588/UNREGISTERED",
  package_id: "zyc14588/agent-sim",
  formal_name_zh: "《未登记》",
  formal_name_en: "UNREGISTERED",
  formal_display_name: "《未登记》UNREGISTERED",
  readiness: "PLAYTESTABLE_DRAFT",
  identity_source: "aipt/p0-b000/identity.json",
};

const EXPECTED_CONTENT_LICENSE_CORE = {
  ref: "LicenseRef-UNREGISTERED-NC-SA-1.0",
  status: "POLICY_FROZEN_TEXT_NOT_DRAFTED",
  final_legal_text_published: false,
  legal_review_required: true,
  policy_summary_source: "LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md",
};

const EXPECTED_AIPT_COMPATIBILITY = {
  repo: "zyc14588/AIPT",
  protocol_commit: "fccfb595c23feab38397506505a3e996fe7b9e9c",
  protocol_tree: "f99570bc3c4307244ca926cec62e82a07ef5aee8",
  schema_path: "schemas/protocol/v1/aipt-protocol.schema.json",
  protocol_schema_sha256: "59467ffb27622b7858bd590b2b711a7affc9b5b0cb13e358504bd44eabe09dcf",
  protocol_version: "1.0.0",
  schema_version: "1.0.0",
  jsonrpc: "2.0",
};

const EXPECTED_SOURCE_FILES = [
  "aipt/p0-b000/identity.json",
  "aipt/p0-b000/licensing.json",
  "aipt/p0-b000/premades-v2.json",
  "campaign/proposals/tasks-v1.md",
  "campaign/playtest/stage3-run-guide-v1.md",
  "campaign/playtest/task0-handouts-v1.md",
  "campaign/playtest/task0-intel-pack-v1.md",
  "campaign/playtest/gm-screen-v1.md",
  "campaign/playtest/rule-knowledge-sheet-v1.md",
  "campaign/session0-redlines.md",
  "campaign/rules/vertical-slice-v0.md",
  "campaign/rules/mechanics-fine-v1.md",
  "campaign/rules/logic-map-v1.md",
  "LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md",
];

const EXPECTED_REGISTRY_REFS = [
  "aipt/p0-b001/stable-ids.json",
  "aipt/p0-b001/visibility.json",
  "aipt/p0-b001/safety-profile.json",
];

const EXPECTED_LIFECYCLES = {
  "aipt/p0-b000/identity.json": "MERGED_CLOSED",
  "aipt/p0-b000/licensing.json": "POLICY_FROZEN_TEXT_NOT_DRAFTED",
  "aipt/p0-b000/premades-v2.json": "PLAYTESTABLE_DRAFT",
  "campaign/proposals/tasks-v1.md": "PROPOSAL",
  "campaign/playtest/stage3-run-guide-v1.md": "PROPOSAL",
  "campaign/playtest/task0-handouts-v1.md": "PROPOSAL",
  "campaign/playtest/task0-intel-pack-v1.md": "PROPOSAL",
  "campaign/playtest/gm-screen-v1.md": "PROPOSAL",
  "campaign/playtest/rule-knowledge-sheet-v1.md": "PROPOSAL",
  "campaign/session0-redlines.md": "PROPOSAL",
  "campaign/rules/vertical-slice-v0.md": "PROPOSAL",
  "campaign/rules/mechanics-fine-v1.md": "PROPOSAL",
  "campaign/rules/logic-map-v1.md": "PROPOSAL",
  "LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md": "POLICY_FROZEN_TEXT_NOT_DRAFTED",
  "aipt/p0-b001/stable-ids.json": "PROPOSAL",
  "aipt/p0-b001/visibility.json": "PROPOSAL",
  "aipt/p0-b001/safety-profile.json": "PROPOSAL",
};

const EXPECTED_FIRST_ROSTER_IDS = ["UNR-CHAR-0001", "UNR-CHAR-0002", "UNR-CHAR-0003", "UNR-CHAR-0004"];
const EXPECTED_SCENE_IDS = [
  "UNR-SCENE-T000-01",
  "UNR-SCENE-T000-02",
  "UNR-SCENE-T000-03",
  "UNR-SCENE-T000-04",
  "UNR-SCENE-T000-05",
  "UNR-SCENE-T000-06",
  "UNR-SCENE-T000-07",
  "UNR-SCENE-T000-08",
];

function checkSourceEntryShape(e, label) {
  assertExactKeys(e, SOURCE_ENTRY_KEYS, label);
  if (typeof e.path !== "string" || e.path.length === 0) throw new Error(`${label}.path must be a non-empty string`);
  if (typeof e.role !== "string" || e.role.length === 0) throw new Error(`${label}.role must be a non-empty string`);
  if (typeof e.lifecycle !== "string" || e.lifecycle.length === 0) throw new Error(`${label}.lifecycle must be a non-empty string`);
  if (e.lifecycle === "CANON") throw new Error(`${label}: CANON promotion is rejected`);
  if (typeof e.lifecycle_note !== "string" || e.lifecycle_note.length === 0) throw new Error(`${label}.lifecycle_note must be a non-empty string`);
  if (typeof e.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(e.sha256)) throw new Error(`${label}.sha256 must be a 64-hex string`);
}

function checkSourceDigests(entries, opts = {}) {
  const readBytes = opts.readBytes || ((p) => readFileSync(path.join(ROOT, p)));
  for (const e of entries) {
    const actual = sha256(readBytes(e.path));
    if (actual !== e.sha256) throw new Error(`digest mismatch for ${e.path}: file bytes hash to ${actual}, manifest declares ${e.sha256}`);
    const accepted = ACCEPTED_SOURCE_DIGESTS[e.path];
    if (accepted === undefined) throw new Error(`no accepted digest pinned for ${e.path}`);
    if (e.sha256 !== accepted) {
      throw new Error(`digest drift for ${e.path}: manifest declares ${e.sha256} but accepted digest is ${accepted} — source file and manifest cannot drift together`);
    }
  }
}

function checkPathPolicy(entries, opts = {}) {
  const lstatFn = opts.lstat || ((p) => lstatSync(p));
  const realFn = opts.real || ((p) => realpathSync(p));
  const rootReal = realFn(ROOT);
  for (const e of entries) {
    const p = e.path;
    if (typeof p !== "string" || p.length === 0) throw new Error(`referenced path must be a non-empty string, got ${JSON.stringify(p)}`);
    if (p.includes("\u0000")) throw new Error(`path ${p} contains a NUL byte`);
    if (p.includes("\\")) throw new Error(`path ${p} contains a backslash (relative POSIX only)`);
    if (p.startsWith("/")) throw new Error(`path ${p} is absolute (relative POSIX only)`);
    if (/^[A-Za-z]:/.test(p)) throw new Error(`path ${p} looks like a Windows absolute path`);
    for (const seg of p.split("/")) {
      if (seg.length === 0) throw new Error(`path ${p} has an empty segment`);
      if (seg === ".") throw new Error(`path ${p} has a dot segment`);
      if (seg === "..") throw new Error(`path ${p} has a dot-dot (traversal) segment`);
    }
    const abs = path.join(ROOT, p);
    let st;
    try {
      st = lstatFn(abs);
    } catch (err) {
      throw new Error(`cannot stat referenced path ${p}: ${err.message}`);
    }
    if (st.isSymbolicLink()) throw new Error(`path ${p} is a symlink (regular files only)`);
    if (!st.isFile()) throw new Error(`path ${p} is not a regular file`);
    const rp = realFn(abs);
    if (rp !== rootReal && !rp.startsWith(rootReal + path.sep)) {
      throw new Error(`path ${p} resolves outside the repository (realpath escape: ${rp})`);
    }
  }
}

function checkManifestObj(m, opts = {}) {
  if (!m || typeof m !== "object") throw new Error("manifest missing");
  assertExactKeys(m, MANIFEST_TOP_KEYS, "manifest (top level)");
  for (const [k, v] of Object.entries(EXPECTED_MANIFEST_CORE)) {
    if (m[k] !== v) throw new Error(`manifest.${k} must be exactly ${JSON.stringify(v)}, got ${JSON.stringify(m[k])}`);
  }
  assertExactKeys(m.game, GAME_KEYS, "manifest.game");
  for (const [k, v] of Object.entries(EXPECTED_GAME_CORE)) {
    if (m.game[k] !== v) throw new Error(`manifest.game.${k} must be exactly ${JSON.stringify(v)}, got ${JSON.stringify(m.game[k])}`);
  }
  if (typeof m.game.note !== "string" || !m.game.note.includes("PLAYTESTABLE_DRAFT")) {
    throw new Error("manifest.game.note must be a non-empty string retaining PLAYTESTABLE_DRAFT");
  }
  const identity = loadJson("aipt/p0-b000/identity.json");
  if (identity.formal_display_name !== m.game.formal_display_name || identity.formal_name_zh !== m.game.formal_name_zh) {
    throw new Error("manifest.game identity fields must match aipt/p0-b000/identity.json");
  }
  assertExactKeys(m.content_license, CONTENT_LICENSE_KEYS, "manifest.content_license");
  for (const [k, v] of Object.entries(EXPECTED_CONTENT_LICENSE_CORE)) {
    if (m.content_license[k] !== v) throw new Error(`manifest.content_license.${k} must be exactly ${JSON.stringify(v)}, got ${JSON.stringify(m.content_license[k])}`);
  }
  if (typeof m.content_license.note !== "string" || !m.content_license.note.includes("POLICY_FROZEN_TEXT_NOT_DRAFTED")) {
    throw new Error("manifest.content_license.note must retain POLICY_FROZEN_TEXT_NOT_DRAFTED");
  }
  assertExactKeys(m.aipt_compatibility, AIPT_COMPATIBILITY_KEYS, "manifest.aipt_compatibility");
  assertExact(m.aipt_compatibility, EXPECTED_AIPT_COMPATIBILITY, "manifest.aipt_compatibility");

  const sb = m.source_binding;
  assertExactKeys(sb, SOURCE_BINDING_KEYS, "manifest.source_binding");
  if (sb.model !== "EXTERNAL_AIPT_RUN_MANIFEST_COMMIT_PAIR") throw new Error(`manifest.source_binding.model must be exactly EXTERNAL_AIPT_RUN_MANIFEST_COMMIT_PAIR, got ${JSON.stringify(sb.model)}`);
  if (!/AIPT Run Manifest/i.test(sb.authority || "") || !/AIPT Run Manifest/i.test(sb.statement || "")) {
    throw new Error("manifest.source_binding must defer commit pinning to the future AIPT Run Manifest (external authority)");
  }

  const spp = m.source_path_policy;
  assertExactKeys(spp, SOURCE_PATH_POLICY_KEYS, "manifest.source_path_policy");
  if (spp.path_form !== "RELATIVE_POSIX_ONLY") throw new Error("manifest.source_path_policy.path_form must be RELATIVE_POSIX_ONLY");
  for (const k of ["absolute_paths", "backslashes", "empty_segments", "dot_segments", "dotdot_segments", "nul_bytes", "symlink_escape", "non_regular_files", "directories", "devices"]) {
    if (spp[k] !== false) throw new Error(`manifest.source_path_policy.${k} must be false`);
  }
  assertExact(spp.applies_to, ["source_files", "registry_refs"], "manifest.source_path_policy.applies_to");

  const sf = m.source_files;
  if (!Array.isArray(sf) || sf.length !== 14) throw new Error(`manifest.source_files must have exactly 14 entries, got ${sf ? sf.length : "missing"}`);
  if (JSON.stringify(sf.map((e) => e.path)) !== JSON.stringify(EXPECTED_SOURCE_FILES)) {
    throw new Error("manifest.source_files paths must be exactly the 14 accepted source paths");
  }
  for (const e of sf) {
    checkSourceEntryShape(e, `manifest.source_files entry ${e.path}`);
    const wantLife = EXPECTED_LIFECYCLES[e.path];
    if (e.lifecycle !== wantLife) throw new Error(`manifest.source_files[${e.path}].lifecycle must be exactly ${wantLife}, got ${e.lifecycle}`);
  }

  const rr = m.registry_refs;
  if (!Array.isArray(rr) || rr.length !== 3) throw new Error(`manifest.registry_refs must have exactly 3 entries, got ${rr ? rr.length : "missing"}`);
  if (JSON.stringify(rr.map((e) => e.path)) !== JSON.stringify(EXPECTED_REGISTRY_REFS)) {
    throw new Error("manifest.registry_refs paths must be exactly the 3 accepted B001 registry refs");
  }
  for (const e of rr) {
    checkSourceEntryShape(e, `manifest.registry_refs entry ${e.path}`);
    const wantLife = EXPECTED_LIFECYCLES[e.path];
    if (e.lifecycle !== wantLife) throw new Error(`manifest.registry_refs[${e.path}].lifecycle must be exactly ${wantLife}, got ${e.lifecycle}`);
  }

  checkSourceDigests([...sf, ...rr], opts);
  checkPathPolicy([...sf, ...rr], opts);

  const scope = m.scope;
  assertExactKeys(scope, SCOPE_KEYS, "manifest.scope");
  const firstRoster = scope.first_roster;
  assertExactKeys(firstRoster, FIRST_ROSTER_KEYS, "manifest.scope.first_roster");
  assertExact(firstRoster.character_ids, EXPECTED_FIRST_ROSTER_IDS, "manifest.scope.first_roster.character_ids");
  const task0 = scope.task0;
  assertExactKeys(task0, TASK0_KEYS, "manifest.scope.task0");
  if (task0.id !== "T-000") throw new Error("manifest.scope.task0.id must be exactly T-000");
  assertExact(task0.scene_ids, EXPECTED_SCENE_IDS, "manifest.scope.task0.scene_ids");
  if (task0.source !== "campaign/playtest/stage3-run-guide-v1.md") throw new Error("manifest.scope.task0.source must be campaign/playtest/stage3-run-guide-v1.md");

  const coverage = scope.stable_id_coverage;
  assertExactKeys(coverage, STABLE_ID_COVERAGE_KEYS, "manifest.scope.stable_id_coverage");
  if (coverage.registry_source !== "aipt/p0-b001/stable-ids.json" || coverage.visibility_source !== "aipt/p0-b001/visibility.json") {
    throw new Error("manifest.scope.stable_id_coverage registry/visibility source drift");
  }
  assertExact(coverage.justified_zero_kinds, ["STATE", "ENDING"], "manifest.scope.stable_id_coverage.justified_zero_kinds");
  assertExact(coverage.reserved_zero_kinds, ["RULE", "INVARIANT", "MUTATION"], "manifest.scope.stable_id_coverage.reserved_zero_kinds");
  if (coverage.synthetic_entities_added !== false) throw new Error("manifest.scope.stable_id_coverage.synthetic_entities_added must be false");

  const ri = scope.rules_inputs;
  assertExactKeys(ri, RULES_INPUTS_KEYS, "manifest.scope.rules_inputs");
  for (const k of ["machine_rule_object", "semantic_graph", "adapter_or_runtime", "mutant_definition", "rule_invariant_mutation_assignment", "next_batch_work_included"]) {
    if (ri[k] !== false) throw new Error(`manifest.scope.rules_inputs.${k} must be false (no machine Rule object / semantic graph / adapter / runtime / mutant / next-batch work)`);
  }
  if (typeof ri.statement !== "string" || !/no machine Rule object/i.test(ri.statement) || !/no semantic graph/i.test(ri.statement)) {
    throw new Error("manifest.scope.rules_inputs.statement must declare no machine Rule object / semantic graph");
  }
  // No manifest field may reference the participant-data classification token
  // as packaged content.
  if ([...jsonStrings(m)].some((s) => s.includes(HPD))) {
    throw new Error(`manifest must not reference the ${HPD} classification token as content`);
  }
}

function checkManifest() {
  checkManifestObj(loadJson(MANIFEST_REL));
  pass("manifest: accepted B001 game-owned input semantics — exact key sets, identity/license/AIPT compatibility pins, exact 14-source + 3-registry paths/lifecycles/digests, RELATIVE_POSIX_ONLY path policy, zero reserved RULE/INVARIANT/MUTATION, no machine rules/graph/adapter/runtime/mutant/next-batch work");
}

// ---------------------------------------------------------------------------
// 3. B001 historical semantics — frozen hashes and reserved-zero history
// ---------------------------------------------------------------------------

function checkB001HistoricalObj(stableIds, visibility, safety) {
  if (!stableIds || !visibility || !safety) throw new Error("B001 historical artifacts missing");
  if (stableIds.aipt_schema !== "aipt.stable-ids.v1" || stableIds.batch_id !== B001_BATCH) {
    throw new Error("stable-ids must remain aipt.stable-ids.v1 / UNREGISTERED-AIPT-P0-B001");
  }
  if (visibility.aipt_schema !== "aipt.visibility.v1" || visibility.batch_id !== B001_BATCH) {
    throw new Error("visibility must remain aipt.visibility.v1 / UNREGISTERED-AIPT-P0-B001");
  }
  if (safety.aipt_schema !== "aipt.safety-profile.v1" || safety.batch_id !== B001_BATCH) {
    throw new Error("safety-profile must remain aipt.safety-profile.v1 / UNREGISTERED-AIPT-P0-B001");
  }
  if (visibility.lifecycle && visibility.lifecycle.status !== "PROPOSAL") throw new Error("visibility.lifecycle.status must stay PROPOSAL");
  if (safety.lifecycle && safety.lifecycle.status !== "PROPOSAL") throw new Error("safety.lifecycle.status must stay PROPOSAL");

  const namespaces = stableIds.namespaces;
  if (!namespaces || typeof namespaces !== "object") throw new Error("stable-ids.namespaces missing");
  for (const ns of ["UNR-RULE", "UNR-INVARIANT", "UNR-MUTATION"]) {
    const n = namespaces[ns];
    if (!n || n.entity_kind !== (ns === "UNR-RULE" ? "RULE" : ns === "UNR-INVARIANT" ? "INVARIANT" : "MUTATION")) {
      throw new Error(`stable-ids.namespaces.${ns} entity_kind/state drift`);
    }
    if (n.state !== "RESERVED" || n.assigned_count !== 0 || n.reserved_count !== 0) {
      throw new Error(`stable-ids.namespaces.${ns} must remain RESERVED with assigned_count 0 and reserved_count 0 (P0-B001 historical reserved-zero authority)`);
    }
  }
  const entities = Array.isArray(stableIds.entities) ? stableIds.entities : [];
  for (const e of entities) {
    if (e.kind === "RULE" || e.kind === "INVARIANT" || e.kind === "MUTATION") {
      throw new Error(`stable-ids.entities must not contain any ${e.kind} entity (RULE/INVARIANT/MUTATION remain reserved-zero in B001)`);
    }
  }
  const retired = Array.isArray(stableIds.retired) ? stableIds.retired : [];
  for (const e of retired) {
    if (e.kind === "RULE" || e.kind === "INVARIANT" || e.kind === "MUTATION") {
      throw new Error(`stable-ids.retired must not contain any ${e.kind} entity`);
    }
  }
  if (!stableIds.validation || !stableIds.validation.zero_assignment || typeof stableIds.validation.zero_assignment.rule !== "string") {
    throw new Error("stable-ids.validation.zero_assignment required");
  }
  if (!/JUSTIFIED_ZERO/i.test(stableIds.validation.zero_assignment.rule)) {
    throw new Error("stable-ids.validation.zero_assignment rule drifted");
  }
}

function checkB001Historical() {
  const stableIds = loadJson("aipt/p0-b001/stable-ids.json");
  const visibility = loadJson("aipt/p0-b001/visibility.json");
  const safety = loadJson("aipt/p0-b001/safety-profile.json");
  checkB001HistoricalObj(stableIds, visibility, safety);
  pass("B001 historical: stable-ids / visibility / safety-profile frozen hashes and exact accepted shapes; RULE/INVARIANT/MUTATION remain RESERVED zero-history in B001");
}

// ---------------------------------------------------------------------------
// 4. rule-id-map exact semantics
// ---------------------------------------------------------------------------

const RULE_ID_MAP_TOP_KEYS = [
  "aipt_schema",
  "batch_id",
  "authority_scope",
  "lifecycle",
  "source_manifest",
  "allocation_policy",
  "historical_namespace_reservation",
  "namespaces",
  "interpretation_notes",
  "allocations",
];
const ALLOCATION_KEYS = [
  "id",
  "kind",
  "slug",
  "label",
  "lifecycle_status",
  "canonical",
  "status",
  "allocation_order_key",
  "primary_source",
  "supporting_sources",
  "superseded_source_refs",
];
const SOURCE_REF_KEYS = ["path", "locator", "locator_type", "source_sha256", "lifecycle_status"];

const EXPECTED_RULE_ID_MAP = {
  aipt_schema: "aipt.rule-id-map.v1",
  batch_id: BATCH,
  authority_scope: "zyc14588/UNREGISTERED first-roster and Task-0 proposal rules only",
  lifecycle: {
    lifecycle_status: "PROPOSAL",
    canonical: false,
    promotes_source_lifecycle: false,
  },
  source_manifest: {
    path: "aipt/input-manifest.json",
    sha256: ACCEPTED_MANIFEST_SHA256,
    source_order: [
      {
        manifest_order: 11,
        path: "campaign/rules/vertical-slice-v0.md",
        sha256: ACCEPTED_SOURCE_DIGESTS["campaign/rules/vertical-slice-v0.md"],
        lifecycle_status: "PROPOSAL",
      },
      {
        manifest_order: 12,
        path: "campaign/rules/mechanics-fine-v1.md",
        sha256: ACCEPTED_SOURCE_DIGESTS["campaign/rules/mechanics-fine-v1.md"],
        lifecycle_status: "PROPOSAL",
      },
      {
        manifest_order: 13,
        path: "campaign/rules/logic-map-v1.md",
        sha256: ACCEPTED_SOURCE_DIGESTS["campaign/rules/logic-map-v1.md"],
        lifecycle_status: "PROPOSAL",
      },
    ],
  },
  allocation_policy: {
    identity_unit: "ONE_LOGICAL_RULE_NOT_EVERY_PROSE_MENTION",
    ordering: [
      "primary_source_manifest_order",
      "primary_source_document_order",
      "kind",
    ],
    primary_source_precedence: [
      "campaign/rules/mechanics-fine-v1.md when it explicitly refines or supersedes vertical-slice-v0.md",
      "campaign/rules/vertical-slice-v0.md for remaining baseline runtime rules",
      "campaign/rules/logic-map-v1.md for convergence invariants only",
    ],
    mutation_allocation_allowed: false,
    excluded_scope: [
      "future tasks and finale",
      "mechanics-fine-v1 C2 custom-character construction",
      "mechanics-fine-v1 D5 Task-1 hard-deadline parameters",
      "enemy samples",
      "adapters and runtime code",
      "mutants and mutation definitions",
      "player decisions, dialogue, feelings, or growth conclusions",
    ],
  },
  historical_namespace_reservation: {
    path: "aipt/p0-b001/stable-ids.json",
    sha256: ACCEPTED_SOURCE_DIGESTS["aipt/p0-b001/stable-ids.json"],
    aipt_schema: "aipt.stable-ids.v1",
    batch_id: B001_BATCH,
    unchanged_by_this_batch: true,
    namespaces: {
      "UNR-RULE": { state: "RESERVED", assigned_count: 0, reserved_count: 0 },
      "UNR-INVARIANT": { state: "RESERVED", assigned_count: 0, reserved_count: 0 },
      "UNR-MUTATION": { state: "RESERVED", assigned_count: 0, reserved_count: 0 },
    },
    statement: "P0-B001 remains historical reserved-zero authority and is not rewritten; all assignments below are newly authorized only by P0-B002.",
  },
  namespaces: {
    "UNR-RULE": {
      entity_kind: "RULE",
      state: "ASSIGNED_PROPOSAL",
      assigned_count: 40,
      first_id: "UNR-RULE-0001",
      last_id: "UNR-RULE-0040",
    },
    "UNR-INVARIANT": {
      entity_kind: "INVARIANT",
      state: "ASSIGNED_PROPOSAL",
      assigned_count: 10,
      first_id: "UNR-INVARIANT-0001",
      last_id: "UNR-INVARIANT-0010",
    },
    "UNR-MUTATION": {
      entity_kind: "MUTATION",
      state: "RESERVED",
      assigned_count: 0,
      first_id: null,
      last_id: null,
    },
  },
  interpretation_notes: [
    "A supporting or superseded source reference never creates a second identity.",
    "The logic-map growth row retains a legacy skill cap of 70, while mechanics-fine-v1 C1 is the effective parameter authority at cap 65; UNR-INVARIANT-0010 binds the convergence concept, not the legacy number.",
  ],
};

// Compact accepted allocations: [id, kind, slug, label, manifest_order,
// document_order, source path, locator, locator_type, supporting_sources,
// superseded_source_refs]. lifecycle_status is always PROPOSAL, canonical is
// always false, status is always ACTIVE_PROPOSAL, and the primary source hash
// is pinned by the source path + accepted digest.
const ACCEPTED_ALLOCATIONS = [
  ["UNR-RULE-0001", "RULE", "check-trigger", "判定触发条件", 11, 14, "campaign/rules/vertical-slice-v0.md", "### 1.1 触发", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0002", "RULE", "ability-input-and-untrained-value", "能力输入与缺训判定值", 11, 18, "campaign/rules/vertical-slice-v0.md", "### 1.2 输入（三层能力）", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0003", "RULE", "numeric-modifiers-and-state-penalties", "修正值上限与状态减值", 11, 48, "campaign/rules/vertical-slice-v0.md", "- 主要表达：修正值 −20/−10/0/+10/+20（上限 ±20，桌上 5–10 秒判定）", "EXACT_TEXT", [], []],
  ["UNR-RULE-0004", "RULE", "advantage-disadvantage-tens-die", "优势劣势十位骰", 11, 49, "campaign/rules/vertical-slice-v0.md", "- 优势/劣势：额外一颗十位骰，取低（优势）或取高（劣势），个位骰共用", "EXACT_TEXT", [], []],
  ["UNR-RULE-0005", "RULE", "d100-five-tier-resolution", "d100 五级结果与固定判定顺序", 11, 53, "campaign/rules/vertical-slice-v0.md", "### 1.4 五级结果（平台规范锁定）", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0006", "RULE", "catastrophe-warning-conditions", "灾难档预警条件", 11, 65, "campaign/rules/vertical-slice-v0.md", "**预警条件**（满足任一）：压力≥7 ｜ 污染≥1 ｜ 警报层级≥2 ｜ 被\"它\"注意。", "EXACT_TEXT", [], []],
  ["UNR-RULE-0007", "RULE", "opposed-checks", "对抗判定与同档裁决", 11, 67, "campaign/rules/vertical-slice-v0.md", "### 1.5 对抗", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0008", "RULE", "assistance", "队友协助", 11, 72, "campaign/rules/vertical-slice-v0.md", "### 1.6 协助", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0009", "RULE", "retry-and-push", "重试与加压", 11, 76, "campaign/rules/vertical-slice-v0.md", "### 1.7 重试与加压", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0010", "RULE", "information-checks", "信息型检定不锁核心线索", 11, 81, "campaign/rules/vertical-slice-v0.md", "### 1.8 信息型检定", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0011", "RULE", "trained-skill-list", "三十五项训练技能域", 11, 101, "campaign/rules/vertical-slice-v0.md", "### 2.2 训练技能（35 项，GM 已确认）", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0012", "RULE", "specialty-advantage", "专业特长优势", 11, 115, "campaign/rules/vertical-slice-v0.md", "### 2.3 专业特长", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0013", "RULE", "reversal-window", "致命伤三层逆转窗口", 11, 128, "campaign/rules/vertical-slice-v0.md", "## 4. 逆转窗口（三层，平台规范）", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0014", "RULE", "infiltration-loop", "潜入闭环总流程", 11, 145, "campaign/rules/vertical-slice-v0.md", "### 6.0 总流程（gm-procedure 八要素模板）", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0015", "RULE", "mission-hard-deadline", "任务内置硬时限", 11, 176, "campaign/rules/vertical-slice-v0.md", "### 6.3.3 硬时限", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0016", "RULE", "anomaly-compliance-pipeline", "异常规则违规处理管线", 11, 188, "campaign/rules/vertical-slice-v0.md", "## 7. 异常规则遵守（违规管线，平台规范）", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0017", "RULE", "area-conflict-loop", "区域制冲突八结构循环", 11, 194, "campaign/rules/vertical-slice-v0.md", "### 8.1 八结构清单（conflict-engine 模板）", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0018", "RULE", "shared-noncombat-conflict-language", "非战斗冲突共享结果语言", 11, 212, "campaign/rules/vertical-slice-v0.md", "### 8.3 非战斗冲突", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0019", "RULE", "stress-track", "压力轨与崩溃", 12, 9, "campaign/rules/mechanics-fine-v1.md", "### A1 压力（Scene–Session 尺度）", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"| 压力 | 0–10 | 目睹异常、高压行动、加压、恐怖暴露 | ≥7 触发预警条件 | 据点休整/安抚 1d3；任务外回 0 |","locator_type":"MARKDOWN_TABLE_ROW","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0020", "RULE", "fatigue-track", "疲劳轨", 12, 22, "campaign/rules/mechanics-fine-v1.md", "### A2 疲劳（Expedition 尺度）", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"| 疲劳 | 0–10 | 长时间行动、负重超载、熬夜、奔跑 | 每满 2 点疲劳，行动判定 −10 | 睡眠/休息每 4 小时 −1 |","locator_type":"MARKDOWN_TABLE_ROW","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0021", "RULE", "wound-track", "伤口轨与流血", 12, 34, "campaign/rules/mechanics-fine-v1.md", "### A3 伤口（Scene–Expedition 尺度）", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"| 伤口 | 部位：轻/重/致命 | 攻击、陷阱、事故 | 轻伤相关判定 −10；重伤 −20 且流血；致命进逆转窗口 | 急救临时缓解，短战役内不彻底恢复 |","locator_type":"MARKDOWN_TABLE_ROW","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0022", "RULE", "pollution-track", "污染轨与永久代价", 12, 45, "campaign/rules/mechanics-fine-v1.md", "### A4 污染（Campaign 尺度，永久——收敛主干）", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"| 污染 | 0–10 永久 | 违规暴露、目睹真相、代价逆转、实体接触 | 每点污染＝一条\"污染条\"（GM 给该角色角色规则知识掺入一条可能为假的信息，玩家不知道哪条假）；≥5 角色规则知识严重不可靠；10＝角色退场（不再是自己） | 不可逆；平台规范：极稀缺资源可在规则窗口内缓解，但留残留后果 |","locator_type":"MARKDOWN_TABLE_ROW","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0023", "RULE", "plan-points", "预案点", 12, 58, "campaign/rules/mechanics-fine-v1.md", "### A5 预案点（Expedition 尺度）", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"## 5. 预案资源","locator_type":"MARKDOWN_HEADING","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0024", "RULE", "bonds", "羁绊使用与修复", 12, 63, "campaign/rules/mechanics-fine-v1.md", "### A6 羁绊（Campaign 尺度）", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"## 4.5 羁绊（双向，机制收益）","locator_type":"MARKDOWN_HEADING","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0025", "RULE", "equipment-load", "装备负载与超载", 12, 71, "campaign/rules/mechanics-fine-v1.md", "### A7 装备负载（Expedition 尺度）", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"### 6.2 计划","locator_type":"MARKDOWN_HEADING","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0026", "RULE", "ledger-and-reward", "账本与任务报酬", 12, 78, "campaign/rules/mechanics-fine-v1.md", "### A8 账本与报酬（Campaign 尺度）", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"### 6.5 结算","locator_type":"MARKDOWN_HEADING","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0027", "RULE", "combat-turn-and-initiative", "战斗回合与先手", 12, 86, "campaign/rules/mechanics-fine-v1.md", "### B1 回合与先手", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"- **Order**：区域回合；先手＝敏捷+相关战斗技能的对抗，高者先（PROPOSAL）","locator_type":"EXACT_TEXT","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0028", "RULE", "combat-attack", "攻击判定与结果效果", 12, 90, "campaign/rules/mechanics-fine-v1.md", "### B2 攻击", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"- **Resolution**：d100 五级结果；攻击＝成功等级＋武器＋距离＋护具＋具体伤势","locator_type":"EXACT_TEXT","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0029", "RULE", "harm-and-armor", "武器伤档、护具与伤势映射", 12, 95, "campaign/rules/mechanics-fine-v1.md", "### B3 伤势与护具", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"- **Harm**：部位伤（轻/重/致命）＋压力","locator_type":"EXACT_TEXT","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0030", "RULE", "silent-takedown", "无声击倒", 12, 101, "campaign/rules/mechanics-fine-v1.md", "### B4 无声击倒", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"- **无声击倒**：无声击倒 vs 守卫警觉，成功＝无警报清除（无双潜入路线核心）","locator_type":"EXACT_TEXT","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0031", "RULE", "gunfire-cost", "交火的警报与增援代价", 12, 106, "campaign/rules/mechanics-fine-v1.md", "### B5 交火代价", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"- **交火代价**：每次开火警报层级 +1（消音器＝暴露事件而非立即升级，PROPOSAL）","locator_type":"EXACT_TEXT","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0032", "RULE", "chase", "追逐与脱追", 12, 110, "campaign/rules/mechanics-fine-v1.md", "### B6 追逐", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"### 8.3 非战斗冲突","locator_type":"MARKDOWN_HEADING","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0033", "RULE", "cognitive-growth", "认知成长与危险增强", 12, 116, "campaign/rules/mechanics-fine-v1.md", "### C1 成长（知识库配方1 解法A：认知成长替代数值成长）", "MARKDOWN_HEADING", [], []],
  ["UNR-RULE-0034", "RULE", "reconnaissance", "侦查渠道、耗时与结果", 12, 133, "campaign/rules/mechanics-fine-v1.md", "### D1 侦查", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"### 6.1 情报收集（侦查）","locator_type":"MARKDOWN_HEADING","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0035", "RULE", "intel-card-layers", "情报卡三层", 12, 137, "campaign/rules/mechanics-fine-v1.md", "### D2 情报卡三层", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"### 6.1 情报收集（侦查）","locator_type":"MARKDOWN_HEADING","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0036", "RULE", "patrol-clock", "区域巡逻时钟", 12, 141, "campaign/rules/mechanics-fine-v1.md", "### D3 巡逻时钟", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"### 6.3.1 巡逻时钟","locator_type":"MARKDOWN_HEADING","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0037", "RULE", "alarm-level", "警报层级与封锁", 12, 145, "campaign/rules/mechanics-fine-v1.md", "### D4 警报层级", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"### 6.3.2 警报层级（0–3）","locator_type":"MARKDOWN_HEADING","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0038", "RULE", "settlement", "结算文本五段", 12, 153, "campaign/rules/mechanics-fine-v1.md", "### D6 结算", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"### 6.5 结算","locator_type":"MARKDOWN_HEADING","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0039", "RULE", "safehouse-rest", "据点休整", 12, 157, "campaign/rules/mechanics-fine-v1.md", "### D7 据点休整", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"## 9. 据点休整（恢复循环草案）","locator_type":"MARKDOWN_HEADING","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-RULE-0040", "RULE", "time-and-movement", "流程时间、移动与撤离澄清", 12, 161, "campaign/rules/mechanics-fine-v1.md", "### D8 流程澄清与时间单位（2026-08-15 solo 复测校准，PROPOSAL）", "MARKDOWN_HEADING", [], [{"path":"campaign/rules/vertical-slice-v0.md","locator":"### 6.4 撤离","locator_type":"MARKDOWN_HEADING","source_sha256":"e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2","lifecycle_status":"PROPOSAL"}]],
  ["UNR-INVARIANT-0001", "INVARIANT", "judgement-convergence", "判定语言唯一收敛", 13, 12, "campaign/rules/logic-map-v1.md", "| 1 | 判定 | d100 下掷五档，判定顺序＝灾难优先→卓越→成功→带代价→失败推进（vertical §1.4） | 技能/素质/对抗/战斗/追逐/侦查/无声击倒 全部走此节点；无第二套判定 ✓ |", "MARKDOWN_TABLE_ROW", [], []],
  ["UNR-INVARIANT-0002", "INVARIANT", "time-convergence", "时间轴唯一收敛", 13, 13, "campaign/rules/logic-map-v1.md", "| 2 | 时间 | 任务时间轴，单位：1 班＝30 分钟 | 硬时限（D5）／巡逻班次（D3）／交接班窗口／反应窗口（管线）／侦查耗时（D1）／休整 共用同一轴与单位 ✓ |", "MARKDOWN_TABLE_ROW", [], []],
  ["UNR-INVARIANT-0003", "INVARIANT", "exposure-convergence", "暴露计数器唯一收敛", 13, 14, "campaign/rules/logic-map-v1.md", "| 3 | 暴露 | 任务内暴露计数器（0 起） | 带代价成功／失败推进／开火(消音)／侦查带代价／无声击倒带代价／违规管线\"暴露\"段 全部 +1；效果唯一：推进巡逻时钟＋累积警报 ✓ |", "MARKDOWN_TABLE_ROW", [], []],
  ["UNR-INVARIANT-0004", "INVARIANT", "short-term-cost-menu", "短期代价菜单闭合", 13, 15, "campaign/rules/logic-map-v1.md", "| 4 | 短期代价菜单 | {暴露+1, 时间+30min, 资源−1, 压力+1} | 带代价成功、侦查带代价、无声击倒等短期代价只从菜单选；**永久代价不在此列**（节点 5）✓ |", "MARKDOWN_TABLE_ROW", [], []],
  ["UNR-INVARIANT-0005", "INVARIANT", "permanent-cost-convergence", "永久代价只走污染轨", 13, 16, "campaign/rules/logic-map-v1.md", "| 5 | 永久代价 | 污染轨（0–10，污染条）——全战役永久代价唯一通道 | 违规严重度／逆转窗口②／实体接触／任务1 记名＝污染 1 格／任务2 记忆重写＝污染条(记忆型)／任务3 村民化＝污染条(身份型)／终局并入规则＝污染满格；失去记忆/身份/感官均表达为污染条 ✓ |", "MARKDOWN_TABLE_ROW", [], []],
  ["UNR-INVARIANT-0006", "INVARIANT", "alarm-convergence", "警报轨唯一收敛", 13, 17, "campaign/rules/logic-map-v1.md", "| 6 | 警报 | 警报层级 0–3（唯一轨） | 开火/暴露计数/尸体 触发；封锁＝撤离 −20 状态减值（vertical §6.3.2＝fine D4）✓ |", "MARKDOWN_TABLE_ROW", [], []],
  ["UNR-INVARIANT-0007", "INVARIANT", "warning-convergence", "预警条件唯一收敛", 13, 18, "campaign/rules/logic-map-v1.md", "| 7 | 预警 | 压力≥7 或 污染≥1 或 警报≥2 或 被注意 → 激活灾难档 | 五档表唯一引用；压力崩溃（A1）不重复定义 ✓ |", "MARKDOWN_TABLE_ROW", [], []],
  ["UNR-INVARIANT-0008", "INVARIANT", "information-convergence", "信息三层唯一收敛", 13, 19, "campaign/rules/logic-map-v1.md", "| 8 | 信息 | 情报卡三层（公开/半公开/暗层）↔ 平台规则三层模型第②③层 | 世界内文本永远是游戏数据；暗层仅经角色规则知识可达（D2）✓ |", "MARKDOWN_TABLE_ROW", [], []],
  ["UNR-INVARIANT-0009", "INVARIANT", "ledger-convergence", "账本实体唯一收敛", 13, 20, "campaign/rules/logic-map-v1.md", "| 9 | 账本 | 管理方账本（结算五段文本的实体） | 报酬/代价登记/无双成就/终局偷\"结算\"＝抹除账本条目（fine A8 ↔ tasks 终局 §5.2）✓ |", "MARKDOWN_TABLE_ROW", [], []],
  ["UNR-INVARIANT-0010", "INVARIANT", "growth-convergence", "认知成长唯一收敛", 13, 21, "campaign/rules/logic-map-v1.md", "| 10 | 成长 | 认知成长（技能 +1d3 上限70／异常学 +2 上限80／横向资源） | 无等级、无素质成长、污染不可移除（fine C1 ↔ 决策 #32）✓ |", "MARKDOWN_TABLE_ROW", [], []],
];

// Compact accepted concepts: [id, logic_index, label, definition,
// invariant_ref, source path, source locator, locator_type, source_sha256,
// parameter_authority_note|null]. lifecycle_status is always PROPOSAL and
// canonical is always false.
const ACCEPTED_CONCEPTS = [
  ["concept:judgement", 1, "判定", "All checks converge on the ordered d100 five-tier result language.", "UNR-INVARIANT-0001", "campaign/rules/logic-map-v1.md", "| 1 | 判定 | d100 下掷五档，判定顺序＝灾难优先→卓越→成功→带代价→失败推进（vertical §1.4） | 技能/素质/对抗/战斗/追逐/侦查/无声击倒 全部走此节点；无第二套判定 ✓ |", "MARKDOWN_TABLE_ROW", "7ba536f1d235981b32a8a8f27c7429d6b53ead6daa4c0f3e82e465584a89f1b4", null],
  ["concept:time", 2, "时间", "Mission time uses one timeline whose standard shift is thirty minutes.", "UNR-INVARIANT-0002", "campaign/rules/logic-map-v1.md", "| 2 | 时间 | 任务时间轴，单位：1 班＝30 分钟 | 硬时限（D5）／巡逻班次（D3）／交接班窗口／反应窗口（管线）／侦查耗时（D1）／休整 共用同一轴与单位 ✓ |", "MARKDOWN_TABLE_ROW", "7ba536f1d235981b32a8a8f27c7429d6b53ead6daa4c0f3e82e465584a89f1b4", null],
  ["concept:exposure", 3, "暴露", "One Task-scoped exposure counter advances patrol pressure and alarm accumulation.", "UNR-INVARIANT-0003", "campaign/rules/logic-map-v1.md", "| 3 | 暴露 | 任务内暴露计数器（0 起） | 带代价成功／失败推进／开火(消音)／侦查带代价／无声击倒带代价／违规管线\"暴露\"段 全部 +1；效果唯一：推进巡逻时钟＋累积警报 ✓ |", "MARKDOWN_TABLE_ROW", "7ba536f1d235981b32a8a8f27c7429d6b53ead6daa4c0f3e82e465584a89f1b4", null],
  ["concept:short-term-cost-menu", 4, "短期代价菜单", "Short-term costs are exposure, thirty minutes, one resource, or one stress.", "UNR-INVARIANT-0004", "campaign/rules/logic-map-v1.md", "| 4 | 短期代价菜单 | {暴露+1, 时间+30min, 资源−1, 压力+1} | 带代价成功、侦查带代价、无声击倒等短期代价只从菜单选；**永久代价不在此列**（节点 5）✓ |", "MARKDOWN_TABLE_ROW", "7ba536f1d235981b32a8a8f27c7429d6b53ead6daa4c0f3e82e465584a89f1b4", null],
  ["concept:permanent-cost", 5, "永久代价", "The pollution track is the only campaign-permanent cost channel.", "UNR-INVARIANT-0005", "campaign/rules/logic-map-v1.md", "| 5 | 永久代价 | 污染轨（0–10，污染条）——全战役永久代价唯一通道 | 违规严重度／逆转窗口②／实体接触／任务1 记名＝污染 1 格／任务2 记忆重写＝污染条(记忆型)／任务3 村民化＝污染条(身份型)／终局并入规则＝污染满格；失去记忆/身份/感官均表达为污染条 ✓ |", "MARKDOWN_TABLE_ROW", "7ba536f1d235981b32a8a8f27c7429d6b53ead6daa4c0f3e82e465584a89f1b4", null],
  ["concept:alarm", 6, "警报", "All alarm effects use the single zero-to-three alarm track.", "UNR-INVARIANT-0006", "campaign/rules/logic-map-v1.md", "| 6 | 警报 | 警报层级 0–3（唯一轨） | 开火/暴露计数/尸体 触发；封锁＝撤离 −20 状态减值（vertical §6.3.2＝fine D4）✓ |", "MARKDOWN_TABLE_ROW", "7ba536f1d235981b32a8a8f27c7429d6b53ead6daa4c0f3e82e465584a89f1b4", null],
  ["concept:warning", 7, "预警", "Any one warning condition activates the catastrophe tier.", "UNR-INVARIANT-0007", "campaign/rules/logic-map-v1.md", "| 7 | 预警 | 压力≥7 或 污染≥1 或 警报≥2 或 被注意 → 激活灾难档 | 五档表唯一引用；压力崩溃（A1）不重复定义 ✓ |", "MARKDOWN_TABLE_ROW", "7ba536f1d235981b32a8a8f27c7429d6b53ead6daa4c0f3e82e465584a89f1b4", null],
  ["concept:information", 8, "信息", "Information converges on public, semi-public, and hidden layers.", "UNR-INVARIANT-0008", "campaign/rules/logic-map-v1.md", "| 8 | 信息 | 情报卡三层（公开/半公开/暗层）↔ 平台规则三层模型第②③层 | 世界内文本永远是游戏数据；暗层仅经角色规则知识可达（D2）✓ |", "MARKDOWN_TABLE_ROW", "7ba536f1d235981b32a8a8f27c7429d6b53ead6daa4c0f3e82e465584a89f1b4", null],
  ["concept:ledger", 9, "账本", "Settlement, costs, rewards, and achievements converge on the management ledger.", "UNR-INVARIANT-0009", "campaign/rules/logic-map-v1.md", "| 9 | 账本 | 管理方账本（结算五段文本的实体） | 报酬/代价登记/无双成就/终局偷\"结算\"＝抹除账本条目（fine A8 ↔ tasks 终局 §5.2）✓ |", "MARKDOWN_TABLE_ROW", "7ba536f1d235981b32a8a8f27c7429d6b53ead6daa4c0f3e82e465584a89f1b4", null],
  ["concept:growth", 10, "成长", "Growth is primarily cognitive and horizontal; attributes do not grow and pollution is not removed.", "UNR-INVARIANT-0010", "campaign/rules/logic-map-v1.md", "| 10 | 成长 | 认知成长（技能 +1d3 上限70／异常学 +2 上限80／横向资源） | 无等级、无素质成长、污染不可移除（fine C1 ↔ 决策 #32）✓ |", "MARKDOWN_TABLE_ROW", "7ba536f1d235981b32a8a8f27c7429d6b53ead6daa4c0f3e82e465584a89f1b4", "mechanics-fine-v1 C1 controls the effective skill cap of 65; this node binds conceptual convergence only."],
];

// Compact accepted edges: [id, from, to, type, evidence_ref].
const ACCEPTED_EDGES = [
  ["edge:0001", "UNR-INVARIANT-0001", "concept:judgement", "CONVERGES_TO", "UNR-INVARIANT-0001"],
  ["edge:0002", "UNR-INVARIANT-0002", "concept:time", "CONVERGES_TO", "UNR-INVARIANT-0002"],
  ["edge:0003", "UNR-INVARIANT-0003", "concept:exposure", "CONVERGES_TO", "UNR-INVARIANT-0003"],
  ["edge:0004", "UNR-INVARIANT-0004", "concept:short-term-cost-menu", "CONVERGES_TO", "UNR-INVARIANT-0004"],
  ["edge:0005", "UNR-INVARIANT-0005", "concept:permanent-cost", "CONVERGES_TO", "UNR-INVARIANT-0005"],
  ["edge:0006", "UNR-INVARIANT-0006", "concept:alarm", "CONVERGES_TO", "UNR-INVARIANT-0006"],
  ["edge:0007", "UNR-INVARIANT-0007", "concept:warning", "CONVERGES_TO", "UNR-INVARIANT-0007"],
  ["edge:0008", "UNR-INVARIANT-0008", "concept:information", "CONVERGES_TO", "UNR-INVARIANT-0008"],
  ["edge:0009", "UNR-INVARIANT-0009", "concept:ledger", "CONVERGES_TO", "UNR-INVARIANT-0009"],
  ["edge:0010", "UNR-INVARIANT-0010", "concept:growth", "CONVERGES_TO", "UNR-INVARIANT-0010"],
  ["edge:0011", "UNR-RULE-0001", "concept:judgement", "IMPLEMENTS", "UNR-RULE-0001"],
  ["edge:0012", "UNR-RULE-0002", "concept:judgement", "IMPLEMENTS", "UNR-RULE-0002"],
  ["edge:0013", "UNR-RULE-0003", "concept:judgement", "CONSTRAINS", "UNR-RULE-0003"],
  ["edge:0014", "UNR-RULE-0004", "concept:judgement", "IMPLEMENTS", "UNR-RULE-0004"],
  ["edge:0015", "UNR-RULE-0005", "concept:judgement", "IMPLEMENTS", "UNR-RULE-0005"],
  ["edge:0016", "UNR-RULE-0005", "concept:short-term-cost-menu", "READS", "UNR-RULE-0005"],
  ["edge:0017", "UNR-RULE-0005", "concept:warning", "READS", "UNR-RULE-0005"],
  ["edge:0018", "UNR-RULE-0006", "concept:warning", "IMPLEMENTS", "UNR-RULE-0006"],
  ["edge:0019", "UNR-RULE-0007", "concept:judgement", "IMPLEMENTS", "UNR-RULE-0007"],
  ["edge:0020", "UNR-RULE-0008", "concept:judgement", "CONSTRAINS", "UNR-RULE-0008"],
  ["edge:0021", "UNR-RULE-0009", "concept:judgement", "IMPLEMENTS", "UNR-RULE-0009"],
  ["edge:0022", "UNR-RULE-0009", "concept:short-term-cost-menu", "READS", "UNR-RULE-0009"],
  ["edge:0023", "UNR-RULE-0010", "concept:information", "IMPLEMENTS", "UNR-RULE-0010"],
  ["edge:0024", "UNR-RULE-0010", "concept:judgement", "DEPENDS_ON", "UNR-RULE-0010"],
  ["edge:0025", "UNR-RULE-0011", "concept:judgement", "CONSTRAINS", "UNR-RULE-0011"],
  ["edge:0026", "UNR-RULE-0012", "concept:judgement", "CONSTRAINS", "UNR-RULE-0012"],
  ["edge:0027", "UNR-RULE-0013", "concept:permanent-cost", "IMPLEMENTS", "UNR-RULE-0013"],
  ["edge:0028", "UNR-RULE-0014", "concept:time", "DEPENDS_ON", "UNR-RULE-0014"],
  ["edge:0029", "UNR-RULE-0014", "concept:exposure", "DEPENDS_ON", "UNR-RULE-0014"],
  ["edge:0030", "UNR-RULE-0014", "concept:alarm", "DEPENDS_ON", "UNR-RULE-0014"],
  ["edge:0031", "UNR-RULE-0014", "concept:information", "DEPENDS_ON", "UNR-RULE-0014"],
  ["edge:0032", "UNR-RULE-0014", "concept:ledger", "DEPENDS_ON", "UNR-RULE-0014"],
  ["edge:0033", "UNR-RULE-0015", "concept:time", "IMPLEMENTS", "UNR-RULE-0015"],
  ["edge:0034", "UNR-RULE-0015", "concept:alarm", "WRITES", "UNR-RULE-0015"],
  ["edge:0035", "UNR-RULE-0016", "concept:exposure", "IMPLEMENTS", "UNR-RULE-0016"],
  ["edge:0036", "UNR-RULE-0016", "concept:permanent-cost", "WRITES", "UNR-RULE-0016"],
  ["edge:0037", "UNR-RULE-0016", "concept:warning", "WRITES", "UNR-RULE-0016"],
  ["edge:0038", "UNR-RULE-0017", "concept:judgement", "DEPENDS_ON", "UNR-RULE-0017"],
  ["edge:0039", "UNR-RULE-0017", "concept:time", "DEPENDS_ON", "UNR-RULE-0017"],
  ["edge:0040", "UNR-RULE-0017", "concept:exposure", "DEPENDS_ON", "UNR-RULE-0017"],
  ["edge:0041", "UNR-RULE-0017", "concept:alarm", "DEPENDS_ON", "UNR-RULE-0017"],
  ["edge:0042", "UNR-RULE-0018", "concept:judgement", "DEPENDS_ON", "UNR-RULE-0018"],
  ["edge:0043", "UNR-RULE-0018", "concept:time", "DEPENDS_ON", "UNR-RULE-0018"],
  ["edge:0044", "UNR-RULE-0019", "concept:warning", "WRITES", "UNR-RULE-0019"],
  ["edge:0045", "UNR-RULE-0019", "concept:short-term-cost-menu", "IMPLEMENTS", "UNR-RULE-0019"],
  ["edge:0046", "UNR-RULE-0020", "concept:time", "DEPENDS_ON", "UNR-RULE-0020"],
  ["edge:0047", "UNR-RULE-0020", "concept:judgement", "CONSTRAINS", "UNR-RULE-0020"],
  ["edge:0048", "UNR-RULE-0021", "concept:judgement", "CONSTRAINS", "UNR-RULE-0021"],
  ["edge:0049", "UNR-RULE-0021", "concept:permanent-cost", "CONSTRAINS", "UNR-RULE-0021"],
  ["edge:0050", "UNR-RULE-0022", "concept:permanent-cost", "IMPLEMENTS", "UNR-RULE-0022"],
  ["edge:0051", "UNR-RULE-0022", "concept:warning", "WRITES", "UNR-RULE-0022"],
  ["edge:0052", "UNR-RULE-0022", "concept:information", "WRITES", "UNR-RULE-0022"],
  ["edge:0053", "UNR-RULE-0023", "concept:short-term-cost-menu", "IMPLEMENTS", "UNR-RULE-0023"],
  ["edge:0054", "UNR-RULE-0024", "concept:permanent-cost", "CONSTRAINS", "UNR-RULE-0024"],
  ["edge:0055", "UNR-RULE-0024", "concept:short-term-cost-menu", "CONSTRAINS", "UNR-RULE-0024"],
  ["edge:0056", "UNR-RULE-0025", "concept:judgement", "CONSTRAINS", "UNR-RULE-0025"],
  ["edge:0057", "UNR-RULE-0025", "concept:time", "WRITES", "UNR-RULE-0025"],
  ["edge:0058", "UNR-RULE-0026", "concept:ledger", "IMPLEMENTS", "UNR-RULE-0026"],
  ["edge:0059", "UNR-RULE-0027", "concept:judgement", "IMPLEMENTS", "UNR-RULE-0027"],
  ["edge:0060", "UNR-RULE-0028", "concept:judgement", "IMPLEMENTS", "UNR-RULE-0028"],
  ["edge:0061", "UNR-RULE-0028", "concept:exposure", "WRITES", "UNR-RULE-0028"],
  ["edge:0062", "UNR-RULE-0028", "concept:alarm", "WRITES", "UNR-RULE-0028"],
  ["edge:0063", "UNR-RULE-0028", "concept:short-term-cost-menu", "READS", "UNR-RULE-0028"],
  ["edge:0064", "UNR-RULE-0029", "concept:judgement", "DEPENDS_ON", "UNR-RULE-0029"],
  ["edge:0065", "UNR-RULE-0029", "concept:permanent-cost", "CONSTRAINS", "UNR-RULE-0029"],
  ["edge:0066", "UNR-RULE-0030", "concept:judgement", "IMPLEMENTS", "UNR-RULE-0030"],
  ["edge:0067", "UNR-RULE-0030", "concept:exposure", "WRITES", "UNR-RULE-0030"],
  ["edge:0068", "UNR-RULE-0030", "concept:alarm", "WRITES", "UNR-RULE-0030"],
  ["edge:0069", "UNR-RULE-0031", "concept:exposure", "WRITES", "UNR-RULE-0031"],
  ["edge:0070", "UNR-RULE-0031", "concept:alarm", "WRITES", "UNR-RULE-0031"],
  ["edge:0071", "UNR-RULE-0031", "concept:time", "WRITES", "UNR-RULE-0031"],
  ["edge:0072", "UNR-RULE-0032", "concept:judgement", "IMPLEMENTS", "UNR-RULE-0032"],
  ["edge:0073", "UNR-RULE-0032", "concept:time", "READS", "UNR-RULE-0032"],
  ["edge:0074", "UNR-RULE-0032", "concept:exposure", "WRITES", "UNR-RULE-0032"],
  ["edge:0075", "UNR-RULE-0033", "concept:growth", "IMPLEMENTS", "UNR-RULE-0033"],
  ["edge:0076", "UNR-RULE-0033", "concept:permanent-cost", "CONSTRAINS", "UNR-RULE-0033"],
  ["edge:0077", "UNR-RULE-0033", "concept:information", "READS", "UNR-RULE-0033"],
  ["edge:0078", "UNR-RULE-0034", "concept:judgement", "IMPLEMENTS", "UNR-RULE-0034"],
  ["edge:0079", "UNR-RULE-0034", "concept:time", "WRITES", "UNR-RULE-0034"],
  ["edge:0080", "UNR-RULE-0034", "concept:exposure", "WRITES", "UNR-RULE-0034"],
  ["edge:0081", "UNR-RULE-0034", "concept:information", "WRITES", "UNR-RULE-0034"],
  ["edge:0082", "UNR-RULE-0035", "concept:information", "IMPLEMENTS", "UNR-RULE-0035"],
  ["edge:0083", "UNR-RULE-0036", "concept:time", "DEPENDS_ON", "UNR-RULE-0036"],
  ["edge:0084", "UNR-RULE-0036", "concept:exposure", "READS", "UNR-RULE-0036"],
  ["edge:0085", "UNR-RULE-0036", "concept:alarm", "WRITES", "UNR-RULE-0036"],
  ["edge:0086", "UNR-RULE-0037", "concept:exposure", "READS", "UNR-RULE-0037"],
  ["edge:0087", "UNR-RULE-0037", "concept:alarm", "IMPLEMENTS", "UNR-RULE-0037"],
  ["edge:0088", "UNR-RULE-0038", "concept:ledger", "IMPLEMENTS", "UNR-RULE-0038"],
  ["edge:0089", "UNR-RULE-0038", "concept:permanent-cost", "READS", "UNR-RULE-0038"],
  ["edge:0090", "UNR-RULE-0039", "concept:time", "READS", "UNR-RULE-0039"],
  ["edge:0091", "UNR-RULE-0039", "concept:growth", "WRITES", "UNR-RULE-0039"],
  ["edge:0092", "UNR-RULE-0039", "concept:ledger", "READS", "UNR-RULE-0039"],
  ["edge:0093", "UNR-RULE-0040", "concept:time", "IMPLEMENTS", "UNR-RULE-0040"],
  ["edge:0094", "UNR-RULE-0040", "concept:alarm", "READS", "UNR-RULE-0040"],
  ["edge:0095", "concept:short-term-cost-menu", "concept:permanent-cost", "CONSTRAINS", "UNR-INVARIANT-0004"],
  ["edge:0096", "concept:alarm", "concept:exposure", "DEPENDS_ON", "UNR-INVARIANT-0006"],
  ["edge:0097", "concept:warning", "concept:alarm", "DEPENDS_ON", "UNR-INVARIANT-0007"],
  ["edge:0098", "concept:warning", "concept:permanent-cost", "DEPENDS_ON", "UNR-INVARIANT-0007"],
  ["edge:0099", "concept:information", "concept:judgement", "DEPENDS_ON", "UNR-INVARIANT-0008"],
  ["edge:0100", "concept:information", "concept:time", "DEPENDS_ON", "UNR-INVARIANT-0008"],
  ["edge:0101", "concept:ledger", "concept:permanent-cost", "READS", "UNR-INVARIANT-0009"],
  ["edge:0102", "concept:growth", "concept:information", "DEPENDS_ON", "UNR-INVARIANT-0010"],
  ["edge:0103", "concept:growth", "concept:permanent-cost", "CONSTRAINS", "UNR-INVARIANT-0010"],
  ["edge:0104", "UNR-RULE-0032", "concept:short-term-cost-menu", "READS", "UNR-RULE-0032"],
  ["edge:0105", "UNR-RULE-0032", "concept:alarm", "WRITES", "UNR-RULE-0032"],
];

/** Type-aware exact-source-locator resolver for B002 rule/invariant source
 *  refs. MARKDOWN_HEADING, EXACT_TEXT and MARKDOWN_TABLE_ROW all require the
 *  locator to be an exact line of the referenced source file and that line
 *  must be unique (ambiguity fails closed). Returns the resolved line. */
function resolveSourceRefLocator(ref, opts = {}) {
  const readText = opts.readText || ((p) => readRel(p));
  const text = readText(ref.path);
  const lines = text.split(/\r?\n/);
  const type = ref.locator_type;
  if (!["MARKDOWN_HEADING", "EXACT_TEXT", "MARKDOWN_TABLE_ROW"].includes(type)) {
    throw new Error(`unsupported locator_type ${JSON.stringify(type)} for ${ref.path}`);
  }
  let hits = 0;
  for (const line of lines) {
    if (line === ref.locator) hits += 1;
  }
  if (hits !== 1) {
    throw new Error(`source ref locator must resolve to exactly one line in ${ref.path}; got ${hits} exact-line hits for ${JSON.stringify(ref.locator)} (${type})`);
  }
  return ref.locator;
}

function checkSourceRef(ref, opts = {}) {
  const readBytes = opts.readBytes || ((p) => readFileSync(path.join(ROOT, p)));
  assertExactKeys(ref, SOURCE_REF_KEYS, "source ref");
  if (!RULE_SOURCE_PATHS.includes(ref.path)) throw new Error(`source ref path ${ref.path} is not one of the three accepted rules sources`);
  if (ref.lifecycle_status !== "PROPOSAL") throw new Error(`source ref lifecycle_status must be PROPOSAL, got ${JSON.stringify(ref.lifecycle_status)}`);
  const actual = sha256(readBytes(ref.path));
  if (actual !== ref.source_sha256) {
    throw new Error(`source ref digest mismatch for ${ref.path}: file bytes hash to ${actual}, ref declares ${ref.source_sha256}`);
  }
  const accepted = ACCEPTED_SOURCE_DIGESTS[ref.path];
  if (accepted === undefined || ref.source_sha256 !== accepted) {
    throw new Error(`source ref digest drift for ${ref.path}: ref declares ${ref.source_sha256} but accepted digest is ${accepted}`);
  }
  if (typeof ref.locator !== "string" || ref.locator.length === 0) throw new Error("source ref locator must be a non-empty string");
  resolveSourceRefLocator(ref, opts);
}

function allocationToTuple(a) {
  const k = a.allocation_order_key;
  return [
    a.id,
    a.kind,
    a.slug,
    a.label,
    k.manifest_order,
    k.document_order,
    a.primary_source.path,
    a.primary_source.locator,
    a.primary_source.locator_type,
    a.supporting_sources,
    a.superseded_source_refs,
  ];
}

function checkAllocationObj(a, i, opts = {}) {
  assertExactKeys(a, ALLOCATION_KEYS, `allocations[${i}]`);
  assertExact(a.lifecycle_status, "PROPOSAL", `allocations[${i}].lifecycle_status`);
  assertExact(a.canonical, false, `allocations[${i}].canonical`);
  assertExact(a.status, "ACTIVE_PROPOSAL", `allocations[${i}].status`);
  if (a.kind !== "RULE" && a.kind !== "INVARIANT") {
    throw new Error(`allocations[${i}].kind must be RULE or INVARIANT (Mutation allocation is forbidden), got ${JSON.stringify(a.kind)}`);
  }
  if (a.kind === "MUTATION") throw new Error("Mutation allocation is forbidden");
  assertExactKeys(a.allocation_order_key, ["manifest_order", "document_order", "kind"], `allocations[${i}].allocation_order_key`);
  const accepted = ACCEPTED_ALLOCATIONS[i];
  if (!accepted) throw new Error(`allocations[${i}] has no accepted allocation at index ${i}`);
  assertExact(allocationToTuple(a), accepted, `allocations[${i}] exact tuple`);
  checkSourceRef(a.primary_source, opts);
  for (const ref of a.supporting_sources || []) checkSourceRef(ref, opts);
  for (const ref of a.superseded_source_refs || []) checkSourceRef(ref, opts);
}

function checkRuleIdMapObj(rm, opts = {}) {
  if (!rm || typeof rm !== "object") throw new Error("rule-id-map missing");
  assertExactKeys(rm, RULE_ID_MAP_TOP_KEYS, "rule-id-map (top level)");
  for (const [k, v] of Object.entries(EXPECTED_RULE_ID_MAP)) {
    assertExact(rm[k], v, `rule-id-map.${k}`);
  }
  // Cross-check the manifest digest anchor.
  checkFileDigest("aipt/input-manifest.json", ACCEPTED_MANIFEST_SHA256, opts);
  if (rm.source_manifest.path !== "aipt/input-manifest.json" || rm.source_manifest.sha256 !== ACCEPTED_MANIFEST_SHA256) {
    throw new Error("rule-id-map.source_manifest must pin aipt/input-manifest.json at the accepted digest");
  }
  for (const so of rm.source_manifest.source_order) {
    const accepted = ACCEPTED_SOURCE_DIGESTS[so.path];
    if (accepted === undefined || so.sha256 !== accepted) throw new Error(`rule-id-map.source_manifest.source_order[${so.path}] sha256 drift`);
    if (so.lifecycle_status !== "PROPOSAL") throw new Error("rule-id-map source_order lifecycle_status must be PROPOSAL");
  }
  // Cross-check B001 reserved-zero history.
  const stableIds = loadJson("aipt/p0-b001/stable-ids.json");
  if (rm.historical_namespace_reservation.path !== "aipt/p0-b001/stable-ids.json" || rm.historical_namespace_reservation.sha256 !== ACCEPTED_SOURCE_DIGESTS["aipt/p0-b001/stable-ids.json"]) {
    throw new Error("rule-id-map.historical_namespace_reservation must pin aipt/p0-b001/stable-ids.json at the accepted digest");
  }
  for (const ns of ["UNR-RULE", "UNR-INVARIANT", "UNR-MUTATION"]) {
    const hn = rm.historical_namespace_reservation.namespaces[ns];
    const sn = stableIds.namespaces[ns];
    if (!hn || !sn) throw new Error(`missing namespace ${ns}`);
    if (hn.state !== "RESERVED" || hn.assigned_count !== 0 || hn.reserved_count !== 0) {
      throw new Error(`rule-id-map historical_namespace_reservation.${ns} must remain RESERVED zero`);
    }
    if (sn.state !== "RESERVED" || sn.assigned_count !== 0 || sn.reserved_count !== 0) {
      throw new Error(`stable-ids.namespaces.${ns} must remain RESERVED zero`);
    }
  }

  // Allocations: exact count, contiguous unique IDs, deterministic order.
  if (!Array.isArray(rm.allocations) || rm.allocations.length !== 50) {
    throw new Error(`rule-id-map.allocations must have exactly 50 entries, got ${rm.allocations ? rm.allocations.length : "missing"}`);
  }
  const ruleIds = [];
  const invariantIds = [];
  for (const a of rm.allocations) {
    if (a.kind === "RULE") ruleIds.push(a.id);
    else if (a.kind === "INVARIANT") invariantIds.push(a.id);
    else throw new Error(`unexpected allocation kind ${a.kind}`);
  }
  const expectedRuleIds = Array.from({ length: 40 }, (_, i) => `UNR-RULE-${String(i + 1).padStart(4, "0")}`);
  const expectedInvariantIds = Array.from({ length: 10 }, (_, i) => `UNR-INVARIANT-${String(i + 1).padStart(4, "0")}`);
  assertExact(ruleIds, expectedRuleIds, "rule-id-map Rule allocation IDs (40 contiguous unique, no gaps/reorder/unknown)");
  assertExact(invariantIds, expectedInvariantIds, "rule-id-map Invariant allocation IDs (10 contiguous unique, no gaps/reorder/unknown)");

  // Deterministic allocation order: primary_source_manifest_order, then
  // primary_source_document_order, then kind (RULE before INVARIANT).
  const expectedSorted = rm.allocations
    .map((a) => a.id)
    .sort((x, y) => {
      const ax = rm.allocations.find((a) => a.id === x);
      const ay = rm.allocations.find((a) => a.id === y);
      const kx = ax.allocation_order_key;
      const ky = ay.allocation_order_key;
      if (kx.manifest_order !== ky.manifest_order) return kx.manifest_order - ky.manifest_order;
      if (kx.document_order !== ky.document_order) return kx.document_order - ky.document_order;
      return kx.kind === ky.kind ? 0 : kx.kind === "RULE" ? -1 : 1;
    });
  const actualIds = rm.allocations.map((a) => a.id);
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedSorted)) {
    throw new Error("rule-id-map.allocations must be in deterministic allocation order (manifest_order, document_order, kind)");
  }

  for (let i = 0; i < rm.allocations.length; i += 1) {
    checkAllocationObj(rm.allocations[i], i, opts);
  }
}

function checkRuleIdMap() {
  checkRuleIdMapObj(loadJson("aipt/p0-b002/rule-id-map.json"));
  pass("rule-id-map: exact schema/key sets, 40 contiguous unique Rule IDs, 10 contiguous unique Invariant IDs, deterministic allocation order, exact source refs/locators/hashes, PROPOSAL lifecycle, canonical false, zero Mutation allocation");
}

// ---------------------------------------------------------------------------
// 5. machine-rules exact schema and data-only deterministic mechanics
// ---------------------------------------------------------------------------

const MACHINE_RULES_TOP_KEYS = ["aipt_schema", "batch_id", "rules"];
const MACHINE_RULE_KEYS = [
  "rule_id",
  "label",
  "lifecycle_status",
  "canonical",
  "status",
  "primary_source",
  "supporting_sources",
  "superseded_source_refs",
  "semantic_node_refs",
  "reads",
  "writes",
  "preconditions",
  "resolution",
  "effects",
  "constraints",
];
const READS_ITEM_KEY_SETS = [["field", "state"], ["fields", "state"]];
const WRITES_ITEM_KEY_SETS = [["field", "state"], ["fields", "state"], ["field", "source", "state"]];
const PRECONDITION_ITEM_KEY_SETS = [["kind", "state", "value"], ["kind", "min", "max", "state"], ["kind", "op", "state", "value"], ["any_of", "kind"]];
const EFFECTS_ITEM_KEY_SETS = [["state", "value"], ["state", "tens_selection"], ["state", "value", "when"], ["amount", "operation", "state", "when"]];
const RESOLUTION_ITEM_KEY_SETS = [
  ["actions","kind","per_character"],
  ["action","effect","kind"],
  ["advantage","base","disadvantage","kind"],
  ["alarm_level","kind","outcomes"],
  ["any_of","kind"],
  ["boundary","kind","maps_to"],
  ["budget","kind"],
  ["cap","change","eligibility","kind"],
  ["cap","change","kind","selection"],
  ["cap","kind","modifiers","type"],
  ["cap","kind","permanent","range","track"],
  ["cap","kind","range","track"],
  ["cap","kind","resource","scope"],
  ["cases","default","kind"],
  ["categories","kind"],
  ["changed_condition_options","kind","requires_changed_conditions"],
  ["change","kind","per_full_points","target"],
  ["channels","checks_per_channel","kind","time_per_check_minutes"],
  ["check","components","kind"],
  ["check","kind"],
  ["clamp_max","id","input","kind","offset"],
  ["condition","effects","kind"],
  ["condition","effect","kind"],
  ["condition","kind","outcome"],
  ["count","kind","modifier"],
  ["cross_area_move_minutes","kind","single_action_minutes"],
  ["dice","kind","rolls_per_rest","rows","scope"],
  ["dice","kind","skill","tiers"],
  ["die","kind","range","roll"],
  ["divide_by","id","input","kind","round"],
  ["domains","kind"],
  ["duration","kind","outcomes"],
  ["effects","kind"],
  ["effect","kind"],
  ["effect","kind","reset"],
  ["events","kind"],
  ["exits","handoff","kind","random_checks","state_changes","steps"],
  ["failed_push","forbidden_when","kind","must_accept_second_result","pressure_change","reroll_count"],
  ["fatigue_change","kind","source"],
  ["fields","kind"],
  ["hard","kind","min","soft"],
  ["inputs","kind","output"],
  ["inputs","kind","skill_options"],
  ["input","kind","max","min"],
  ["irreversible","kind","mitigation"],
  ["items","kind"],
  ["items","kind","rule"],
  ["item","kind"],
  ["kind","layers"],
  ["kind","layers","replacement"],
  ["kind","left_skill_options","right_skill_options"],
  ["kind","left","right"],
  ["kind","levels"],
  ["kind","lines"],
  ["kind","mapping"],
  ["kind","max","note"],
  ["kind","note"],
  ["kind","on_overtime","requires"],
  ["kind","operands","operation","output"],
  ["kind","operands","output"],
  ["kind","options"],
  ["kind","options","uses_per_task"],
  ["kind","order"],
  ["kind","order_best_to_worst"],
  ["kind","outcomes","when"],
  ["kind","per_area","segments","shift_minutes"],
  ["kind","per_point_over"],
  ["kind","per_pollution_point","source"],
  ["kind","risks"],
  ["kind","rule"],
  ["kind","rules"],
  ["kind","rule","tie_break"],
  ["kind","sections"],
  ["kind","skills"],
  ["kind","stages"],
  ["kind","steps"],
  ["kind","structures"],
  ["kind","thresholds"],
  ["kind","tiers"],
  ["kind","trained","untrained"],
];

const FORBIDDEN_EXECUTABLE_KEYS = new Set([
  "adapter",
  "runtime",
  "mutant",
  "mutation",
  "formula",
  "expression",
  "payload",
  "code",
  "executable",
  "import",
  "eval",
  "function",
  "subprocess",
  "child_process",
  "require",
  "module",
  "script",
  "exec",
  "spawn",
  "javascript",
  "lua",
]);

const FORBIDDEN_EXECUTABLE_VALUE_RE = /(^|[^A-Za-z0-9_])(import\b|require\s*\(|eval\s*\(|new\s+Function|function\s*\(|child_process\b|subprocess\b|exec\b|spawn\b|javascript\s*:|lua\b|formula\b|```|=>)/i;

const MACHINE_SEMANTIC_FIELDS = [
  "label",
  "semantic_node_refs",
  "reads",
  "writes",
  "preconditions",
  "resolution",
  "effects",
  "constraints",
];

const TASK0_REQUIRED_RULE_GROUPS = {
  "d100 five-tier judgement / precedence": ["UNR-RULE-0001", "UNR-RULE-0002", "UNR-RULE-0005"],
  "advantage / disadvantage / modifiers": ["UNR-RULE-0003", "UNR-RULE-0004"],
  "opposition / help / retry / push": ["UNR-RULE-0007", "UNR-RULE-0008", "UNR-RULE-0009"],
  "information checks": ["UNR-RULE-0010", "UNR-RULE-0034", "UNR-RULE-0035"],
  "stress / fatigue / wound / pollution": ["UNR-RULE-0019", "UNR-RULE-0020", "UNR-RULE-0021", "UNR-RULE-0022"],
  "reversal window": ["UNR-RULE-0013"],
  "exposure / alarm / warning": ["UNR-RULE-0006", "UNR-RULE-0036", "UNR-RULE-0037"],
  "task time / reconnaissance": ["UNR-RULE-0015", "UNR-RULE-0034", "UNR-RULE-0036"],
  "Task0 conflict / infiltration": ["UNR-RULE-0014", "UNR-RULE-0017", "UNR-RULE-0018", "UNR-RULE-0027", "UNR-RULE-0028", "UNR-RULE-0029", "UNR-RULE-0030", "UNR-RULE-0031", "UNR-RULE-0032"],
};

const TASK0_SKILL_DOMAINS = [
  { category: "体能与潜入", skills: ["隐匿", "攀爬", "潜入行动", "驾驶", "耐力"] },
  { category: "战斗", skills: ["手枪", "长枪", "近身格斗", "无声击倒", "投掷", "战术"] },
  { category: "技术", skills: ["电子对抗", "开锁与物理入侵", "机械", "数据处理", "通信", "爆破（受限）"] },
  { category: "调查与观测", skills: ["观察", "搜查", "法证", "情报分析", "反侦察", "记录"] },
  { category: "社会", skills: ["话术", "审讯", "伪装", "礼仪与身份扮演", "读人", "安抚"] },
  { category: "生存与后勤", skills: ["急救", "医疗", "城市生存", "物流与供给"] },
  { category: "异常领域", skills: ["异常学", "抵抗污染"] },
];

/** Data-only deterministic mechanics: no executable payload, no import/
 *  expression, no adapter/runtime/mutant/future objects anywhere in the
 *  machine-rules document. */
function checkNoExecutablePayload(value, label = "machine-rules") {
  if (Array.isArray(value)) {
    for (const v of value) checkNoExecutablePayload(v, label);
    return;
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string") {
      if (FORBIDDEN_EXECUTABLE_VALUE_RE.test(value)) {
        throw new Error(`${label}: executable/import/expression string is forbidden (${JSON.stringify(value.slice(0, 120))})`);
      }
    }
    return;
  }
  for (const k of Object.keys(value)) {
    const lk = k.toLowerCase();
    if (FORBIDDEN_EXECUTABLE_KEYS.has(lk)) {
      throw new Error(`${label}: forbidden executable/import/mutation key "${k}"`);
    }
    if (/^(adapter|runtime|mutant|mutation|future|next_batch|b003)$/i.test(k)) {
      throw new Error(`${label}: future/adapter/runtime/mutant object key "${k}" is forbidden`);
    }
    checkNoExecutablePayload(value[k], label);
  }
}

function normalizeProse(value) {
  return value
    .normalize("NFKC")
    .replace(/[`*_#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Machine semantics must stay compact and structured. Source locators remain
 *  exact in their dedicated metadata fields, but semantic payload fields may
 *  not embed a source paragraph or document wholesale. */
function checkNoWholeSourceProse(rule, index, opts = {}) {
  const readText = opts.readText || ((p) => readRel(p));
  const sourceLines = RULE_SOURCE_PATHS.flatMap((p) =>
    readText(p)
      .split(/\r?\n/)
      .map(normalizeProse)
      .filter((line) => line.length >= 80),
  );
  const semanticPayload = Object.fromEntries(MACHINE_SEMANTIC_FIELDS.map((field) => [field, rule[field]]));
  for (const value of jsonStrings(semanticPayload)) {
    if (value.length > 512) {
      throw new Error(`machine-rules.rules[${index}] semantic string exceeds the 512-character data-only ceiling (whole prose/code payload forbidden)`);
    }
    const normalized = normalizeProse(value);
    if (normalized.length >= 80 && sourceLines.some((line) => normalized.includes(line))) {
      throw new Error(`machine-rules.rules[${index}] copies a source prose line wholesale instead of encoding structured semantics`);
    }
  }
}

function checkTask0DomainClosure(mr) {
  const byId = new Map(mr.rules.map((rule) => [rule.rule_id, rule]));
  for (const [domain, ids] of Object.entries(TASK0_REQUIRED_RULE_GROUPS)) {
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) throw new Error(`Task0 required domain ${domain} is missing machine rule(s) ${JSON.stringify(missing)}`);
  }

  const skillRule = byId.get("UNR-RULE-0011");
  const declarations = skillRule.resolution.filter((item) => item.kind === "skill_domains");
  if (declarations.length !== 1) throw new Error(`Task0 skill domains require exactly one structured skill_domains declaration, got ${declarations.length}`);
  assertExact(declarations[0].domains, TASK0_SKILL_DOMAINS, "Task0 exact seven skill domains / 35 skills");
  const skills = TASK0_SKILL_DOMAINS.flatMap((domain) => domain.skills);
  if (skills.length !== 35 || new Set(skills).size !== 35) throw new Error("validator defect: Task0 accepted skill-domain table must contain 35 unique skills");
}

function checkMachineRulesObj(mr, allocMap, opts = {}) {
  if (!mr || typeof mr !== "object") throw new Error("machine-rules missing");
  assertExactKeys(mr, MACHINE_RULES_TOP_KEYS, "machine-rules (top level)");
  if (mr.aipt_schema !== "aipt.machine-rules.v1") throw new Error("machine-rules.aipt_schema must be exactly aipt.machine-rules.v1");
  if (mr.batch_id !== BATCH) throw new Error("machine-rules.batch_id must be exactly UNREGISTERED-AIPT-P0-B002");
  if (!Array.isArray(mr.rules) || mr.rules.length !== 40) {
    throw new Error(`machine-rules.rules must have exactly 40 entries, got ${mr.rules ? mr.rules.length : "missing"}`);
  }
  const expectedRuleIds = Array.from({ length: 40 }, (_, i) => `UNR-RULE-${String(i + 1).padStart(4, "0")}`);
  const seen = new Set();
  for (let i = 0; i < mr.rules.length; i += 1) {
    const r = mr.rules[i];
    assertExactKeys(r, MACHINE_RULE_KEYS, `machine-rules.rules[${i}]`);
    const alloc = allocMap.get(r.rule_id);
    if (!alloc) throw new Error(`machine-rules.rules[${i}].rule_id ${r.rule_id} is not an allocated RULE ID`);
    if (seen.has(r.rule_id)) throw new Error(`machine-rules.rules[${i}].rule_id ${r.rule_id} is duplicated (exactly one active machine rule per allocated Rule ID)`);
    seen.add(r.rule_id);
    if (r.rule_id !== expectedRuleIds[i]) {
      throw new Error(`machine-rules.rules[${i}].rule_id must be ${expectedRuleIds[i]} in contiguous order, got ${r.rule_id}`);
    }
    if (r.lifecycle_status !== "PROPOSAL") throw new Error(`machine-rules.rules[${i}].lifecycle_status must be PROPOSAL`);
    if (r.canonical !== false) throw new Error(`machine-rules.rules[${i}].canonical must be false`);
    if (r.status !== "ACTIVE_PROPOSAL") throw new Error(`machine-rules.rules[${i}].status must be ACTIVE_PROPOSAL`);
    assertExact(r.primary_source, alloc.primary_source, `machine-rules.rules[${i}].primary_source must equal rule-id-map primary_source`);
    assertExact(r.supporting_sources, alloc.supporting_sources, `machine-rules.rules[${i}].supporting_sources must equal rule-id-map supporting_sources`);
    assertExact(r.superseded_source_refs, alloc.superseded_source_refs, `machine-rules.rules[${i}].superseded_source_refs must equal rule-id-map superseded_source_refs`);
    checkSourceRef(r.primary_source, opts);
    for (const ref of r.supporting_sources) checkSourceRef(ref, opts);
    for (const ref of r.superseded_source_refs) checkSourceRef(ref, opts);

    if (!Array.isArray(r.semantic_node_refs) || r.semantic_node_refs.length === 0) {
      throw new Error(`machine-rules.rules[${i}].semantic_node_refs must be a non-empty array`);
    }
    const semanticSet = new Set(r.semantic_node_refs);
    if (semanticSet.size !== r.semantic_node_refs.length) throw new Error(`machine-rules.rules[${i}].semantic_node_refs must not contain duplicates`);
    const acceptedConceptIds = new Set(ACCEPTED_CONCEPTS.map((concept) => concept[0]));
    for (const ref of r.semantic_node_refs) {
      if (typeof ref !== "string" || !ref.startsWith("concept:")) {
        throw new Error(`machine-rules.rules[${i}].semantic_node_refs contains invalid concept ref ${JSON.stringify(ref)}`);
      }
      if (!acceptedConceptIds.has(ref)) {
        throw new Error(`machine-rules.rules[${i}].semantic_node_refs contains unknown concept ref ${JSON.stringify(ref)}`);
      }
    }

    assertArrayOfObjects(r.reads, READS_ITEM_KEY_SETS, `machine-rules.rules[${i}].reads`);
    assertArrayOfObjects(r.writes, WRITES_ITEM_KEY_SETS, `machine-rules.rules[${i}].writes`);
    assertArrayOfObjects(r.preconditions, PRECONDITION_ITEM_KEY_SETS, `machine-rules.rules[${i}].preconditions`);
    assertArrayOfObjects(r.effects, EFFECTS_ITEM_KEY_SETS, `machine-rules.rules[${i}].effects`);
    if (!Array.isArray(r.constraints) || r.constraints.length === 0 || r.constraints.some((c) => typeof c !== "string" || c.length === 0)) {
      throw new Error(`machine-rules.rules[${i}].constraints must be a non-empty array of non-empty strings`);
    }
    if (!Array.isArray(r.resolution) || r.resolution.length === 0) {
      throw new Error(`machine-rules.rules[${i}].resolution must be a non-empty array`);
    }
    assertArrayOfObjects(r.resolution, RESOLUTION_ITEM_KEY_SETS, `machine-rules.rules[${i}].resolution`);
    for (const res of r.resolution) {
      if (typeof res.kind !== "string" || res.kind.length === 0) throw new Error(`machine-rules.rules[${i}].resolution item must have a non-empty kind`);
    }
    checkNoExecutablePayload(r, `machine-rules.rules[${i}]`);
    checkNoWholeSourceProse(r, i, opts);
  }
  if (seen.size !== 40) throw new Error("machine-rules must contain exactly 40 unique active allocated RULE IDs");
  checkTask0DomainClosure(mr);
}

function checkMachineRules() {
  const rm = loadJson("aipt/p0-b002/rule-id-map.json");
  const allocMap = new Map(rm.allocations.filter((a) => a.kind === "RULE").map((a) => [a.id, a]));
  checkMachineRulesObj(loadJson("aipt/p0-b002/machine-rules.json"), allocMap);
  pass("machine-rules: exact schema and required fields, exactly one active allocated Rule per ID in contiguous order, valid source refs/concept refs, data-only deterministic mechanics, no executable payload/import/expression, Task-0 domain closure, no adapter/runtime/mutant/future objects");
}

// ---------------------------------------------------------------------------
// 6. semantic-graph exact semantics
// ---------------------------------------------------------------------------

const SEMANTIC_GRAPH_TOP_KEYS = [
  "aipt_schema",
  "batch_id",
  "rule_id_authority",
  "lifecycle",
  "edge_type_enum",
  "supersession_policy",
  "concept_nodes",
  "rule_refs",
  "invariant_refs",
  "edges",
];
const CONCEPT_KEYS = ["id", "logic_index", "label", "definition", "lifecycle_status", "canonical", "invariant_ref", "source"];
const GROWTH_CONCEPT_KEYS = [...CONCEPT_KEYS, "parameter_authority_note"];
const RULE_REF_KEYS = ["rule_id", "lifecycle_status", "canonical", "status", "source_binding"];
const INVARIANT_REF_KEYS = ["invariant_id", "lifecycle_status", "canonical", "status", "source_binding"];
const EDGE_KEYS = ["id", "from", "to", "type", "evidence_ref"];

const EXPECTED_SEMANTIC_GRAPH = {
  aipt_schema: "aipt.semantic-graph.v1",
  batch_id: BATCH,
  rule_id_authority: {
    path: "aipt/p0-b002/rule-id-map.json",
    sha256: ACCEPTED_B002_DIGESTS["aipt/p0-b002/rule-id-map.json"],
    binding_type: "RULE_ID_MAP_ALLOCATION",
  },
  lifecycle: {
    lifecycle_status: "PROPOSAL",
    canonical: false,
    promotes_source_lifecycle: false,
  },
  edge_type_enum: [
    "IMPLEMENTS",
    "CONVERGES_TO",
    "DEPENDS_ON",
    "READS",
    "WRITES",
    "CONSTRAINS",
    "SUPERSEDES",
  ],
  supersession_policy: {
    acyclic_edge_type: "SUPERSEDES",
    other_cycles_allowed: true,
    effective_semantics: "ONE_ACTIVE_RULE_ID_PER_LOGICAL_RULE",
    source_level_supersession_authority: "aipt/p0-b002/rule-id-map.json",
    note: "The current graph needs no Rule-to-Rule SUPERSEDES edge because refined prose is retained under the same logical Rule identity.",
  },
};

function conceptToTuple(c) {
  return [
    c.id,
    c.logic_index,
    c.label,
    c.definition,
    c.invariant_ref,
    c.source.path,
    c.source.locator,
    c.source.locator_type,
    c.source.source_sha256,
    c.parameter_authority_note ?? null,
  ];
}

function edgeToTuple(e) {
  return [e.id, e.from, e.to, e.type, e.evidence_ref];
}

function checkSupersedesAcyclic(edges, nodeSet) {
  const adj = new Map();
  for (const e of edges) {
    if (e.type !== "SUPERSEDES") continue;
    if (!nodeSet.has(e.from) || !nodeSet.has(e.to)) {
      throw new Error(`SUPERSEDES edge ${e.id} references an unknown node (${e.from} -> ${e.to})`);
    }
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e.to);
  }
  const visiting = new Set();
  const done = new Set();
  function dfs(node) {
    if (visiting.has(node)) throw new Error(`SUPERSEDES cycle detected at ${node}`);
    if (done.has(node)) return;
    visiting.add(node);
    for (const next of adj.get(node) || []) dfs(next);
    visiting.delete(node);
    done.add(node);
  }
  for (const node of adj.keys()) dfs(node);
}

function checkSemanticGraphObj(g, machineRules, allocMap, opts = {}) {
  if (!g || typeof g !== "object") throw new Error("semantic-graph missing");
  assertExactKeys(g, SEMANTIC_GRAPH_TOP_KEYS, "semantic-graph (top level)");
  for (const [k, v] of Object.entries(EXPECTED_SEMANTIC_GRAPH)) {
    assertExact(g[k], v, `semantic-graph.${k}`);
  }
  checkFileDigest("aipt/p0-b002/rule-id-map.json", ACCEPTED_B002_DIGESTS["aipt/p0-b002/rule-id-map.json"], opts);

  if (!Array.isArray(g.concept_nodes) || g.concept_nodes.length !== 10) {
    throw new Error(`semantic-graph.concept_nodes must have exactly 10 anchored concepts, got ${g.concept_nodes ? g.concept_nodes.length : "missing"}`);
  }
  const conceptSet = new Set();
  for (let i = 0; i < g.concept_nodes.length; i += 1) {
    const c = g.concept_nodes[i];
    const keys = c.id === "concept:growth" ? GROWTH_CONCEPT_KEYS : CONCEPT_KEYS;
    assertExactKeys(c, keys, `semantic-graph.concept_nodes[${i}]`);
    const accepted = ACCEPTED_CONCEPTS[i];
    if (!accepted) throw new Error(`semantic-graph.concept_nodes[${i}] has no accepted concept`);
    assertExact(conceptToTuple(c), accepted, `semantic-graph.concept_nodes[${i}] exact tuple`);
    if (c.lifecycle_status !== "PROPOSAL") throw new Error(`semantic-graph.concept_nodes[${i}].lifecycle_status must be PROPOSAL`);
    if (c.canonical !== false) throw new Error(`semantic-graph.concept_nodes[${i}].canonical must be false`);
    if (conceptSet.has(c.id)) throw new Error(`duplicate concept id ${c.id}`);
    conceptSet.add(c.id);
    checkSourceRef(c.source, opts);
    const inv = allocMap.get(c.invariant_ref);
    if (!inv || inv.kind !== "INVARIANT") throw new Error(`concept ${c.id} invariant_ref ${c.invariant_ref} is not an allocated INVARIANT`);
  }

  // Allocated Rule/Invariant refs: exact counts and exact values.
  if (!Array.isArray(g.rule_refs) || g.rule_refs.length !== 40) {
    throw new Error(`semantic-graph.rule_refs must have exactly 40 entries, got ${g.rule_refs ? g.rule_refs.length : "missing"}`);
  }
  for (let i = 0; i < g.rule_refs.length; i += 1) {
    const ref = g.rule_refs[i];
    assertExactKeys(ref, RULE_REF_KEYS, `semantic-graph.rule_refs[${i}]`);
    const expectedId = `UNR-RULE-${String(i + 1).padStart(4, "0")}`;
    if (ref.rule_id !== expectedId) throw new Error(`semantic-graph.rule_refs[${i}].rule_id must be ${expectedId} in contiguous order`);
    if (ref.source_binding !== ref.rule_id) throw new Error(`semantic-graph.rule_refs[${i}].source_binding must equal rule_id`);
    if (ref.lifecycle_status !== "PROPOSAL" || ref.canonical !== false || ref.status !== "ACTIVE_PROPOSAL") {
      throw new Error(`semantic-graph.rule_refs[${i}] lifecycle/canonical/status drift`);
    }
    const alloc = allocMap.get(ref.rule_id);
    if (!alloc || alloc.kind !== "RULE") throw new Error(`semantic-graph.rule_refs[${i}] ${ref.rule_id} is not an allocated RULE`);
  }

  if (!Array.isArray(g.invariant_refs) || g.invariant_refs.length !== 10) {
    throw new Error(`semantic-graph.invariant_refs must have exactly 10 entries, got ${g.invariant_refs ? g.invariant_refs.length : "missing"}`);
  }
  for (let i = 0; i < g.invariant_refs.length; i += 1) {
    const ref = g.invariant_refs[i];
    assertExactKeys(ref, INVARIANT_REF_KEYS, `semantic-graph.invariant_refs[${i}]`);
    const expectedId = `UNR-INVARIANT-${String(i + 1).padStart(4, "0")}`;
    if (ref.invariant_id !== expectedId) throw new Error(`semantic-graph.invariant_refs[${i}].invariant_id must be ${expectedId} in contiguous order`);
    if (ref.source_binding !== ref.invariant_id) throw new Error(`semantic-graph.invariant_refs[${i}].source_binding must equal invariant_id`);
    if (ref.lifecycle_status !== "PROPOSAL" || ref.canonical !== false || ref.status !== "ACTIVE_PROPOSAL") {
      throw new Error(`semantic-graph.invariant_refs[${i}] lifecycle/canonical/status drift`);
    }
    const alloc = allocMap.get(ref.invariant_id);
    if (!alloc || alloc.kind !== "INVARIANT") throw new Error(`semantic-graph.invariant_refs[${i}] ${ref.invariant_id} is not an allocated INVARIANT`);
  }

  // Edges: exact accepted machine mappings, closed enum, no orphans/unknown.
  if (!Array.isArray(g.edges) || g.edges.length !== 105) {
    throw new Error(`semantic-graph.edges must have exactly 105 accepted edges, got ${g.edges ? g.edges.length : "missing"}`);
  }
  const nodeSet = new Set([
    ...g.concept_nodes.map((c) => c.id),
    ...g.rule_refs.map((r) => r.rule_id),
    ...g.invariant_refs.map((r) => r.invariant_id),
  ]);
  for (let i = 0; i < g.edges.length; i += 1) {
    const e = g.edges[i];
    assertExactKeys(e, EDGE_KEYS, `semantic-graph.edges[${i}]`);
    const accepted = ACCEPTED_EDGES[i];
    if (!accepted) throw new Error(`semantic-graph.edges[${i}] has no accepted edge at index ${i}`);
    assertExact(edgeToTuple(e), accepted, `semantic-graph.edges[${i}] exact tuple`);
    if (!nodeSet.has(e.from) || !nodeSet.has(e.to)) {
      throw new Error(`semantic-graph.edges[${i}] orphan/unknown edge endpoint (${e.from} -> ${e.to})`);
    }
    if (!EXPECTED_SEMANTIC_GRAPH.edge_type_enum.includes(e.type)) throw new Error(`semantic-graph.edges[${i}].type ${e.type} is outside the closed edge enum`);
  }
  checkSupersedesAcyclic(g.edges, nodeSet);

  // Exact machine mappings: each machine rule's semantic_node_refs must equal
  // the set of graph edges that start at that rule and land on a concept.
  for (const mr of machineRules.rules) {
    const graphRefs = g.edges.filter((e) => e.from === mr.rule_id && e.to.startsWith("concept:")).map((e) => e.to).sort();
    const machineRefs = [...mr.semantic_node_refs].sort();
    assertExact(machineRefs, graphRefs, `machine mapping for ${mr.rule_id} (semantic_node_refs must equal graph edges)`);
  }

  // No mutation/CANON promotion anywhere in the graph.
  for (const c of g.concept_nodes) {
    if (c.id.includes("mutation") || c.invariant_ref.startsWith("UNR-MUTATION")) throw new Error("semantic-graph contains a Mutation node");
  }
  for (const e of g.edges) {
    if (e.from.startsWith("UNR-MUTATION") || e.to.startsWith("UNR-MUTATION") || e.evidence_ref.startsWith("UNR-MUTATION")) {
      throw new Error("semantic-graph contains a Mutation edge/ref");
    }
  }
  checkNoExecutablePayload(g, "semantic-graph");
}

function checkSemanticGraph() {
  const rm = loadJson("aipt/p0-b002/rule-id-map.json");
  const allocMap = new Map(rm.allocations.map((a) => [a.id, a]));
  const mr = loadJson("aipt/p0-b002/machine-rules.json");
  checkSemanticGraphObj(loadJson("aipt/p0-b002/semantic-graph.json"), mr, allocMap);
  pass("semantic-graph: exact 10 anchored concepts, allocated Rule/Invariant refs, exact machine mappings, closed edge enum, no orphans, SUPERSEDES acyclic, no mutation/CANON promotion");
}

// ---------------------------------------------------------------------------
// 7. Security/surface contracts
// ---------------------------------------------------------------------------

const REQUIRED_HISTORICAL_AIPT_FILES = [
  "aipt/README.md",
  "aipt/input-manifest.json",
  "aipt/p0-b000/identity.json",
  "aipt/p0-b000/licensing.json",
  "aipt/p0-b000/premades-v2.json",
  "aipt/p0-b001/safety-profile.json",
  "aipt/p0-b001/stable-ids.json",
  "aipt/p0-b001/visibility.json",
  "aipt/status.json",
];

const ALLOWED_B002_AIPT_FILES = [
  "aipt/p0-b002/rule-id-map.json",
  "aipt/p0-b002/machine-rules.json",
  "aipt/p0-b002/semantic-graph.json",
  "aipt/p0-b002/README.md",
];

const REQUIRED_B003_CONTROL_AIPT_FILES = [
  "aipt/p0-b003/compatibility.json",
  "aipt/p0-b003/mutation-id-map.json",
];

const ALLOWED_B003_AIPT_FILES = [
  "aipt/p0-b003/README.md",
  "aipt/p0-b003/compatibility.json",
  "aipt/p0-b003/mutation-id-map.json",
  "aipt/p0-b003/game-adapter.json",
  "aipt/p0-b003/human-guide-map.json",
  "aipt/p0-b003/human-guide/core-map.json",
  "aipt/p0-b003/human-guide/safety-observer-map.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/clean/manifest.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/clean/seats.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/clean/state.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/clean/projection-seat-01.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/clean/projection-seat-02.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/clean/projection-seat-03.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/clean/projection-seat-04.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/clean/action-intent.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/clean/transition.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/clean/event.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/clean/final-state.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/clean/replay-assertion.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/mutants/manifest.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/mutants/UNR-MUTATION-0001/overlay.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/mutants/UNR-MUTATION-0001/oracle.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/mutants/UNR-MUTATION-0002/overlay.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/mutants/UNR-MUTATION-0002/oracle.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/mutants/UNR-MUTATION-0003/overlay.json",
  "aipt/p0-b003/NON_CANON_TEST_FIXTURE/mutants/UNR-MUTATION-0003/oracle.json",
];

const REQUIRED_SCRIPTS_AIPT = [
  "scripts/aipt/validate-p0-b000.mjs",
  "scripts/aipt/validate-p0-b001.mjs",
  "scripts/aipt/validate-p0-b002.mjs",
  "scripts/aipt/validate-p0-b003.mjs",
];

function collectEntriesWithKinds(dir) {
  const out = [];
  const abs = path.join(ROOT, dir);
  if (!existsSync(abs)) return out;
  const recurse = (cur) => {
    for (const ent of readdirSync(cur, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      if (WALK_EXCLUDED.has(ent.name)) continue;
      const p = path.join(cur, ent.name);
      if (ent.isSymbolicLink()) {
        out.push({ rel: relPath(p), kind: "symlink" });
      } else if (ent.isDirectory()) {
        recurse(p);
      } else if (ent.isFile()) {
        out.push({ rel: relPath(p), kind: "file" });
      } else {
        out.push({ rel: relPath(p), kind: "non-regular" });
      }
    }
  };
  recurse(abs);
  return out;
}

function checkArtifactPaths(entries, opts = {}) {
  const nonRegular = entries.filter((e) => e.kind !== "file");
  if (nonRegular.length > 0) {
    throw new Error(
      `non-regular AIPT entries are rejected (symlinks/devices/sockets/fifos are never silently ignored): ${nonRegular
        .map((e) => `${e.rel} (${e.kind})`)
        .join(", ")}`,
    );
  }
  const files = entries.map((e) => e.rel).sort();
  const allowed = new Set([
    ...REQUIRED_HISTORICAL_AIPT_FILES,
    ...ALLOWED_B002_AIPT_FILES,
    ...REQUIRED_B003_CONTROL_AIPT_FILES,
    ...ALLOWED_B003_AIPT_FILES,
  ]);
  const required = [...REQUIRED_HISTORICAL_AIPT_FILES, ...ALLOWED_B002_AIPT_FILES, ...REQUIRED_B003_CONTROL_AIPT_FILES];
  const missingHistorical = required.filter((p) => !files.includes(p));
  if (missingHistorical.length > 0) {
    throw new Error(`historical AIPT artifacts must remain present exactly; missing ${JSON.stringify(missingHistorical)}`);
  }
  const unexpected = files.filter((p) => !allowed.has(p));
  if (unexpected.length > 0) {
    throw new Error(
      `unexpected AIPT artifact paths: historical files remain exact and B003 is limited to the explicit file allowlist; got unexpected ${JSON.stringify(unexpected)}`,
    );
  }
}

function checkScriptsAipt(entries, opts = {}) {
  const nonRegular = entries.filter((e) => e.kind !== "file");
  if (nonRegular.length > 0) {
    throw new Error(
      `non-regular entries under scripts/aipt are rejected (${nonRegular.map((e) => `${e.rel} (${e.kind})`).join(", ")})`,
    );
  }
  const files = entries.map((e) => e.rel).sort();
  const allowed = new Set(REQUIRED_SCRIPTS_AIPT);
  const missing = REQUIRED_SCRIPTS_AIPT.filter((p) => !files.includes(p));
  const unexpected = files.filter((p) => !allowed.has(p));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `scripts/aipt must contain exactly ${JSON.stringify(REQUIRED_SCRIPTS_AIPT)}; missing ${JSON.stringify(missing)}, unexpected ${JSON.stringify(unexpected)} (no adapter/runtime/mutant executable)`,
    );
  }
}

function buildScanNeedles() {
  return [
    { label: "GitHub classic PAT", re: new RegExp("gh" + "p_[A-Za-z0-9]{20,}") },
    { label: "GitHub fine-grained PAT", re: new RegExp("github_" + "pat_[A-Za-z0-9_]{10,}") },
    { label: "AWS access key", re: new RegExp("AK" + "IA[0-9A-Z]{16}") },
    { label: "Slack token", re: new RegExp("xo" + "x[bpa]-[A-Za-z0-9-]{10,}") },
    { label: "Stripe live key", re: new RegExp("(sk|pk)_" + "live_[A-Za-z0-9]{10,}") },
    { label: "API secret key", re: new RegExp("s" + "k-[A-Za-z0-9_-]{16,}") },
    { label: "PEM private key", re: new RegExp("-".repeat(5) + "BEGIN [A-Z ]*PRIVATE KEY") },
    {
      label: "credential-like JSON field",
      re: new RegExp(
        '"(' + ["pass" + "word", "passwd", "client_" + "secret", "api_" + "key", "access_" + "key", "secret_" + "key", "private_" + "key", "ssh_" + "key"].join("|") + ')"\\s*:\\s*"[^"]+"',
        "i",
      ),
    },
    { label: "private absolute path", re: new RegExp("/(" + "Users|home|root|private|var/folders)" + "/") },
    { label: "Windows user path", re: new RegExp("[A-Za-z]:[\\\\/](" + "Users|Documents and Settings)") },
    {
      label: "private prompt marker " + ["CODEX", "MASTER", "PROMPT"].join("_"),
      re: new RegExp("CODEX" + "_MASTER_" + "PROMPT"),
    },
    {
      label: "private package marker " + ["EXTERNAL", "HARNESS", "AUTHORIZATION", "TEMPLATE"].join("_"),
      re: new RegExp("EXTERNAL_" + "HARNESS_" + "AUTHORIZATION_" + "TEMPLATE"),
    },
    {
      label: "participant-data classification token",
      re: new RegExp("HUMAN_" + "PRIVATE_" + "DATA"),
      // Sanctioned only inside the B001 metadata files (aipt/p0-b001/**).
      b001MetadataAllowed: true,
    },
    {
      label: "participant data flag",
      re: new RegExp('"(participant_' + "answers|names|responses|feedback|mental_health_data" + ')"\\s*:\\s*true'),
    },
    {
      label: "participant payload value",
      re: new RegExp('"(participant_' + "answers|names|responses|feedback|mental_health_data" + ')"\\s*:\\s*("|\\[|\\{)'),
    },
  ];
}

function scanText(label, text) {
  const lines = text.split(/\r?\n/);
  for (const n of buildScanNeedles()) {
    if (n.b001MetadataAllowed && label.startsWith("aipt/p0-b001/")) continue;
    for (let i = 0; i < lines.length; i += 1) {
      if (n.re.test(lines[i])) throw new Error(`possible ${n.label} material in ${label}:${i + 1}`);
    }
  }
}

function checkScan() {
  const files = [];
  for (const dir of ["aipt", "LICENSES", path.join("scripts", "aipt")]) {
    const abs = path.join(ROOT, dir);
    if (existsSync(abs)) files.push(...walk(abs));
  }
  const workflowFile = path.join(ROOT, ".github", "workflows", "aipt-content-gate.yml");
  if (existsSync(workflowFile)) files.push(workflowFile);
  files.sort();
  let scanned = 0;
  for (const f of files) {
    if (!statSync(f).isFile()) continue;
    scanned += 1;
    scanText(relPath(f), readRel(relPath(f)));
  }
  pass(`security/surface scan: no credentials, private absolute paths, private prompt/package markers, or participant payloads (${scanned} files scanned; classification token allowed only in aipt/p0-b001/)`);
}

function checkSurfaces() {
  checkArtifactPaths(collectEntriesWithKinds("aipt"));
  checkScriptsAipt(collectEntriesWithKinds(path.join("scripts", "aipt")));
  checkScan();
  pass("artifact surfaces: historical B000/B001/B002 files stay exact; B003 is limited to explicit data/validator paths; non-regular and executable adapter/runtime/mutant entries reject");
}

// ---------------------------------------------------------------------------
// 8. In-memory adversarial probes — every one required to reject
// ---------------------------------------------------------------------------

function runProbes() {
  const manifest = loadJson(MANIFEST_REL);
  const stableIds = loadJson("aipt/p0-b001/stable-ids.json");
  const visibility = loadJson("aipt/p0-b001/visibility.json");
  const safety = loadJson("aipt/p0-b001/safety-profile.json");
  const rm = loadJson("aipt/p0-b002/rule-id-map.json");
  const mr = loadJson("aipt/p0-b002/machine-rules.json");
  const sg = loadJson("aipt/p0-b002/semantic-graph.json");
  const allocMap = new Map(rm.allocations.map((a) => [a.id, a]));
  const ruleAllocMap = new Map(rm.allocations.filter((a) => a.kind === "RULE").map((a) => [a.id, a]));

  const probes = [
    // --- rule-id-map ID failures ---
    ["duplicate Rule ID in rule-id-map allocations", () => {
      const x = deepClone(rm);
      x.allocations[1].id = x.allocations[0].id;
      expectThrown(() => checkRuleIdMapObj(x), "duplicate allocation ID");
    }],
    ["gap Rule ID in rule-id-map allocations", () => {
      const x = deepClone(rm);
      const idx = x.allocations.findIndex((a) => a.id === "UNR-RULE-0010");
      x.allocations[idx].id = "UNR-RULE-0041";
      expectThrown(() => checkRuleIdMapObj(x), "contiguous Rule ID gap");
    }],
    ["reordered rule-id-map allocations", () => {
      const x = deepClone(rm);
      [x.allocations[0], x.allocations[1]] = [x.allocations[1], x.allocations[0]];
      expectThrown(() => checkRuleIdMapObj(x), "deterministic allocation order");
    }],
    ["unknown allocation ID", () => {
      const x = deepClone(rm);
      x.allocations[0].id = "UNR-RULE-9999";
      expectThrown(() => checkRuleIdMapObj(x), "unknown allocation ID");
    }],
    ["Mutation allocation", () => {
      const x = deepClone(rm);
      x.allocations.push({
        id: "UNR-MUTATION-0001",
        kind: "MUTATION",
        slug: "mutation-probe",
        label: "mutation probe",
        lifecycle_status: "PROPOSAL",
        canonical: false,
        status: "ACTIVE_PROPOSAL",
        allocation_order_key: { manifest_order: 14, document_order: 1, kind: "MUTATION" },
        primary_source: {
          path: "campaign/rules/vertical-slice-v0.md",
          locator: "### 1.1 触发",
          locator_type: "MARKDOWN_HEADING",
          source_sha256: ACCEPTED_SOURCE_DIGESTS["campaign/rules/vertical-slice-v0.md"],
          lifecycle_status: "PROPOSAL",
        },
        supporting_sources: [],
        superseded_source_refs: [],
      });
      expectThrown(() => checkRuleIdMapObj(x), "zero Mutation allocation");
    }],
    ["Mutation namespace assigned_count > 0", () => {
      const x = deepClone(rm);
      x.namespaces["UNR-MUTATION"].assigned_count = 1;
      expectThrown(() => checkRuleIdMapObj(x), "Mutation namespace assigned_count 0");
    }],
    // --- hash and locator failures ---
    ["rule-id-map source_manifest hash drift", () => {
      const x = deepClone(rm);
      x.source_manifest.sha256 = "0".repeat(64);
      expectThrown(() => checkRuleIdMapObj(x), "frozen manifest digest");
    }],
    ["allocation locator drift", () => {
      const x = deepClone(rm);
      x.allocations[0].primary_source.locator = "### 9.9 不存在";
      expectThrown(() => checkRuleIdMapObj(x), "source locator exact-line resolution");
    }],
    ["allocation locator ambiguity (non-unique line)", () => {
      const x = deepClone(rm);
      const idx = x.allocations.findIndex((a) => a.id === "UNR-RULE-0019");
      x.allocations[idx].primary_source.locator = "| 要素 | 参数 |";
      expectThrown(() => checkRuleIdMapObj(x), "source locator ambiguity");
    }],
    ["allocation source hash drift", () => {
      const x = deepClone(rm);
      x.allocations[0].primary_source.source_sha256 = "0".repeat(64);
      expectThrown(() => checkRuleIdMapObj(x), "source hash drift");
    }],
    ["CANON lifecycle promotion in allocation", () => {
      const x = deepClone(rm);
      x.allocations[0].lifecycle_status = "CANON";
      expectThrown(() => checkRuleIdMapObj(x), "CANON promotion");
    }],
    ["canonical true in allocation", () => {
      const x = deepClone(rm);
      x.allocations[0].canonical = true;
      expectThrown(() => checkRuleIdMapObj(x), "canonical false");
    }],
    ["source + manifest co-drift", () => {
      const x = deepClone(manifest);
      const target = x.source_files.find((e) => e.path === "campaign/rules/vertical-slice-v0.md");
      const drifted = Buffer.from("drifted vertical slice for B002 co-drift probe");
      target.sha256 = sha256(drifted);
      expectThrown(
        () =>
          checkManifestObj(x, {
            readBytes: (p) => (p === target.path ? drifted : readFileSync(path.join(ROOT, p))),
          }),
        "accepted-digest anchor (source file and manifest cannot co-drift)",
      );
    }],
    ["B001 stable-ids mutation (RULE namespace assigned)", () => {
      const x = deepClone(stableIds);
      x.namespaces["UNR-RULE"].assigned_count = 1;
      expectThrown(() => checkB001HistoricalObj(x, deepClone(visibility), deepClone(safety)), "B001 reserved-zero RULE history");
    }],
    ["B001 stable-ids mutation (INVARIANT entity)", () => {
      const x = deepClone(stableIds);
      x.entities.push({ stable_id: "UNR-INVARIANT-0001", kind: "INVARIANT", display_name: "probe" });
      expectThrown(() => checkB001HistoricalObj(x, deepClone(visibility), deepClone(safety)), "B001 reserved-zero INVARIANT history");
    }],
    // --- machine-rules failures ---
    ["misplaced machine rules (extra rules key in rule-id-map)", () => {
      const x = deepClone(rm);
      x.rules = [];
      expectThrown(() => checkRuleIdMapObj(x), "misplaced machine rules");
    }],
    ["unknown machine key (top-level)", () => {
      const x = deepClone(mr);
      x.unknown = true;
      expectThrown(() => checkMachineRulesObj(x, ruleAllocMap), "unknown machine key");
    }],
    ["unknown machine key (per-rule)", () => {
      const x = deepClone(mr);
      x.rules[0].expression = "probe";
      expectThrown(() => checkMachineRulesObj(x, ruleAllocMap), "unknown machine rule key");
    }],
    ["unallocated active machine rule", () => {
      const x = deepClone(mr);
      x.rules[0].rule_id = "UNR-RULE-9999";
      expectThrown(() => checkMachineRulesObj(x, ruleAllocMap), "unallocated active rule");
    }],
    ["duplicate active machine rule", () => {
      const x = deepClone(mr);
      x.rules[1].rule_id = x.rules[0].rule_id;
      expectThrown(() => checkMachineRulesObj(x, ruleAllocMap), "duplicate active rule");
    }],
    ["executable injection in machine rule", () => {
      const x = deepClone(mr);
      x.rules[0].constraints[0] = "import('node:fs').readFileSync('/etc/passwd')";
      expectThrown(() => checkMachineRulesObj(x, ruleAllocMap), "executable/import/expression injection");
    }],
    ["arbitrary formula string in machine rule", () => {
      const x = deepClone(mr);
      x.rules[0].constraints[0] = "formula: r <= s ? success : failure";
      expectThrown(() => checkMachineRulesObj(x, ruleAllocMap), "arbitrary formula/code string");
    }],
    ["whole source prose copied into machine rule", () => {
      const x = deepClone(mr);
      x.rules[0].constraints[0] = readRel("campaign/rules/vertical-slice-v0.md");
      expectThrown(() => checkMachineRulesObj(x, ruleAllocMap), "whole source prose copy");
    }],
    ["Task0 skill domain removed", () => {
      const x = deepClone(mr);
      const skillRule = x.rules.find((rule) => rule.rule_id === "UNR-RULE-0011");
      skillRule.resolution.find((item) => item.kind === "skill_domains").domains.pop();
      expectThrown(() => checkMachineRulesObj(x, ruleAllocMap), "Task0 required skill domains");
    }],
    ["missing concept in machine rule semantic_node_refs", () => {
      const x = deepClone(mr);
      x.rules[0].semantic_node_refs = ["concept:missing"];
      expectThrown(() => checkMachineRulesObj(x, ruleAllocMap), "unknown concept ref");
    }],
    // --- semantic-graph failures ---
    ["unknown edge endpoint (orphan)", () => {
      const x = deepClone(sg);
      x.edges[0].to = "concept:missing";
      expectThrown(() => checkSemanticGraphObj(x, deepClone(mr), allocMap), "orphan/unknown edge");
    }],
    ["unknown edge type", () => {
      const x = deepClone(sg);
      x.edges[0].type = "UNKNOWN";
      expectThrown(() => checkSemanticGraphObj(x, deepClone(mr), allocMap), "closed edge enum");
    }],
    ["SUPERSEDES cycle", () => {
      const nodeSet = new Set(["UNR-RULE-0001", "UNR-RULE-0002"]);
      const cycle = [
        { id: "edge:probe1", from: "UNR-RULE-0001", to: "UNR-RULE-0002", type: "SUPERSEDES", evidence_ref: "UNR-RULE-0001" },
        { id: "edge:probe2", from: "UNR-RULE-0002", to: "UNR-RULE-0001", type: "SUPERSEDES", evidence_ref: "UNR-RULE-0002" },
      ];
      expectThrown(() => checkSupersedesAcyclic(cycle, nodeSet), "SUPERSEDES acyclic");
    }],
    ["Mutation node in semantic graph", () => {
      const x = deepClone(sg);
      x.concept_nodes.push({
        id: "concept:mutation",
        logic_index: 11,
        label: "mutation",
        definition: "probe",
        lifecycle_status: "PROPOSAL",
        canonical: false,
        invariant_ref: "UNR-MUTATION-0001",
        source: x.concept_nodes[0].source,
      });
      expectThrown(() => checkSemanticGraphObj(x, deepClone(mr), allocMap), "Mutation node");
    }],
    ["canonical true in semantic graph", () => {
      const x = deepClone(sg);
      x.concept_nodes[0].canonical = true;
      expectThrown(() => checkSemanticGraphObj(x, deepClone(mr), allocMap), "CANON/canonical promotion");
    }],
    // --- path/surface failures ---
    ["path escape (absolute path)", () => {
      const x = deepClone(manifest);
      x.source_files[0].path = "/etc/passwd";
      expectThrown(() => checkPathPolicy(x.source_files), "absolute path");
    }],
    ["path escape (dot-dot traversal)", () => {
      const x = deepClone(manifest);
      x.source_files[0].path = "campaign/../../README.md";
      expectThrown(() => checkPathPolicy(x.source_files), "dot-dot traversal");
    }],
    ["symlink path", () => {
      expectThrown(
        () =>
          checkPathPolicy(manifest.source_files, {
            lstat: (p) => (String(p).endsWith("identity.json") ? { isSymbolicLink: () => true, isFile: () => true } : lstatSync(p)),
          }),
        "symlink path",
      );
    }],
    ["unlisted B003 artifact", () => {
      const entries = collectEntriesWithKinds("aipt");
      entries.push({ rel: "aipt/p0-b003/started.json", kind: "file" });
      expectThrown(() => checkArtifactPaths(entries), "unlisted B003 artifact");
    }],
    ["unexpected scripts/aipt adapter/runtime/mutant", () => {
      const entries = collectEntriesWithKinds(path.join("scripts", "aipt"));
      entries.push({ rel: "scripts/aipt/adapter-runtime.mjs", kind: "file" });
      expectThrown(() => checkScriptsAipt(entries), "unexpected scripts/aipt artifact");
    }],
  ];

  for (const [name, fn] of probes) {
    try {
      fn();
    } catch (e) {
      throw new Error(`negative probe failed (${name}): ${e.message}`);
    }
  }
  pass(`adversarial probes: all ${probes.length} in-memory negative probes reject (duplicate/gap/reorder/unknown IDs, Mutation allocation, hash/locator drift/ambiguity, CANON/canonical true, manifest co-drift, B001 mutation, misplaced machine rules, unknown machine key, unallocated/duplicate active rules, executable injection, missing concept, orphan/unknown edge, SUPERSEDES cycle, Mutation node, path escape/symlink, unlisted B003 artifact)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  runCheck("frozen hashes", checkFrozenHashes);
  runCheck("manifest semantics", checkManifest);
  runCheck("B001 historical semantics", checkB001Historical);
  runCheck("rule-id-map", checkRuleIdMap);
  runCheck("machine-rules", checkMachineRules);
  runCheck("semantic-graph", checkSemanticGraph);
  runCheck("security/surface contracts", checkSurfaces);
  runCheck("adversarial probes", runProbes);

  if (errors.length > 0) {
    console.error("FAIL " + errors.length + " validation error(s):");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log("OK validate-p0-b002: all fail-closed checks passed");
}

main();
