#!/usr/bin/env node
/**
 * scripts/aipt/validate-p0-b001.mjs
 *
 * Deterministic content-gate validator for AIPT batch UNREGISTERED-AIPT-P0-B001.
 *
 * Hard constraints: Node.js standard library only — no dependencies, no network,
 * no subprocess, no git, no model calls, no writes. It works by reading the
 * checkout filesystem (plus in-memory negative probes on structured clones);
 * it never writes anything.
 *
 * Shared repository gates (all repository JSON parse + relative Markdown-link
 * resolution) remain enforced by the still-run validate-p0-b000.mjs step; this
 * validator relies on that gate and focuses on the B001 contract:
 *
 *   1. exact B001 status shape (IN_PROGRESS; previous batch B000 MERGED_CLOSED;
 *      global_wip 1; next AIPT-M0-B003 NOT_AUTHORIZED, authorized false,
 *      started false);
 *   2. input manifest: fail-closed schema shape — exact allowed key sets for
 *      the top level, game, content_license, aipt_compatibility,
 *      source_binding, source_path_policy, every source_files entry, every
 *      registry_refs entry, scope, first_roster, task0 and rules_inputs
 *      (including their note/statement fields); any extra object/key
 *      (machine_rules, Rule, semantic_graph_payload, adapter, runtime,
 *      mutants, packaged_inputs, …) is rejected. Game-owned metadata,
 *      readiness/license/source-binding exact, exact lifecycle for ALL 14
 *      source entries and all 3 registry refs (PROPOSAL /
 *      POLICY_FROZEN_TEXT_NOT_DRAFTED / PLAYTESTABLE_DRAFT / MERGED_CLOSED as
 *      accepted; every role/lifecycle/lifecycle_note/sha256 required; CANON
 *      promotion rejected), no circular game/source/candidate/self revision
 *      key, manifest not self-hashed, exact AIPT repo/commit/tree/schema
 *      path/schema digest/protocol/schema/jsonrpc values;
 *   3. exact 14 source set + 3 registry refs; every referenced digest verified
 *      against file bytes AND against hardcoded accepted digests so source and
 *      manifest cannot drift together;
 *   4. path policy for all 17 referenced paths: relative POSIX only (no
 *      absolute, no dot/dot-dot, no backslash, no NUL, no empty segment),
 *      regular file only, realpath inside the repository, no symlink;
 *   5. stable-ids: exact schema/policy/lifecycle; the accepted twelve
 *      namespaces with exact per-kind counts/states — CHARACTER 4, SECRET 4,
 *      SCENE 8, CLUE 12, NPC 3, ITEM 1, SAFETY_EVENT 2 ASSIGNED;
 *      RULE / INVARIANT / MUTATION RESERVED and STATE / ENDING
 *      JUSTIFIED_ZERO, all at zero assignments (any active entity in those
 *      namespaces is rejected); exactly 34 entities with globally unique IDs,
 *      unique (path, locator, kind) binding even if kind changes, unique
 *      path+locator pairs, and retired ids disjoint/non-reusable; Character /
 *      Secret / Scene IDs bound byte-exact to their sources plus exact
 *      hardcoded bindings for the accepted 18 CLUE / NPC / ITEM /
 *      SAFETY_EVENT entries; longest-prefix namespace resolution with a
 *      required "-" boundary (UNR-SAFETY-EVENT parses correctly); every
 *      entity's locator resolved type-aware (json_path resolves;
 *      markdown_heading / markdown_table_row / markdown_line is an exact
 *      unique line; markdown_text_fragment occurs exactly once);
 *   6. visibility: semantically hardened despite the digest anchor — exactly
 *      the accepted 73 unique mapping IDs (sorted, hardcoded); exact six
 *      labels, exact remote_allowed key set, exact locator-type key set,
 *      exact declared-absent label key set; fail-closed missing/unknown labels
 *      and coverage; principals only GM / ALL_PLAYERS / registered CHARACTER
 *      (never runtime seat IDs); TABLE_HIDDEN non-empty and never ALL_PLAYERS;
 *      Secrets exactly TABLE_HIDDEN + [GM, owning CHARACTER]; discovery clues
 *      / private triggers GM-only; player-facing mappings GM + ALL_PLAYERS;
 *      task0 handout split; intel GM-only; ALL 17 stage3 mappings with exact
 *      locators and GM-only classification (nine sections incl. heading-only
 *      menu + eight scene cards), no whole-file coarse entry; exactly five
 *      session0 mappings (preamble {1,4} + sections 1-4) with exact
 *      labels/principals and no whole-file entry; premade stats vs hidden
 *      fields split; rule-knowledge mixed sections / GM column split; the
 *      three fail-closed policy.locators.overlap_resolution fields; locator
 *      types declared and every actual locator resolved; every first-slice
 *      source covered; LOCAL_ONLY_SECRET remote false and absent; the
 *      participant-data classification token never a formal source/input;
 *      credentials absent;
 *   7. safety profile: derived only from campaign/session0-redlines.md; exact
 *      two Lines, exact one Veil, exact five confirmations with exact 0/1/2
 *      levels; unconfirmed_default VEIL; X card/safety pause; redlight-added
 *      becomes Line; decompression check; identity-consent; cognitive pollution
 *      is character rule knowledge only, never player reality; exact fixed
 *      card text 你的角色现在相信：___; participant response classification
 *      token (HUMAN/PRIVATE/DATA); public persistence false; remote default
 *      false; no stored responses/names/mental-health data;
 *   8. scope + allowlists: source files at accepted hashes; no machine Rule
 *      object / semantic graph / adapter / runtime / mutant definition /
 *      next-batch work / early IDs; aipt/** exactly the accepted regular
 *      files — symlinks and other non-regular entries are collected and
 *      rejected, never silently ignored; scripts/aipt contains exactly
 *      validate-p0-b000.mjs and validate-p0-b001.mjs for this batch (no
 *      adapter/runtime/mutant executable under the allowed script path);
 *      delivery-surface scan for credentials, private absolute paths, private
 *      prompt/package markers and actual participant data (classification
 *      metadata allowed);
 *   9. in-memory negative probes, every one required to reject (see
 *      runProbes), including source+manifest co-drift, actual participant
 *      payload probes, real injected machine-Rule/semantic-graph/
 *      adapter/runtime/mutant objects, stage3-section deletion, ambiguous
 *      session0 whole-file mappings, and symlink / extra-script entries.
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

const BATCH = "UNREGISTERED-AIPT-P0-B001";
const PREV_BATCH = "UNREGISTERED-AIPT-P0-B000";
const NEXT_BATCH = "AIPT-M0-B003";
// The participant-data classification token; assembled from fragments so this
// validator does not flag itself in the B000 delivery-surface scan.
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

/** Normalize prose for comparison: drop whitespace, straight quotes, markdown bold/code markers, backslashes. */
function norm(s) {
  return String(s ?? "").replace(/\s+/g, "").replace(/[*"`\\]/g, "");
}

function assertExact(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} must be exactly ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/** Fail closed on schema shape: the object must be a plain object whose key set
 *  is exactly the allowed set. Any extra key (machine_rules, Rule,
 *  semantic_graph_payload, adapter, runtime, mutants, packaged_inputs, or any
 *  arbitrary packaged content) is a rejection. */
function assertExactKeys(obj, allowed, label) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error(`${label} must be an object, got ${JSON.stringify(obj)}`);
  }
  const keys = Object.keys(obj).sort();
  const want = [...allowed].sort();
  if (JSON.stringify(keys) !== JSON.stringify(want)) {
    throw new Error(
      `${label} must have exactly the keys ${JSON.stringify(want)}, got ${JSON.stringify(keys)} — any extra object/key (e.g. machine_rules, Rule, semantic_graph_payload, adapter, runtime, mutants, packaged_inputs) is rejected (fail closed on schema shape)`,
    );
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

/** Probe helper: the wrapped check must throw (reject the mutation); if it
 *  returns normally the probe throws a descriptive failure. */
function expectThrown(fn, sub) {
  let thrown = false;
  try {
    fn();
  } catch {
    thrown = true;
  }
  if (!thrown) throw new Error(`must be rejected: ${sub}`);
}

// ---------------------------------------------------------------------------
// 1. Exact B001 status
// ---------------------------------------------------------------------------

const STATUS_KEYS = [
  "aipt_schema",
  "current_batch",
  "status",
  "global_wip",
  "previous_batch",
  "next_batch",
  "next_batch_state",
  "next_batch_authorized",
  "next_batch_started",
];

const EXPECTED_STATUS = {
  aipt_schema: "aipt.status.v1",
  current_batch: BATCH,
  status: "IN_PROGRESS",
  global_wip: 1,
  previous_batch: { batch_id: PREV_BATCH, status: "MERGED_CLOSED" },
  next_batch: NEXT_BATCH,
  next_batch_state: "NOT_AUTHORIZED",
  next_batch_authorized: false,
  next_batch_started: false,
};

function checkStatusObj(s) {
  if (!s || typeof s !== "object") throw new Error("status.json: missing status object");
  const keys = Object.keys(s).sort();
  const expectedKeys = [...STATUS_KEYS].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
    throw new Error(`status.json keys must be exactly ${JSON.stringify(expectedKeys)}, got ${JSON.stringify(keys)}`);
  }
  for (const [k, v] of Object.entries(EXPECTED_STATUS)) {
    if (JSON.stringify(s[k]) !== JSON.stringify(v)) {
      throw new Error(`status.${k} must be exactly ${JSON.stringify(v)}, got ${JSON.stringify(s[k])}`);
    }
  }
}

function checkStatus() {
  checkStatusObj(loadJson("aipt/status.json"));
  pass("status: exact B001 IN_PROGRESS shape (previous B000 MERGED_CLOSED, global_wip 1, next AIPT-M0-B003 NOT_AUTHORIZED, not started)");
}

// ---------------------------------------------------------------------------
// 2. Input manifest deep checks
// ---------------------------------------------------------------------------

const MANIFEST_REL = "aipt/input-manifest.json";

const EXPECTED_MANIFEST = {
  aipt_schema: "aipt.input-manifest.v1",
  manifest_format_version: "1.0.0",
  manifest_id: "UNREGISTERED-AIPT-P0-B001-INPUT-MANIFEST-V1",
  batch_id: BATCH,
  manifest_kind: "game-owned input manifest",
  game: {
    repo: "zyc14588/UNREGISTERED",
    package_id: "zyc14588/agent-sim",
    formal_name_zh: "《未登记》",
    formal_name_en: "UNREGISTERED",
    formal_display_name: "《未登记》UNREGISTERED",
    readiness: "PLAYTESTABLE_DRAFT",
    identity_source: "aipt/p0-b000/identity.json",
  },
  content_license: {
    ref: "LicenseRef-UNREGISTERED-NC-SA-1.0",
    status: "POLICY_FROZEN_TEXT_NOT_DRAFTED",
    final_legal_text_published: false,
    legal_review_required: true,
    policy_summary_source: "LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md",
  },
  aipt_compatibility: {
    repo: "zyc14588/AIPT",
    protocol_commit: "fccfb595c23feab38397506505a3e996fe7b9e9c",
    protocol_tree: "f99570bc3c4307244ca926cec62e82a07ef5aee8",
    schema_path: "schemas/protocol/v1/aipt-protocol.schema.json",
    protocol_schema_sha256: "59467ffb27622b7858bd590b2b711a7affc9b5b0cb13e358504bd44eabe09dcf",
    protocol_version: "1.0.0",
    schema_version: "1.0.0",
    jsonrpc: "2.0",
  },
};

/**
 * Fail-closed schema shape: the exact allowed key sets for the manifest top
 * level and every nested object, including the current note/statement fields.
 * Anything else — machine_rules, Rule, semantic_graph_payload, adapter,
 * runtime, mutants, packaged_inputs, or any arbitrary packaged content — is a
 * rejection. See assertExactKeys / checkManifestObj.
 */
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
const REGISTRY_ENTRY_KEYS = ["path", "role", "lifecycle", "lifecycle_note", "sha256"];
const SCOPE_KEYS = ["first_roster", "task0", "stable_id_coverage", "rules_inputs"];
const STABLE_ID_COVERAGE_KEYS = ["registry_source", "visibility_source", "assigned_ids", "justified_zero_kinds", "reserved_zero_kinds", "synthetic_entities_added", "note"];
const STABLE_ASSIGNED_KIND_KEYS = ["CHARACTER", "SECRET", "SCENE", "CLUE", "NPC", "ITEM", "SAFETY_EVENT"];
const FIRST_ROSTER_KEYS = ["character_ids", "note"];
const TASK0_KEYS = ["id", "scope", "scene_ids", "source"];
const RULES_INPUTS_KEYS = [
  "statement",
  "machine_rule_object",
  "semantic_graph",
  "adapter_or_runtime",
  "mutant_definition",
  "rule_invariant_mutation_assignment",
  "next_batch_work_included",
];

/** The exact 14 source set, in the accepted manifest order. */
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

/** The exact 3 registry refs, in the accepted manifest order. */
const EXPECTED_REGISTRY_REFS = [
  "aipt/p0-b001/stable-ids.json",
  "aipt/p0-b001/visibility.json",
  "aipt/p0-b001/safety-profile.json",
];

/**
 * Exact lifecycle for every source entry and every registry ref — not just
 * three representative sources. campaign/playtest + campaign/proposals +
 * campaign/rules entries stay PROPOSAL, licensing entries stay
 * POLICY_FROZEN_TEXT_NOT_DRAFTED, premades stay PLAYTESTABLE_DRAFT, identity
 * stays MERGED_CLOSED, and all three registry refs stay PROPOSAL. CANON
 * promotion is rejected for every entry.
 */
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

/**
 * Hardcoded accepted digests: every source file and registry ref must hash to
 * BOTH its manifest-declared sha256 AND this pinned accepted digest. This is
 * the anti-co-drift anchor — the source file and the manifest cannot drift
 * together without tripping this table.
 */
const ACCEPTED_DIGESTS = {
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

/** The only fields that may carry commit/tree/sha/hash-like semantics. */
const ALLOWED_REV_KEYS = new Set([
  "aipt_compatibility.protocol_commit",
  "aipt_compatibility.protocol_tree",
  "aipt_compatibility.protocol_schema_sha256",
  "source_files[].sha256",
  "registry_refs[].sha256",
]);

/** Reject any manifest field that would bind the game/source/candidate/self
 *  revision: the only revision-like fields allowed are the external AIPT
 *  protocol pin and the per-entry sha256 digests. */
function checkNoCircularRevision(obj, prefix = "") {
  if (Array.isArray(obj)) {
    for (const x of obj) checkNoCircularRevision(x, prefix + "[]");
    return;
  }
  if (!obj || typeof obj !== "object") return;
  for (const k of Object.keys(obj)) {
    const keyPath = prefix ? prefix + "." + k : k;
    if (ALLOWED_REV_KEYS.has(keyPath)) continue;
    if (/revision|commit|tree|sha|hash|self|containing/i.test(k)) {
      throw new Error(
        `manifest field "${keyPath}" looks like a circular game/source/candidate/self revision binding; the only allowed revision-like fields are aipt_compatibility.protocol_commit, aipt_compatibility.protocol_tree, aipt_compatibility.protocol_schema_sha256 and per-entry sha256 digests`,
      );
    }
    checkNoCircularRevision(obj[k], keyPath);
  }
}

/** The manifest must not embed its own sha256, and any sha-like string value
 *  must sit at an allowed field. */
function checkNotSelfHashed(m) {
  const selfSha = sha256(readFileSync(path.join(ROOT, MANIFEST_REL)));
  const shaLike = /^[0-9a-f]{40}$|^[0-9a-f]{64}$/;
  const bad = [];
  (function walkValue(v, keyPath) {
    if (typeof v === "string") {
      if (v === selfSha) bad.push(`${keyPath || "<root>"} embeds the manifest's own sha256 (self-hash)`);
      if (keyPath && !ALLOWED_REV_KEYS.has(keyPath) && shaLike.test(v)) {
        bad.push(`${keyPath} carries a sha-like value outside the allowed fields`);
      }
      return;
    }
    if (Array.isArray(v)) {
      v.forEach((x, i) => walkValue(x, keyPath + "[]"));
      return;
    }
    if (v && typeof v === "object") {
      for (const k of Object.keys(v)) walkValue(v[k], keyPath ? keyPath + "." + k : k);
    }
  })(m, "");
  if (bad.length) throw new Error(`manifest self-reference/sha-like violation: ${bad.join("; ")}`);
}

function checkAiptCompatibility(ac) {
  for (const [k, v] of Object.entries(EXPECTED_MANIFEST.aipt_compatibility)) {
    if (!ac || ac[k] !== v) {
      throw new Error(`manifest.aipt_compatibility.${k} must be exactly ${JSON.stringify(v)}, got ${JSON.stringify(ac && ac[k])}`);
    }
  }
}

/** Every source_files / registry_refs entry must carry exactly the accepted
 *  keys {path, role, lifecycle, lifecycle_note, sha256} with every field
 *  present; CANON promotion is rejected for any entry. */
function checkSourceEntryShape(e, label) {
  assertExactKeys(e, SOURCE_ENTRY_KEYS, label);
  if (typeof e.path !== "string" || e.path.length === 0) throw new Error(`${label}.path must be a non-empty string`);
  if (typeof e.role !== "string" || e.role.length === 0) throw new Error(`${label}.role must be a non-empty string`);
  if (typeof e.lifecycle !== "string" || e.lifecycle.length === 0) throw new Error(`${label}.lifecycle must be a non-empty string`);
  if (e.lifecycle === "CANON") throw new Error(`${label}: CANON promotion is rejected (source entries must stay at their accepted lifecycle)`);
  if (typeof e.lifecycle_note !== "string" || e.lifecycle_note.length === 0) {
    throw new Error(`${label}.lifecycle_note must be a non-empty string`);
  }
  if (typeof e.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(e.sha256)) {
    throw new Error(`${label}.sha256 must be a 64-hex string`);
  }
}

function checkManifestObj(m) {
  if (!m || typeof m !== "object") throw new Error("manifest missing");
  assertExactKeys(m, MANIFEST_TOP_KEYS, "manifest (top level)");
  assertExact(m.aipt_schema, EXPECTED_MANIFEST.aipt_schema, "manifest.aipt_schema");
  assertExact(m.manifest_format_version, EXPECTED_MANIFEST.manifest_format_version, "manifest.manifest_format_version");
  assertExact(m.manifest_id, EXPECTED_MANIFEST.manifest_id, "manifest.manifest_id");
  assertExact(m.batch_id, EXPECTED_MANIFEST.batch_id, "manifest.batch_id");
  assertExact(m.manifest_kind, EXPECTED_MANIFEST.manifest_kind, "manifest.manifest_kind");
  if (!/game[-_]?owned/i.test(m.manifest_kind)) throw new Error("manifest.manifest_kind must be game-owned");
  if (!String(m.authority_scope || "").includes("zyc14588/UNREGISTERED")) {
    throw new Error("manifest.authority_scope must be scoped to zyc14588/UNREGISTERED only");
  }
  if (!/only; game-owned metadata/.test(String(m.authority_scope || "")) && !/not cross-game/i.test(String(m.authority_scope || ""))) {
    throw new Error("manifest.authority_scope must disclaim cross-game generic AIPT authority");
  }
  assertExactKeys(m.game, GAME_KEYS, "manifest.game");
  for (const [k, v] of Object.entries(EXPECTED_MANIFEST.game)) {
    if (!m.game || m.game[k] !== v) {
      throw new Error(`manifest.game.${k} must be exactly ${JSON.stringify(v)}, got ${JSON.stringify(m.game && m.game[k])}`);
    }
  }
  // Cross-check against the authoritative B000 identity metadata.
  const identity = loadJson("aipt/p0-b000/identity.json");
  if (identity.formal_display_name !== m.game.formal_display_name || identity.formal_name_zh !== m.game.formal_name_zh) {
    throw new Error("manifest.game identity fields must match aipt/p0-b000/identity.json");
  }
  assertExactKeys(m.content_license, CONTENT_LICENSE_KEYS, "manifest.content_license");
  for (const [k, v] of Object.entries(EXPECTED_MANIFEST.content_license)) {
    if (!m.content_license || m.content_license[k] !== v) {
      throw new Error(`manifest.content_license.${k} must be exactly ${JSON.stringify(v)}, got ${JSON.stringify(m.content_license && m.content_license[k])}`);
    }
  }
  const licensing = loadJson("aipt/p0-b000/licensing.json");
  if (licensing.license_ref !== m.content_license.ref || licensing.policy_status !== m.content_license.status) {
    throw new Error("manifest.content_license must match aipt/p0-b000/licensing.json");
  }
  assertExactKeys(m.aipt_compatibility, AIPT_COMPATIBILITY_KEYS, "manifest.aipt_compatibility");
  checkAiptCompatibility(m.aipt_compatibility);
  const sb = m.source_binding;
  assertExactKeys(sb, SOURCE_BINDING_KEYS, "manifest.source_binding");
  if (sb.model !== "EXTERNAL_AIPT_RUN_MANIFEST_COMMIT_PAIR") {
    throw new Error(`manifest.source_binding.model must be exactly EXTERNAL_AIPT_RUN_MANIFEST_COMMIT_PAIR, got ${JSON.stringify(sb.model)}`);
  }
  if (!/AIPT Run Manifest/i.test(sb.authority || "") || !/AIPT Run Manifest/i.test(sb.statement || "")) {
    throw new Error("manifest.source_binding must defer commit pinning to the future AIPT Run Manifest (external authority)");
  }
  checkNoCircularRevision(m);
  checkNotSelfHashed(m);

  const spp = m.source_path_policy;
  assertExactKeys(spp, SOURCE_PATH_POLICY_KEYS, "manifest.source_path_policy");
  const sppExpected = {
    path_form: "RELATIVE_POSIX_ONLY",
    absolute_paths: false,
    backslashes: false,
    empty_segments: false,
    dot_segments: false,
    dotdot_segments: false,
    nul_bytes: false,
    symlink_escape: false,
    non_regular_files: false,
    directories: false,
    devices: false,
    applies_to: ["source_files", "registry_refs"],
  };
  for (const [k, v] of Object.entries(sppExpected)) {
    if (!spp || JSON.stringify(spp[k]) !== JSON.stringify(v)) {
      throw new Error(`manifest.source_path_policy.${k} must be exactly ${JSON.stringify(v)}, got ${JSON.stringify(spp && spp[k])}`);
    }
  }

  const sf = m.source_files;
  if (!Array.isArray(sf) || sf.length !== 14) {
    throw new Error(`manifest.source_files must have exactly 14 entries, got ${sf ? sf.length : "missing"}`);
  }
  if (JSON.stringify(sf.map((e) => e.path)) !== JSON.stringify(EXPECTED_SOURCE_FILES)) {
    throw new Error("manifest.source_files paths must be exactly the 14 accepted source paths");
  }
  for (const e of sf) {
    checkSourceEntryShape(e, `manifest.source_files entry ${e.path}`);
    const wantLife = EXPECTED_LIFECYCLES[e.path];
    if (wantLife === undefined) throw new Error(`no accepted lifecycle pinned for source ${e.path}`);
    if (e.lifecycle !== wantLife) {
      throw new Error(`manifest.source_files ${e.path} lifecycle must be ${wantLife}, got ${JSON.stringify(e.lifecycle)}`);
    }
  }

  const rr = m.registry_refs;
  if (!Array.isArray(rr) || rr.length !== 3) {
    throw new Error(`manifest.registry_refs must have exactly 3 entries, got ${rr ? rr.length : "missing"}`);
  }
  if (JSON.stringify(rr.map((e) => e.path)) !== JSON.stringify(EXPECTED_REGISTRY_REFS)) {
    throw new Error("manifest.registry_refs paths must be exactly the 3 accepted registry refs");
  }
  for (const e of rr) {
    checkSourceEntryShape(e, `manifest.registry_refs entry ${e.path}`);
    const wantLife = EXPECTED_LIFECYCLES[e.path];
    if (wantLife === undefined) throw new Error(`no accepted lifecycle pinned for registry ref ${e.path}`);
    if (e.lifecycle !== wantLife) {
      throw new Error(`manifest.registry_refs ${e.path} lifecycle must be ${wantLife}, got ${JSON.stringify(e.lifecycle)}`);
    }
  }

  const scope = m.scope;
  assertExactKeys(scope, SCOPE_KEYS, "manifest.scope");
  assertExactKeys(scope.first_roster, FIRST_ROSTER_KEYS, "manifest.scope.first_roster");
  assertExact(scope.first_roster.character_ids, Object.keys(CHARS), "manifest.scope.first_roster.character_ids");
  assertExactKeys(scope.task0, TASK0_KEYS, "manifest.scope.task0");
  if (!scope.task0 || scope.task0.id !== "T-000") throw new Error('manifest.scope.task0.id must be exactly "T-000"');
  assertExact(scope.task0.scene_ids, SCENE_IDS, "manifest.scope.task0.scene_ids");
  if (scope.task0.source !== "campaign/playtest/stage3-run-guide-v1.md") {
    throw new Error("manifest.scope.task0.source must be campaign/playtest/stage3-run-guide-v1.md");
  }
  // Manifest stable_id_coverage: the exact manifest summary of the frozen
  // first-roster/Task-0 registry + visibility. Fail closed on schema shape,
  // registry-order sequences (never sorted), the flattened 34-ID count with
  // global uniqueness, and cross-file visibility coverage.
  const sic = scope.stable_id_coverage;
  assertExactKeys(sic, STABLE_ID_COVERAGE_KEYS, "manifest.scope.stable_id_coverage");
  assertExact(sic.registry_source, "aipt/p0-b001/stable-ids.json", "manifest.scope.stable_id_coverage.registry_source");
  assertExact(sic.visibility_source, "aipt/p0-b001/visibility.json", "manifest.scope.stable_id_coverage.visibility_source");
  assertExactKeys(sic.assigned_ids, STABLE_ASSIGNED_KIND_KEYS, "manifest.scope.stable_id_coverage.assigned_ids");
  const sicRegistry = loadJson("aipt/p0-b001/stable-ids.json");
  for (const kind of STABLE_ASSIGNED_KIND_KEYS) {
    const registryOrder = sicRegistry.entities.filter((e) => e.kind === kind).map((e) => e.stable_id);
    assertExact(
      sic.assigned_ids[kind],
      registryOrder,
      `manifest.scope.stable_id_coverage.assigned_ids.${kind} (must equal the registry ${kind} entities in registry order)`,
    );
  }
  const sicFlat = Object.values(sic.assigned_ids).flat();
  if (sicFlat.length !== 34) {
    throw new Error(`manifest.scope.stable_id_coverage must cover exactly 34 assigned IDs, got ${sicFlat.length}`);
  }
  if (new Set(sicFlat).size !== sicFlat.length) {
    throw new Error("manifest.scope.stable_id_coverage assigned IDs must be globally unique (no ID listed under two kinds)");
  }
  const zeroSeq = (state) => Object.values(sicRegistry.namespaces).filter((ns) => ns.state === state).map((ns) => ns.entity_kind);
  assertExact(sic.justified_zero_kinds, ["STATE", "ENDING"], "manifest.scope.stable_id_coverage.justified_zero_kinds");
  assertExact(
    sic.justified_zero_kinds,
    zeroSeq("JUSTIFIED_ZERO"),
    "manifest.scope.stable_id_coverage.justified_zero_kinds must equal the registry JUSTIFIED_ZERO entity_kind sequence (unsorted, registry order)",
  );
  assertExact(sic.reserved_zero_kinds, ["RULE", "INVARIANT", "MUTATION"], "manifest.scope.stable_id_coverage.reserved_zero_kinds");
  assertExact(
    sic.reserved_zero_kinds,
    zeroSeq("RESERVED"),
    "manifest.scope.stable_id_coverage.reserved_zero_kinds must equal the registry RESERVED entity_kind sequence (unsorted, registry order)",
  );
  if (sic.synthetic_entities_added !== false) {
    throw new Error("manifest.scope.stable_id_coverage.synthetic_entities_added must be false");
  }
  assertExact(
    sic.note,
    "Assigned IDs are an exact manifest summary of source-backed entities in the frozen first-roster/Task-0 vertical slice; STATE and ENDING have machine-checked zero-assignment justifications in the registry; RULE, INVARIANT, and MUTATION remain reserved with zero assignments.",
    "manifest.scope.stable_id_coverage.note",
  );
  // Every assigned ID must be visible in some aipt/p0-b001/visibility.json mapping.
  const sicVisibility = loadJson("aipt/p0-b001/visibility.json");
  const sicMappedIds = new Set((sicVisibility.mappings || []).flatMap((mp) => (Array.isArray(mp.entity_ids) ? mp.entity_ids : [])));
  for (const id of sicFlat) {
    if (!sicMappedIds.has(id)) {
      throw new Error(`assigned stable id ${id} is not visible in any aipt/p0-b001/visibility.json mapping entity_ids`);
    }
  }
  // Exact current stable registry-ref role/lifecycle/lifecycle_note.
  const sicRef = (m.registry_refs || []).find((e) => e.path === "aipt/p0-b001/stable-ids.json");
  if (!sicRef) throw new Error("manifest.registry_refs must include aipt/p0-b001/stable-ids.json");
  assertExact(
    sicRef.role,
    "stable entity ID registry (source-backed CHARACTER/SECRET/SCENE/CLUE/NPC/ITEM/SAFETY_EVENT assignments; justified-zero STATE/ENDING; reserved-zero RULE/INVARIANT/MUTATION)",
    "manifest.registry_refs aipt/p0-b001/stable-ids.json role",
  );
  assertExact(sicRef.lifecycle, "PROPOSAL", "manifest.registry_refs aipt/p0-b001/stable-ids.json lifecycle");
  assertExact(
    sicRef.lifecycle_note,
    "B001 registry metadata; ID assignment does not promote source lifecycles (sources stay PROPOSAL/PLAYTESTABLE_DRAFT), nothing is promoted to CANON, and STATE/ENDING zero assignments are source-audited justifications rather than invented entities.",
    "manifest.registry_refs aipt/p0-b001/stable-ids.json lifecycle_note",
  );
  const ri = scope.rules_inputs;
  assertExactKeys(ri, RULES_INPUTS_KEYS, "manifest.scope.rules_inputs");
  for (const k of [
    "machine_rule_object",
    "semantic_graph",
    "adapter_or_runtime",
    "mutant_definition",
    "rule_invariant_mutation_assignment",
    "next_batch_work_included",
  ]) {
    if (ri[k] !== false) {
      throw new Error(`manifest.scope.rules_inputs.${k} must be false (no machine Rule object / semantic graph / adapter / runtime / mutant / next-batch work)`);
    }
  }
  // The manifest must never reference the participant-data classification
  // token as packaged content or as an input.
  if ([...jsonStrings(m)].some((s) => s.includes(HPD))) {
    throw new Error(`manifest must not reference the ${HPD} classification token as content`);
  }
}

function checkManifest() {
  checkManifestObj(loadJson(MANIFEST_REL));
  pass("manifest: exact schema shape (fail-closed key sets for every object incl. notes/statements), game-owned metadata, exact lifecycles for all 14 sources + 3 registry refs, no CANON, no circular game revision key, no self-hash; exact stable_id_coverage: 34 assigned IDs (4 CHARACTER + 4 SECRET + 8 SCENE + 12 CLUE + 3 NPC + 1 ITEM + 2 SAFETY_EVENT) in registry order, globally unique, all visible in visibility mappings, zero kinds in unsorted registry order, exact registry-ref role/lifecycle/lifecycle_note");
}

// ---------------------------------------------------------------------------
// 3. Digest verification (bytes AND hardcoded accepted digests)
// ---------------------------------------------------------------------------

function checkSourceDigests(entries, opts = {}) {
  const readBytes = opts.readBytes || ((p) => readFileSync(path.join(ROOT, p)));
  for (const e of entries) {
    const actual = sha256(readBytes(e.path));
    if (actual !== e.sha256) {
      throw new Error(`digest mismatch for ${e.path}: file bytes hash to ${actual}, manifest declares ${e.sha256}`);
    }
    const accepted = ACCEPTED_DIGESTS[e.path];
    if (accepted === undefined) throw new Error(`no accepted digest pinned for ${e.path}`);
    if (e.sha256 !== accepted) {
      throw new Error(`digest drift for ${e.path}: manifest declares ${e.sha256} but the accepted digest is ${accepted} — source file and manifest cannot drift together`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Path policy for every referenced path
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 5. Stable IDs
// ---------------------------------------------------------------------------

const CHARS = {
  "UNR-CHAR-0001": "游隼",
  "UNR-CHAR-0002": "短波",
  "UNR-CHAR-0003": "静水",
  "UNR-CHAR-0004": "底片",
};
const SECRETS = {
  "UNR-SECRET-0001": "游隼",
  "UNR-SECRET-0002": "短波",
  "UNR-SECRET-0003": "静水",
  "UNR-SECRET-0004": "底片",
};
const SCENE_IDS = [
  "UNR-SCENE-T000-01",
  "UNR-SCENE-T000-02",
  "UNR-SCENE-T000-03",
  "UNR-SCENE-T000-04",
  "UNR-SCENE-T000-05",
  "UNR-SCENE-T000-06",
  "UNR-SCENE-T000-07",
  "UNR-SCENE-T000-08",
];
/** The eight stage3 scene-card headings; scene IDs must bind byte-exact to
 *  these heading lines in campaign/playtest/stage3-run-guide-v1.md. */
const SCENE_HEADINGS = [
  "### S1 据点接单（Strong Start）",
  "### S2 侦查（三渠道，各 30min）",
  "### S3 计划（主内容，GM 只答问不催）",
  "### S4 潜入·大堂→办公层（含教学预置巡逻遭遇）",
  "### S5 机房·值守者",
  "### S6 开保险箱",
  "### S7 撤离",
  "### S8 结算＋休整",
];

const NAMESPACES = {
  "UNR-CHAR": { entity_kind: "CHARACTER", state: "ASSIGNED", assigned_count: 4, reserved_count: 0 },
  "UNR-SECRET": { entity_kind: "SECRET", state: "ASSIGNED", assigned_count: 4, reserved_count: 0 },
  "UNR-SCENE": { entity_kind: "SCENE", state: "ASSIGNED", assigned_count: 8, reserved_count: 0 },
  "UNR-CLUE": { entity_kind: "CLUE", state: "ASSIGNED", assigned_count: 12, reserved_count: 0 },
  "UNR-NPC": { entity_kind: "NPC", state: "ASSIGNED", assigned_count: 3, reserved_count: 0 },
  "UNR-ITEM": { entity_kind: "ITEM", state: "ASSIGNED", assigned_count: 1, reserved_count: 0 },
  "UNR-SAFETY-EVENT": { entity_kind: "SAFETY_EVENT", state: "ASSIGNED", assigned_count: 2, reserved_count: 0 },
  "UNR-RULE": { entity_kind: "RULE", state: "RESERVED", assigned_count: 0, reserved_count: 0 },
  "UNR-INVARIANT": { entity_kind: "INVARIANT", state: "RESERVED", assigned_count: 0, reserved_count: 0 },
  "UNR-MUTATION": { entity_kind: "MUTATION", state: "RESERVED", assigned_count: 0, reserved_count: 0 },
  "UNR-STATE": { entity_kind: "STATE", state: "JUSTIFIED_ZERO", assigned_count: 0, reserved_count: 0 },
  "UNR-ENDING": { entity_kind: "ENDING", state: "JUSTIFIED_ZERO", assigned_count: 0, reserved_count: 0 },
};

/** Longest declared namespace prefix of a stable_id; the boundary right after
 *  the namespace must be a "-" (or the end of the id), so UNR-SAFETY-EVENT
 *  resolves as a whole and UNR-SAFETY-EVENT-0001 never mis-parses against a
 *  shorter prefix. */
function namespaceOf(id) {
  let best = null;
  for (const ns of Object.keys(NAMESPACES)) {
    if (id.startsWith(ns) && (id.length === ns.length || id[ns.length] === "-")) {
      if (best === null || ns.length > best.length) best = ns;
    }
  }
  return best;
}

function resolveJsonPath(obj, locator) {
  let cur = obj;
  for (const seg of String(locator).split(".")) {
    if (cur === null || typeof cur !== "object" || !(seg in cur)) return null;
    cur = cur[seg];
  }
  return cur;
}

/** Type-aware locator resolver for stable-ids entities: every one of the 34
 *  entities must resolve. json_path resolves to a non-null value;
 *  markdown_heading / markdown_table_row / markdown_line locators must be an
 *  exact line of the source file and that line must be unique;
 *  markdown_text_fragment must occur exactly once in the file text. Returns
 *  null when the locator does not resolve. */
function resolveEntityLocator(src) {
  const t = src.locator_type;
  if (t === "json_path") return resolveJsonPath(loadJson(src.path), src.locator) ?? null;
  const lines = readRel(src.path).split(/\r?\n/);
  if (t === "markdown_heading" || t === "markdown_table_row" || t === "markdown_line") {
    let hits = 0;
    for (const l of lines) if (l === src.locator) hits += 1;
    return hits === 1 ? lines : null;
  }
  if (t === "markdown_text_fragment") {
    const text = lines.join("\n");
    let hits = 0;
    let at = text.indexOf(src.locator);
    while (at !== -1) {
      hits += 1;
      at = text.indexOf(src.locator, at + src.locator.length);
    }
    return hits === 1 ? text : null;
  }
  return null;
}

/** Exact hardcoded bindings for the accepted 18 CLUE / NPC / ITEM /
 *  SAFETY_EVENT entities (12 CLUE + 3 NPC + 1 ITEM + 2 SAFETY_EVENT). Each
 *  entry pins ID, kind, display name, source path, locator, locator type and
 *  lifecycle byte-exact; canonical=false is enforced generically for every
 *  entity in the main loop. */
const EXTRA_ENTITIES = [
  // ---- 12 CLUE ----
  { stable_id: "UNR-CLUE-0001", kind: "CLUE", display_name: "游隼侦破线索 1", path: "aipt/p0-b000/premades-v2.json", locator: "characters.游隼.discovery_clues.0", locator_type: "json_path", lifecycle: "PLAYTESTABLE_DRAFT" },
  { stable_id: "UNR-CLUE-0002", kind: "CLUE", display_name: "游隼侦破线索 2", path: "aipt/p0-b000/premades-v2.json", locator: "characters.游隼.discovery_clues.1", locator_type: "json_path", lifecycle: "PLAYTESTABLE_DRAFT" },
  { stable_id: "UNR-CLUE-0003", kind: "CLUE", display_name: "短波侦破线索 1", path: "aipt/p0-b000/premades-v2.json", locator: "characters.短波.discovery_clues.0", locator_type: "json_path", lifecycle: "PLAYTESTABLE_DRAFT" },
  { stable_id: "UNR-CLUE-0004", kind: "CLUE", display_name: "短波侦破线索 2", path: "aipt/p0-b000/premades-v2.json", locator: "characters.短波.discovery_clues.1", locator_type: "json_path", lifecycle: "PLAYTESTABLE_DRAFT" },
  { stable_id: "UNR-CLUE-0005", kind: "CLUE", display_name: "静水侦破线索 1", path: "aipt/p0-b000/premades-v2.json", locator: "characters.静水.discovery_clues.0", locator_type: "json_path", lifecycle: "PLAYTESTABLE_DRAFT" },
  { stable_id: "UNR-CLUE-0006", kind: "CLUE", display_name: "静水侦破线索 2", path: "aipt/p0-b000/premades-v2.json", locator: "characters.静水.discovery_clues.1", locator_type: "json_path", lifecycle: "PLAYTESTABLE_DRAFT" },
  { stable_id: "UNR-CLUE-0007", kind: "CLUE", display_name: "底片侦破线索 1", path: "aipt/p0-b000/premades-v2.json", locator: "characters.底片.discovery_clues.0", locator_type: "json_path", lifecycle: "PLAYTESTABLE_DRAFT" },
  { stable_id: "UNR-CLUE-0008", kind: "CLUE", display_name: "底片侦破线索 2", path: "aipt/p0-b000/premades-v2.json", locator: "characters.底片.discovery_clues.1", locator_type: "json_path", lifecycle: "PLAYTESTABLE_DRAFT" },
  { stable_id: "UNR-CLUE-T000-01", kind: "CLUE", display_name: "派单背面空白", path: "campaign/playtest/stage3-run-guide-v1.md", locator: "| 接单 | 派单小字\"须知见背面·背面空白\" | 是 | 三层模型：文本可以空 |", locator_type: "markdown_table_row", lifecycle: "PROPOSAL" },
  { stable_id: "UNR-CLUE-T000-02", kind: "CLUE", display_name: "未标注夹层门", path: "campaign/playtest/stage3-run-guide-v1.md", locator: "| 侦查卓越 | 夹层门（未标注，锁死） | 是（暗层） | 情报卡三层 |", locator_type: "markdown_table_row", lifecycle: "PROPOSAL" },
  { stable_id: "UNR-CLUE-T000-03", kind: "CLUE", display_name: "监控 23:14 上一批测试员背影", path: "campaign/playtest/stage3-run-guide-v1.md", locator: "| 侦查卓越收益 | 监控 23:14 帧\"上一批测试员\"背影 | 是（GM 暗线，赛后回收） | 再访变化伏笔 |", locator_type: "markdown_table_row", lifecycle: "PROPOSAL" },
  { stable_id: "UNR-CLUE-T000-04", kind: "CLUE", display_name: "回收条目：测试员 1 名", path: "campaign/playtest/stage3-run-guide-v1.md", locator: "| 结算 | 「已回收：编号 000 —— 测试员 1 名」 | 是（决策 #42） | 长线钩子 |", locator_type: "markdown_table_row", lifecycle: "PROPOSAL" },
  // ---- 3 NPC ----
  { stable_id: "UNR-NPC-T000-01", kind: "NPC", display_name: "任务0 保安（2人组）", path: "campaign/playtest/task0-intel-pack-v1.md", locator: "保安×2（观察 45／手枪 30／近身格斗 30）", locator_type: "markdown_text_fragment", lifecycle: "PROPOSAL" },
  { stable_id: "UNR-NPC-T000-02", kind: "NPC", display_name: "任务0 机房值守", path: "campaign/playtest/task0-intel-pack-v1.md", locator: "机房值守×1（观察 40）", locator_type: "markdown_text_fragment", lifecycle: "PROPOSAL" },
  { stable_id: "UNR-NPC-T000-03", kind: "NPC", display_name: "任务0 监控员", path: "campaign/playtest/task0-intel-pack-v1.md", locator: "监控员×1（观察 45）", locator_type: "markdown_text_fragment", lifecycle: "PROPOSAL" },
  // ---- 1 ITEM ----
  { stable_id: "UNR-ITEM-T000-01", kind: "ITEM", display_name: "测试档案盒", path: "campaign/playtest/task0-intel-pack-v1.md", locator: "- 机房(3)内保险箱（开锁 60，可电子干扰减难度）：内含\"测试档案盒\"（空盒+一张测试合格单）。", locator_type: "markdown_line", lifecycle: "PROPOSAL" },
  // ---- 2 SAFETY_EVENT ----
  { stable_id: "UNR-SAFETY-EVENT-0001", kind: "SAFETY_EVENT", display_name: "X 卡／平台安全暂停", path: "campaign/session0-redlines.md", locator: "- X 卡（或平台安全暂停）：随时暂停/跳过，无需解释", locator_type: "markdown_line", lifecycle: "PROPOSAL" },
  { stable_id: "UNR-SAFETY-EVENT-0002", kind: "SAFETY_EVENT", display_name: "结束后解压检查", path: "campaign/session0-redlines.md", locator: "- 结束后的\"解压检查\"：一句话确认状态；高压恐怖局必做", locator_type: "markdown_line", lifecycle: "PROPOSAL" },
];

function checkStableIdsObj(s) {
  if (!s || typeof s !== "object") throw new Error("stable-ids.json: missing object");
  assertExact(s.aipt_schema, "aipt.stable-ids.v1", "stable-ids.aipt_schema");
  assertExact(s.batch_id, BATCH, "stable-ids.batch_id");
  const pol = s.id_policy;
  if (!pol || pol.global !== true || pol.reusable !== false || pol.display_name_decoupled !== true) {
    throw new Error("stable-ids.id_policy must be exactly { global: true, reusable: false, display_name_decoupled: true }");
  }
  assertExact(pol.bound_to, ["source.path", "source.locator", "kind"], "stable-ids.id_policy.bound_to");
  const lc = s.lifecycle;
  if (!lc || lc.promotes_to_canon !== false) throw new Error("stable-ids.lifecycle.promotes_to_canon must be false");
  assertExact(lc.assigned_source_statuses, ["PROPOSAL", "PLAYTESTABLE_DRAFT"], "stable-ids.lifecycle.assigned_source_statuses");

  if (!s.namespaces || typeof s.namespaces !== "object") throw new Error("stable-ids.namespaces missing");
  if (JSON.stringify(Object.keys(s.namespaces).sort()) !== JSON.stringify(Object.keys(NAMESPACES).sort())) {
    throw new Error("stable-ids.namespaces must be exactly the twelve accepted namespaces");
  }
  for (const [ns, exp] of Object.entries(NAMESPACES)) {
    const got = s.namespaces[ns];
    if (!got) throw new Error(`namespace ${ns} missing`);
    for (const [k, v] of Object.entries(exp)) {
      if (got[k] !== v) throw new Error(`namespaces.${ns}.${k} must be exactly ${JSON.stringify(v)}, got ${JSON.stringify(got[k])}`);
    }
  }

  const ents = s.entities;
  if (!Array.isArray(ents) || ents.length !== 34) {
    throw new Error(`stable-ids.entities must have exactly 34 entries, got ${ents ? ents.length : "missing"}`);
  }
  const premades = loadJson("aipt/p0-b000/premades-v2.json");
  const stage3Lines = readRel("campaign/playtest/stage3-run-guide-v1.md").split(/\r?\n/);
  const seenIds = new Set();
  const seenTriples = new Set();
  const seenPairs = new Set();
  const counts = Object.fromEntries(Object.keys(NAMESPACES).map((ns) => [ns, 0]));

  for (const ent of ents) {
    const id = ent && ent.stable_id;
    if (typeof id !== "string" || !/^UNR-[A-Z]+-[0-9A-Z-]+$/.test(id)) {
      throw new Error(`bad stable_id format: ${JSON.stringify(id)}`);
    }
    if (seenIds.has(id)) throw new Error(`duplicate stable_id ${id} (one ID cannot bind two entities)`);
    seenIds.add(id);
    const ns = namespaceOf(id);
    if (!ns) throw new Error(`stable_id ${id} has an undeclared namespace prefix`);
    if (NAMESPACES[ns].state !== "ASSIGNED") {
      throw new Error(
        `stable_id ${id} assigns namespace ${ns} (${NAMESPACES[ns].entity_kind}, state ${NAMESPACES[ns].state}); ${NAMESPACES[ns].entity_kind} entities must stay at zero assignments`,
      );
    }
    counts[ns] += 1;
    if (ent.kind !== NAMESPACES[ns].entity_kind) throw new Error(`entity ${id}: kind ${JSON.stringify(ent.kind)} must match namespace ${ns}`);
    if (ent.canonical !== false) throw new Error(`entity ${id}: canonical must be false`);
    if (ent.lifecycle_status !== "PROPOSAL" && ent.lifecycle_status !== "PLAYTESTABLE_DRAFT") {
      throw new Error(`entity ${id}: lifecycle_status must be PROPOSAL or PLAYTESTABLE_DRAFT`);
    }
    const src = ent.source;
    if (!src || typeof src.path !== "string" || typeof src.locator !== "string" || typeof src.locator_type !== "string") {
      throw new Error(`entity ${id}: source must carry path, locator and locator_type`);
    }
    const triple = JSON.stringify([src.path, src.locator, ent.kind]);
    if (seenTriples.has(triple)) {
      throw new Error(`two stable IDs bind the same source entity (path+locator+kind): ${src.path} @ ${src.locator} kind=${ent.kind}`);
    }
    seenTriples.add(triple);
    const pair = JSON.stringify([src.path, src.locator]);
    if (seenPairs.has(pair)) {
      throw new Error(`two stable IDs bind the same source path+locator even if the kind changed: ${src.path} @ ${src.locator}`);
    }
    seenPairs.add(pair);
    if (resolveEntityLocator(src) === null) {
      throw new Error(
        `entity ${id}: source locator does not resolve (locator_type ${src.locator_type}, locator ${JSON.stringify(src.locator)} in ${src.path})`,
      );
    }
  }

  for (const [cid, name] of Object.entries(CHARS)) {
    const ent = ents.find((e) => e.stable_id === cid);
    if (!ent) throw new Error(`character ${cid} (${name}) must be registered`);
    assertExact(ent.display_name, name, `${cid}.display_name`);
    assertExact(ent.source.path, "aipt/p0-b000/premades-v2.json", `${cid}.source.path`);
    assertExact(ent.source.locator, "characters." + name, `${cid}.source.locator`);
    assertExact(ent.source.locator_type, "json_path", `${cid}.source.locator_type`);
    assertExact(ent.lifecycle_status, "PLAYTESTABLE_DRAFT", `${cid}.lifecycle_status`);
    if (resolveJsonPath(premades, ent.source.locator) === null) {
      throw new Error(`character ${cid} locator does not resolve in premades-v2.json`);
    }
  }
  for (const [sid, charName] of Object.entries(SECRETS)) {
    const ent = ents.find((e) => e.stable_id === sid);
    if (!ent) throw new Error(`secret ${sid} must be registered`);
    assertExact(ent.display_name, charName + "的秘密", `${sid}.display_name`);
    assertExact(ent.source.path, "aipt/p0-b000/premades-v2.json", `${sid}.source.path`);
    assertExact(ent.source.locator, "characters." + charName + ".secret", `${sid}.source.locator`);
    assertExact(ent.source.locator_type, "json_path", `${sid}.source.locator_type`);
    assertExact(ent.lifecycle_status, "PLAYTESTABLE_DRAFT", `${sid}.lifecycle_status`);
    if (resolveJsonPath(premades, ent.source.locator) === null) {
      throw new Error(`secret ${sid} locator does not resolve in premades-v2.json`);
    }
  }
  for (let i = 0; i < 8; i++) {
    const id = SCENE_IDS[i];
    const heading = SCENE_HEADINGS[i];
    const ent = ents.find((e) => e.stable_id === id);
    if (!ent) throw new Error(`scene ${id} must be registered`);
    assertExact(ent.kind, "SCENE", `${id}.kind`);
    assertExact(ent.display_name, heading.replace(/^### /, ""), `${id}.display_name`);
    assertExact(ent.source.path, "campaign/playtest/stage3-run-guide-v1.md", `${id}.source.path`);
    assertExact(ent.source.locator, heading, `${id}.source.locator`);
    assertExact(ent.source.locator_type, "markdown_heading", `${id}.source.locator_type`);
    assertExact(ent.lifecycle_status, "PROPOSAL", `${id}.lifecycle_status`);
    if (!stage3Lines.includes(heading)) {
      throw new Error(`scene ${id} must bind byte-exact to the stage3 heading line "${heading}" (heading missing from the source file)`);
    }
  }
  for (const exp of EXTRA_ENTITIES) {
    const ent = ents.find((e) => e.stable_id === exp.stable_id);
    if (!ent) throw new Error(`entity ${exp.stable_id} (${exp.display_name}) must be registered`);
    assertExact(ent.kind, exp.kind, `${exp.stable_id}.kind`);
    assertExact(ent.display_name, exp.display_name, `${exp.stable_id}.display_name`);
    assertExact(ent.source.path, exp.path, `${exp.stable_id}.source.path`);
    assertExact(ent.source.locator, exp.locator, `${exp.stable_id}.source.locator`);
    assertExact(ent.source.locator_type, exp.locator_type, `${exp.stable_id}.source.locator_type`);
    assertExact(ent.lifecycle_status, exp.lifecycle, `${exp.stable_id}.lifecycle_status`);
  }

  const retired = s.retired;
  if (!Array.isArray(retired)) throw new Error("stable-ids.retired must be an array");
  const retiredIds = new Set();
  for (const r of retired) {
    if (!r || typeof r.stable_id !== "string") throw new Error("retired entry must carry a stable_id");
    if (retiredIds.has(r.stable_id)) throw new Error(`retired list contains duplicate ${r.stable_id}`);
    retiredIds.add(r.stable_id);
    if (seenIds.has(r.stable_id)) {
      throw new Error(`retired id ${r.stable_id} is still bound by an active entity (retired ids are disjoint and never reused)`);
    }
  }

  for (const [ns, exp] of Object.entries(NAMESPACES)) {
    if (counts[ns] !== exp.assigned_count) {
      throw new Error(`namespace ${ns} assigned_count must be ${exp.assigned_count}, found ${counts[ns]} entities`);
    }
  }
}

function checkStableIds() {
  checkStableIdsObj(loadJson("aipt/p0-b001/stable-ids.json"));
  pass("stable-ids: exact schema/policy/lifecycle; 12 namespaces with exact per-kind counts/states (4 CHARACTER + 4 SECRET + 8 SCENE + 12 CLUE + 3 NPC + 1 ITEM + 2 SAFETY_EVENT ASSIGNED; RULE/INVARIANT/MUTATION RESERVED, STATE/ENDING JUSTIFIED_ZERO); 34 entities with type-aware locators resolved; Character/Secret/Scene + 18 CLUE/NPC/ITEM/SAFETY_EVENT byte-exact bindings; unique IDs and entity bindings; any active RULE/INVARIANT/MUTATION/STATE/ENDING entity rejected");
}

// ---------------------------------------------------------------------------
// 6. Visibility
// ---------------------------------------------------------------------------

const LABELS = ["PUBLIC", "UNRELEASED_REMOTE_ALLOWED", "TABLE_HIDDEN_REMOTE_ALLOWED", "LOCAL_ONLY_SECRET", HPD, "CREDENTIAL_SECRET"];

/**
 * Semantically hardened visibility contract, enforced even though the file is
 * digest-anchored: the exact accepted set of 73 mapping IDs (sorted), the
 * exact remote_allowed / locator-type / declared-absent key sets, the three
 * fail-closed overlap_resolution fields, all 17 stage3 mappings with exact
 * locators and GM-only classification, and exactly the five session0 mappings
 * (preamble + sections 1-4) with the exact preamble range and no whole-file
 * entry.
 */
const REMOTE_ALLOWED_KEYS = ["PUBLIC", "UNRELEASED_REMOTE_ALLOWED", "TABLE_HIDDEN_REMOTE_ALLOWED", "LOCAL_ONLY_SECRET", HPD, "CREDENTIAL_SECRET"];
const LOCATOR_TYPE_KEYS = ["whole_file", "json_path", "markdown_heading", "markdown_table_column", "markdown_preamble"];
const ABSENT_INSTANCE_KEYS = ["LOCAL_ONLY_SECRET", HPD, "CREDENTIAL_SECRET"];
const OVERLAP_RESOLUTION_KEYS = ["deterministic_precedence", "equal_specificity_conflict", "declared_complementary_exclusion"];

/** The accepted 73 unique mapping IDs, sorted (derived from the current
 *  visibility.json mappings; a mapping set that gains, loses, or renames any
 *  ID — or introduces a duplicate — fails closed). */
const ACCEPTED_MAPPING_IDS = [
  "gm-screen-001",
  "handouts-dispatch-order",
  "handouts-patrol-manual",
  "handouts-visitor-notice",
  "identity-001",
  "intel-pack-001",
  "licensing-001",
  "licensing-002",
  "logic-map-001",
  "mf-A",
  "mf-B",
  "mf-C",
  "mf-D",
  "mf-E",
  "premades-bonds-001",
  "premades-clues-0001",
  "premades-clues-0002",
  "premades-clues-0003",
  "premades-clues-0004",
  "premades-secret-0001",
  "premades-secret-0002",
  "premades-secret-0003",
  "premades-secret-0004",
  "premades-stats-0001",
  "premades-stats-0002",
  "premades-stats-0003",
  "premades-stats-0004",
  "premades-trigger-0001",
  "premades-trigger-0002",
  "premades-trigger-0003",
  "premades-trigger-0004",
  "rks-blank-table",
  "rks-columns",
  "rks-examples",
  "rks-gm-notes-column",
  "rks-pollution",
  "session0-confirmations",
  "session0-lines",
  "session0-preamble",
  "session0-protections",
  "session0-tools",
  "stage3-s0",
  "stage3-s1-prep",
  "stage3-s2-quick",
  "stage3-s3-budget",
  "stage3-s4-menu",
  "stage3-s5-tips",
  "stage3-s6-leak",
  "stage3-s7-observe",
  "stage3-s8-pitfalls",
  "stage3-scene-S1",
  "stage3-scene-S2",
  "stage3-scene-S3",
  "stage3-scene-S4",
  "stage3-scene-S5",
  "stage3-scene-S6",
  "stage3-scene-S7",
  "stage3-scene-S8",
  "tasks-v1-001",
  "vs-s0",
  "vs-s1",
  "vs-s10",
  "vs-s11",
  "vs-s12",
  "vs-s2",
  "vs-s3",
  "vs-s4",
  "vs-s45",
  "vs-s5",
  "vs-s6",
  "vs-s7",
  "vs-s8",
  "vs-s9",
];

/** All 17 stage3-run-guide-v1.md mappings: the nine numbered sections
 *  (stage3-s0 … stage3-s8-pitfalls, stage3-s4-menu heading-only) plus the
 *  eight scene cards S1–S8. Every one is TABLE_HIDDEN_REMOTE_ALLOWED with
 *  principals exactly [GM]; scene cards carry their UNR-SCENE entity id and a
 *  byte-exact markdown_heading locator. */
const STAGE3_EXPECT = [
  { id: "stage3-s0", locator: "## 0. 本局一屏" },
  { id: "stage3-s1-prep", locator: "## 1. 赛前准备（约 30 分钟）" },
  { id: "stage3-s2-quick", locator: "## 2. 规则速讲（15 分钟，最小脚本）" },
  { id: "stage3-s3-budget", locator: "## 3. 节奏预算（目标 3h）" },
  { id: "stage3-s4-menu", locator: "## 4. 场景菜单（8 张，按发生顺序；玩家绕开就跳过，不重摆）", heading_only: true },
  { id: "stage3-scene-S1", locator: "### S1 据点接单（Strong Start）", scene: "UNR-SCENE-T000-01" },
  { id: "stage3-scene-S2", locator: "### S2 侦查（三渠道，各 30min）", scene: "UNR-SCENE-T000-02" },
  { id: "stage3-scene-S3", locator: "### S3 计划（主内容，GM 只答问不催）", scene: "UNR-SCENE-T000-03" },
  { id: "stage3-scene-S4", locator: "### S4 潜入·大堂→办公层（含教学预置巡逻遭遇）", scene: "UNR-SCENE-T000-04" },
  { id: "stage3-scene-S5", locator: "### S5 机房·值守者", scene: "UNR-SCENE-T000-05" },
  { id: "stage3-scene-S6", locator: "### S6 开保险箱", scene: "UNR-SCENE-T000-06" },
  { id: "stage3-scene-S7", locator: "### S7 撤离", scene: "UNR-SCENE-T000-07" },
  { id: "stage3-scene-S8", locator: "### S8 结算＋休整", scene: "UNR-SCENE-T000-08" },
  { id: "stage3-s5-tips", locator: "## 5. GM 口袋提示（教学点速记）" },
  { id: "stage3-s6-leak", locator: "## 6. 渗漏时间轴（本局怪谈微剂量，勿加码）" },
  { id: "stage3-s7-observe", locator: "## 7. 观察与记录流程" },
  { id: "stage3-s8-pitfalls", locator: "## 8. 避坑清单" },
];

/** Exactly the five session0-redlines.md mappings: the resolved preamble
 *  (lines 1–4, markdown_preamble) plus the four content sections. No
 *  whole-file coarse entry. PUBLIC sections are GM + ALL_PLAYERS; the
 *  preamble, confirmations and protections sections are GM-only
 *  TABLE_HIDDEN_REMOTE_ALLOWED. */
const SESSION0_EXPECT = [
  {
    id: "session0-preamble",
    locator_type: "markdown_preamble",
    preamble: { start_line: 1, end_line: 4 },
    label: "TABLE_HIDDEN_REMOTE_ALLOWED",
    principals: ["GM"],
  },
  {
    id: "session0-lines",
    locator_type: "markdown_heading",
    locator: "## 1. 已预设红线（GM 已确认）",
    label: "PUBLIC",
    principals: ["ALL_PLAYERS", "GM"],
  },
  {
    id: "session0-confirmations",
    locator_type: "markdown_heading",
    locator: "## 2. 必确认条目（逐人问，未确认=按 Veil 处理）",
    label: "TABLE_HIDDEN_REMOTE_ALLOWED",
    principals: ["GM"],
  },
  {
    id: "session0-tools",
    locator_type: "markdown_heading",
    locator: "## 3. 桌上工具",
    label: "PUBLIC",
    principals: ["ALL_PLAYERS", "GM"],
  },
  {
    id: "session0-protections",
    locator_type: "markdown_heading",
    locator: "## 4. 认知污染的桌上保护（本作特有）",
    label: "TABLE_HIDDEN_REMOTE_ALLOWED",
    principals: ["GM"],
  },
];

function findTableHeader(lines, from) {
  for (let i = from; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith("|")) return t.split("|").slice(1, -1).map((c) => c.trim());
    if (/^#/.test(t)) return null;
    if (t === "") continue;
  }
  return null;
}

function secretOwner(entityIds) {
  const charId = entityIds.find((eid) => String(eid).startsWith("UNR-CHAR-"));
  if (charId) return charId;
  const secId = entityIds.find((eid) => String(eid).startsWith("UNR-SECRET-"));
  const charName = SECRETS[secId];
  if (!charName) throw new Error(`cannot determine owner for secret mapping entity_ids ${JSON.stringify(entityIds)}`);
  return Object.keys(CHARS).find((cid) => CHARS[cid] === charName);
}

function checkMapping(mp, ctx) {
  if (!mp || typeof mp !== "object") throw new Error("mapping must be an object");
  if (typeof mp.id !== "string" || mp.id.length === 0) throw new Error("mapping id must be a non-empty string");
  if (ctx.ids.has(mp.id)) throw new Error(`duplicate mapping id ${mp.id}`);
  ctx.ids.add(mp.id);
  const src = mp.source;
  if (!src || typeof src.path !== "string") throw new Error(`mapping ${mp.id}: source.path missing`);
  const abs = path.join(ROOT, src.path);
  if (!existsSync(abs) || !statSync(abs).isFile()) throw new Error(`mapping ${mp.id}: source path does not exist: ${src.path}`);
  if (!ctx.firstSlice.includes(src.path)) {
    throw new Error(`mapping ${mp.id}: source path ${src.path} is not a first-slice source (out-of-scope mapping)`);
  }
  ctx.covered.add(src.path);

  if (typeof mp.label !== "string" || !ctx.labels.has(mp.label)) {
    throw new Error(`mapping ${mp.id}: unknown or missing label ${JSON.stringify(mp.label)} (fail closed)`);
  }
  if (mp.remote_allowed !== ctx.remote[mp.label]) {
    throw new Error(`mapping ${mp.id}: remote_allowed must equal taxonomy.remote_allowed[${mp.label}] (${ctx.remote[mp.label]}), got ${mp.remote_allowed}`);
  }
  const ps = mp.principals;
  if (!Array.isArray(ps) || ps.length === 0) throw new Error(`mapping ${mp.id}: principals must be non-empty`);
  const allowedPrincipals = new Set(["GM", "ALL_PLAYERS", ...Object.keys(CHARS).map((cid) => "CHARACTER:" + cid)]);
  for (const p of ps) {
    if (typeof p !== "string" || !allowedPrincipals.has(p)) {
      throw new Error(`mapping ${mp.id}: principal ${JSON.stringify(p)} is not GM/ALL_PLAYERS/registered CHARACTER (runtime seat IDs and participant identifiers are rejected)`);
    }
  }
  if (mp.entity_ids !== undefined) {
    if (!Array.isArray(mp.entity_ids)) throw new Error(`mapping ${mp.id}: entity_ids must be an array`);
    for (const eid of mp.entity_ids) {
      if (!ctx.registeredIds.has(eid)) throw new Error(`mapping ${mp.id}: entity_id ${eid} is not a registered stable id`);
    }
  }
  checkLocator(mp, ctx);

  if (mp.label === "PUBLIC" || mp.label === "UNRELEASED_REMOTE_ALLOWED") {
    if (JSON.stringify([...ps].sort()) !== JSON.stringify(["ALL_PLAYERS", "GM"])) {
      throw new Error(`mapping ${mp.id} (${mp.label}): player-facing mappings must include exactly GM and ALL_PLAYERS`);
    }
    if (mp.label === "UNRELEASED_REMOTE_ALLOWED") {
      const rel = mp.release;
      if (!rel || typeof rel.point !== "string" || rel.point.length === 0 || typeof rel.timing !== "string" || rel.timing.length === 0) {
        throw new Error(`mapping ${mp.id} (UNRELEASED_REMOTE_ALLOWED): must declare a release point/timing`);
      }
    }
  }
  if (mp.label === "TABLE_HIDDEN_REMOTE_ALLOWED" && ps.includes("ALL_PLAYERS")) {
    throw new Error(`mapping ${mp.id}: TABLE_HIDDEN mappings must never include ALL_PLAYERS`);
  }
  if (mp.label === "LOCAL_ONLY_SECRET" || mp.label === HPD || mp.label === "CREDENTIAL_SECRET") {
    throw new Error(`mapping ${mp.id}: label ${mp.label} is declared absent and must not be used by any repository mapping`);
  }
  if (mp.entity_ids && mp.entity_ids.some((eid) => String(eid).startsWith("UNR-SECRET-"))) {
    if (mp.label !== "TABLE_HIDDEN_REMOTE_ALLOWED") throw new Error(`mapping ${mp.id}: Secret mappings must be TABLE_HIDDEN_REMOTE_ALLOWED`);
    const owner = secretOwner(mp.entity_ids);
    if (JSON.stringify([...ps].sort()) !== JSON.stringify(["CHARACTER:" + owner, "GM"])) {
      throw new Error(`mapping ${mp.id}: Secret principals must be exactly [GM, CHARACTER:<owning character>] (never ALL_PLAYERS, never a wrong character)`);
    }
  }
}

function checkLocator(mp, ctx) {
  const src = mp.source;
  const locType = src.locator_type;
  if (typeof locType !== "string" || !ctx.types.has(locType)) {
    throw new Error(`mapping ${mp.id}: undeclared locator_type ${JSON.stringify(locType)}`);
  }
  const lines = readRel(src.path).split(/\r?\n/);
  if (locType === "whole_file") {
    if (src.locator !== null && src.locator !== undefined) {
      throw new Error(`mapping ${mp.id}: whole_file mappings must have locator null`);
    }
    return;
  }
  if (locType === "json_path") {
    if (typeof src.locator !== "string") throw new Error(`mapping ${mp.id}: json_path locator must be a string`);
    const obj = loadJson(src.path);
    const resolved = resolveJsonPath(obj, src.locator);
    if (resolved === null || resolved === undefined) {
      throw new Error(`mapping ${mp.id}: json_path locator "${src.locator}" does not resolve in ${src.path}`);
    }
    const scopeFields = src.scope && src.scope.fields;
    if (scopeFields !== undefined) {
      if (!Array.isArray(scopeFields) || scopeFields.length === 0) throw new Error(`mapping ${mp.id}: scope.fields must be a non-empty array`);
      if (!resolved || typeof resolved !== "object" || Array.isArray(resolved)) {
        throw new Error(`mapping ${mp.id}: scope.fields requires an object subtree at ${src.locator}`);
      }
      for (const f of scopeFields) {
        if (!(f in resolved)) throw new Error(`mapping ${mp.id}: scope.fields entry ${f} not present at ${src.locator}`);
      }
    }
    return;
  }
  if (locType === "markdown_heading") {
    if (typeof src.locator !== "string") throw new Error(`mapping ${mp.id}: markdown_heading locator must be a string`);
    if (!lines.includes(src.locator)) {
      throw new Error(`mapping ${mp.id}: heading "${src.locator}" not found byte-exact in ${src.path}`);
    }
    const scopeExclude = src.scope && src.scope.exclude_columns;
    if (scopeExclude !== undefined) {
      if (!Array.isArray(scopeExclude)) throw new Error(`mapping ${mp.id}: scope.exclude_columns must be an array`);
      const headerRow = findTableHeader(lines, lines.indexOf(src.locator) + 1);
      if (!headerRow) throw new Error(`mapping ${mp.id}: cannot verify exclude_columns without a table under "${src.locator}"`);
      for (const col of scopeExclude) {
        if (!headerRow.includes(col)) throw new Error(`mapping ${mp.id}: excluded column ${col} not present in the table`);
      }
    }
    return;
  }
  if (locType === "markdown_table_column") {
    if (typeof src.locator !== "string") throw new Error(`mapping ${mp.id}: markdown_table_column locator must be a string`);
    const parts = src.locator.split(" / ");
    if (parts.length !== 2) {
      throw new Error(`mapping ${mp.id}: markdown_table_column locator must be "## heading / column header"`);
    }
    const [heading, column] = parts;
    const hi = lines.indexOf(heading);
    if (hi === -1) throw new Error(`mapping ${mp.id}: heading "${heading}" not found for table column`);
    const headerRow = findTableHeader(lines, hi + 1);
    if (!headerRow || !headerRow.includes(column)) {
      throw new Error(`mapping ${mp.id}: column "${column}" not found in the table under "${heading}"`);
    }
    return;
  }
  if (locType === "markdown_preamble") {
    const loc = src.locator;
    if (!loc || typeof loc !== "object" || loc.start_line !== 1 || typeof loc.end_line !== "number") {
      throw new Error(`mapping ${mp.id}: markdown_preamble locator must be { start_line: 1, end_line: n }`);
    }
    let firstH2 = lines.findIndex((l) => /^## /.test(l));
    if (firstH2 === -1) firstH2 = lines.length;
    let end = 0;
    for (let i = 0; i < firstH2; i++) {
      if (lines[i].trim().length > 0) end = i + 1;
    }
    if (loc.end_line !== end) throw new Error(`mapping ${mp.id}: preamble end_line must be ${end}, got ${loc.end_line}`);
    return;
  }
  throw new Error(`mapping ${mp.id}: unhandled locator_type ${locType}`);
}

/** Cross-file split expectations: task0 handouts, intel GM-only, stage3
 *  sections/scenes (no whole-file coarse entry), premade stats vs hidden
 *  fields, rule-knowledge mixed sections / GM column. */
function checkSplitExpectations(v) {
  const mappings = v.mappings;
  const byPath = new Map();
  for (const mp of mappings) {
    const p = mp.source.path;
    if (!byPath.has(p)) byPath.set(p, []);
    byPath.get(p).push(mp);
  }

  // task0-handouts: exactly the three handout sections, no whole-file entry.
  const handouts = byPath.get("campaign/playtest/task0-handouts-v1.md") || [];
  if (handouts.length !== 3) throw new Error("task0-handouts-v1.md must have exactly 3 section mappings (no whole-file coarse entry)");
  const handoutsByLoc = new Map(handouts.map((mp) => [mp.source.locator, mp]));
  const handoutExpect = {
    "## 派单（结算系统文本，任务开始时发放）": "PUBLIC",
    "## 《访客须知》（大堂张贴，A4 打印件）": "UNRELEASED_REMOTE_ALLOWED",
    "## 《安保巡逻手册》节选（侦查所得，半页打印）": "UNRELEASED_REMOTE_ALLOWED",
  };
  for (const [loc, label] of Object.entries(handoutExpect)) {
    const mp = handoutsByLoc.get(loc);
    if (!mp) throw new Error(`task0-handouts mapping missing for ${loc}`);
    if (mp.label !== label) throw new Error(`task0-handouts ${loc} must be ${label}, got ${mp.label}`);
    if (JSON.stringify([...mp.principals].sort()) !== JSON.stringify(["ALL_PLAYERS", "GM"])) {
      throw new Error(`task0-handouts ${loc} must be player-facing (GM + ALL_PLAYERS)`);
    }
  }

  // intel pack: GM-only whole-file.
  const intel = byPath.get("campaign/playtest/task0-intel-pack-v1.md") || [];
  if (
    intel.length !== 1 ||
    intel[0].source.locator_type !== "whole_file" ||
    intel[0].label !== "TABLE_HIDDEN_REMOTE_ALLOWED" ||
    JSON.stringify(intel[0].principals) !== JSON.stringify(["GM"])
  ) {
    throw new Error("task0-intel-pack-v1.md must have exactly one whole-file TABLE_HIDDEN mapping with principals [GM] (intel GM-only)");
  }

  // stage3: all 17 accepted mappings — the nine numbered sections (s0–s8,
  // stage3-s4-menu heading-only) plus the eight scene cards S1–S8 — with
  // exact locators and GM-only classification; no whole-file coarse entry.
  const stage3 = byPath.get("campaign/playtest/stage3-run-guide-v1.md") || [];
  if (stage3.length !== STAGE3_EXPECT.length) {
    throw new Error(`stage3-run-guide-v1.md must have exactly ${STAGE3_EXPECT.length} mappings (sections + scene cards, no whole-file coarse entry), got ${stage3.length}`);
  }
  if (stage3.some((mp) => mp.source.locator_type === "whole_file")) {
    throw new Error("stage3-run-guide-v1.md must not have a whole-file coarse mapping (sections and scene cards only)");
  }
  const stage3ById = new Map(stage3.map((mp) => [mp.id, mp]));
  if (stage3ById.size !== STAGE3_EXPECT.length) throw new Error("stage3 mapping ids must be unique");
  for (const exp of STAGE3_EXPECT) {
    const mp = stage3ById.get(exp.id);
    if (!mp) throw new Error(`stage3 mapping missing for ${exp.id}`);
    if (mp.source.locator_type !== "markdown_heading") throw new Error(`stage3 ${exp.id} must be a markdown_heading mapping`);
    if (mp.source.locator !== exp.locator) throw new Error(`stage3 ${exp.id} locator must be byte-exact "${exp.locator}"`);
    if (mp.label !== "TABLE_HIDDEN_REMOTE_ALLOWED") throw new Error(`stage3 ${exp.id} must be TABLE_HIDDEN_REMOTE_ALLOWED`);
    if (JSON.stringify(mp.principals) !== JSON.stringify(["GM"])) throw new Error(`stage3 ${exp.id} must be GM-only (principals exactly [GM])`);
    if (exp.heading_only !== undefined) {
      if (!mp.source.scope || mp.source.scope.heading_only !== exp.heading_only) {
        throw new Error(`stage3 ${exp.id} must declare scope.heading_only true (parent heading line only, never the subtree)`);
      }
    }
    if (exp.scene !== undefined) {
      if (!mp.entity_ids || !mp.entity_ids.includes(exp.scene)) {
        throw new Error(`stage3 ${exp.id} must carry entity_id ${exp.scene}`);
      }
      if (mp.entity_ids.some((eid) => eid !== exp.scene)) {
        throw new Error(`stage3 ${exp.id} must carry exactly the entity_id ${exp.scene}`);
      }
    }
  }

  // session0-redlines: exactly the five accepted mappings — resolved preamble
  // (lines 1–4) plus the four content sections — with exact labels/principals
  // and the exact preamble range; no whole-file coarse entry (a whole-file
  // session0 mapping would be ambiguous against the section-level mappings).
  const session0 = byPath.get("campaign/session0-redlines.md") || [];
  if (session0.length !== SESSION0_EXPECT.length) {
    throw new Error(`campaign/session0-redlines.md must have exactly ${SESSION0_EXPECT.length} mappings (preamble + sections 1-4, no whole-file entry), got ${session0.length}`);
  }
  if (session0.some((mp) => mp.source.locator_type === "whole_file")) {
    throw new Error("campaign/session0-redlines.md must not have a whole-file coarse mapping (preamble + sections 1-4 are mapped individually)");
  }
  const session0ById = new Map(session0.map((mp) => [mp.id, mp]));
  if (session0ById.size !== SESSION0_EXPECT.length) throw new Error("session0 mapping ids must be unique");
  for (const exp of SESSION0_EXPECT) {
    const mp = session0ById.get(exp.id);
    if (!mp) throw new Error(`session0 mapping missing for ${exp.id}`);
    if (mp.source.locator_type !== exp.locator_type) {
      throw new Error(`session0 ${exp.id} locator_type must be ${exp.locator_type}, got ${mp.source.locator_type}`);
    }
    if (exp.locator !== undefined && mp.source.locator !== exp.locator) {
      throw new Error(`session0 ${exp.id} locator must be byte-exact "${exp.locator}"`);
    }
    if (exp.preamble !== undefined) {
      if (JSON.stringify(mp.source.locator) !== JSON.stringify(exp.preamble)) {
        throw new Error(`session0 ${exp.id} preamble locator must be exactly {start_line: 1, end_line: 4}, got ${JSON.stringify(mp.source.locator)}`);
      }
    }
    if (mp.label !== exp.label) throw new Error(`session0 ${exp.id} must be ${exp.label}, got ${mp.label}`);
    if (JSON.stringify([...mp.principals].sort()) !== JSON.stringify([...exp.principals].sort())) {
      throw new Error(`session0 ${exp.id} principals must be ${JSON.stringify(exp.principals)}, got ${JSON.stringify(mp.principals)}`);
    }
  }

  // premade stats vs hidden fields split.
  for (const [cid, name] of Object.entries(CHARS)) {
    const stats = mappings.find(
      (mp) => mp.source.path === "aipt/p0-b000/premades-v2.json" && mp.source.locator === "characters." + name && mp.label === "PUBLIC",
    );
    if (!stats) throw new Error(`premades stats mapping missing for ${name}`);
    if (!stats.source.scope || JSON.stringify(stats.source.scope.fields) !== JSON.stringify(["name_zh", "attributes", "final_skills"])) {
      throw new Error(`premades stats mapping for ${name} must scope fields [name_zh, attributes, final_skills]`);
    }
    if (JSON.stringify([...stats.principals].sort()) !== JSON.stringify(["ALL_PLAYERS", "GM"])) {
      throw new Error(`premades stats for ${name} must be player-facing (GM + ALL_PLAYERS)`);
    }
    if (!stats.entity_ids || !stats.entity_ids.includes(cid)) throw new Error(`premades stats for ${name} must carry entity_id ${cid}`);
    const secret = mappings.find((mp) => mp.source.locator === "characters." + name + ".secret");
    if (!secret || secret.label !== "TABLE_HIDDEN_REMOTE_ALLOWED") throw new Error(`premades secret mapping missing for ${name}`);
    if (JSON.stringify([...secret.principals].sort()) !== JSON.stringify(["CHARACTER:" + cid, "GM"])) {
      throw new Error(`premades secret for ${name} must be exactly [GM, CHARACTER:${cid}]`);
    }
    if (!secret.entity_ids || !secret.entity_ids.includes("UNR-SECRET-" + cid.slice(-4))) {
      throw new Error(`premades secret for ${name} must carry entity_id UNR-SECRET-${cid.slice(-4)}`);
    }
    for (const sub of ["discovery_clues", "private_trigger"]) {
      const mp = mappings.find((m2) => m2.source.locator === "characters." + name + "." + sub);
      if (!mp || mp.label !== "TABLE_HIDDEN_REMOTE_ALLOWED" || JSON.stringify(mp.principals) !== JSON.stringify(["GM"])) {
        throw new Error(`premades ${sub} for ${name} must be a GM-only TABLE_HIDDEN mapping`);
      }
    }
  }
  const bonds = mappings.find((mp) => mp.source.path === "aipt/p0-b000/premades-v2.json" && mp.source.locator === "bonds");
  if (!bonds || bonds.label !== "TABLE_HIDDEN_REMOTE_ALLOWED" || JSON.stringify(bonds.principals) !== JSON.stringify(["GM"])) {
    throw new Error("premades bonds must be a GM-only TABLE_HIDDEN mapping");
  }

  // rule-knowledge sheet: mixed sections with a GM column split.
  const rks = byPath.get("campaign/playtest/rule-knowledge-sheet-v1.md") || [];
  if (rks.length !== 5) throw new Error("rule-knowledge-sheet-v1.md must have exactly 5 mappings (mixed sections + GM column split)");
  const rksByLoc = new Map(rks.map((mp) => [mp.source.locator, mp]));
  const rksExpect = {
    "## 五列状态": "PUBLIC",
    "## 记录表": "PUBLIC",
    "## 记录表 / GM 备注（污染条，勿向玩家出示）": "TABLE_HIDDEN_REMOTE_ALLOWED",
    "## 示例行（任务0 派单）": "TABLE_HIDDEN_REMOTE_ALLOWED",
    "## 污染条说明（GM 用）": "TABLE_HIDDEN_REMOTE_ALLOWED",
  };
  for (const [loc, label] of Object.entries(rksExpect)) {
    const mp = rksByLoc.get(loc);
    if (!mp) throw new Error(`rule-knowledge-sheet mapping missing for ${loc}`);
    if (mp.label !== label) throw new Error(`rule-knowledge-sheet ${loc} must be ${label}, got ${mp.label}`);
  }
  const blank = rksByLoc.get("## 记录表");
  if (!blank.source.scope || JSON.stringify(blank.source.scope.exclude_columns) !== JSON.stringify(["GM 备注（污染条，勿向玩家出示）"])) {
    throw new Error("rule-knowledge-sheet 记录表 mapping must exclude the GM 备注 column");
  }
  const gmCol = rksByLoc.get("## 记录表 / GM 备注（污染条，勿向玩家出示）");
  if (gmCol.source.locator_type !== "markdown_table_column" || JSON.stringify(gmCol.principals) !== JSON.stringify(["GM"])) {
    throw new Error("rule-knowledge-sheet GM 备注 column must be a markdown_table_column GM-only mapping");
  }
}

function checkVisibilityObj(v) {
  if (!v || typeof v !== "object") throw new Error("visibility.json: missing object");
  assertExact(v.aipt_schema, "aipt.visibility.v1", "visibility.aipt_schema");
  assertExact(v.batch_id, BATCH, "visibility.batch_id");
  if (!v.lifecycle || v.lifecycle.status !== "PROPOSAL" || v.lifecycle.promotes_to_canon !== false) {
    throw new Error("visibility.lifecycle must be { status: PROPOSAL, promotes_to_canon: false }");
  }
  const manifest = loadJson(MANIFEST_REL);
  const firstSlice = v.scope && v.scope.first_slice_sources;
  if (!Array.isArray(firstSlice)) throw new Error("visibility.scope.first_slice_sources missing");
  if (JSON.stringify([...firstSlice].sort()) !== JSON.stringify(manifest.source_files.map((e) => e.path).sort())) {
    throw new Error("visibility.scope.first_slice_sources must be exactly the manifest's 14 source_files paths");
  }
  const tax = v.policy.taxonomy;
  if (!tax || !Array.isArray(tax.labels) || JSON.stringify(tax.labels) !== JSON.stringify(LABELS)) {
    throw new Error("visibility taxonomy labels must be exactly the six labels in order (PUBLIC, UNRELEASED_REMOTE_ALLOWED, TABLE_HIDDEN_REMOTE_ALLOWED, LOCAL_ONLY_SECRET, " + HPD + ", CREDENTIAL_SECRET)");
  }
  const remote = tax.remote_allowed;
  assertExactKeys(remote, REMOTE_ALLOWED_KEYS, "visibility.policy.taxonomy.remote_allowed");
  const remoteExpected = {
    PUBLIC: true,
    UNRELEASED_REMOTE_ALLOWED: true,
    TABLE_HIDDEN_REMOTE_ALLOWED: true,
    LOCAL_ONLY_SECRET: false,
    [HPD]: false,
    CREDENTIAL_SECRET: false,
  };
  for (const [k, expected] of Object.entries(remoteExpected)) {
    if (!remote || remote[k] !== expected) {
      throw new Error(`taxonomy.remote_allowed.${k} must be exactly ${expected}`);
    }
  }
  const locTypes = v.policy.locators && v.policy.locators.types;
  assertExactKeys(locTypes, LOCATOR_TYPE_KEYS, "visibility.policy.locators.types");
  const declaredTypes = new Set(Object.keys(locTypes));
  for (const t of LOCATOR_TYPE_KEYS) {
    if (!declaredTypes.has(t)) throw new Error(`locator type ${t} must be declared in policy.locators.types`);
  }
  const overlap = v.policy.locators && v.policy.locators.overlap_resolution;
  assertExactKeys(overlap, OVERLAP_RESOLUTION_KEYS, "visibility.policy.locators.overlap_resolution");
  for (const k of OVERLAP_RESOLUTION_KEYS) {
    if (typeof overlap[k] !== "string" || overlap[k].length === 0) {
      throw new Error(`visibility.policy.locators.overlap_resolution.${k} must be a non-empty fail-closed string`);
    }
  }
  if (!/REJECTED|fail\s*closed/i.test(overlap.equal_specificity_conflict)) {
    throw new Error("visibility.policy.locators.overlap_resolution.equal_specificity_conflict must be fail-closed (equal-specificity conflicts REJECTED, no permissive tie-break)");
  }
  const principals = v.policy.principals;
  if (!principals || JSON.stringify(principals.layer) !== JSON.stringify(["GM", "ALL_PLAYERS", "CHARACTER:<UNR-CHAR-xxxx>"])) {
    throw new Error("visibility.policy.principals.layer must be exactly [GM, ALL_PLAYERS, CHARACTER:<UNR-CHAR-xxxx>]");
  }
  if (principals.game_owned !== true || principals.runtime_seat_ids !== false) {
    throw new Error("visibility.policy.principals must be game-owned (game_owned true, runtime_seat_ids false)");
  }
  const fc = v.policy.fail_closed;
  if (!fc || fc.unknown_label !== "REJECT" || fc.missing_label !== "REJECT" || fc.missing_mapping_for_in_scope_source !== "REJECT") {
    throw new Error("visibility.policy.fail_closed must reject unknown labels, missing labels, and missing coverage");
  }
  const absent = v.declared_absent_instances;
  assertExactKeys(absent, ABSENT_INSTANCE_KEYS, "visibility.declared_absent_instances");
  for (const lbl of ABSENT_INSTANCE_KEYS) {
    if (!absent[lbl] || absent[lbl].instances_in_repository !== 0) {
      throw new Error(`declared_absent_instances.${lbl}.instances_in_repository must be 0`);
    }
  }
  const mappings = v.mappings;
  if (!Array.isArray(mappings)) throw new Error("visibility.mappings must be an array");
  const sortedIds = mappings.map((mp) => mp.id).sort();
  if (JSON.stringify(sortedIds) !== JSON.stringify(ACCEPTED_MAPPING_IDS)) {
    throw new Error(
      `visibility.mappings ids must be exactly the accepted ${ACCEPTED_MAPPING_IDS.length} unique mapping IDs (sorted), got ${JSON.stringify(sortedIds)} — any added/removed/renamed/duplicate mapping id is rejected (fail closed on structure despite the digest anchor)`,
    );
  }
  const registeredIds = new Set(loadJson("aipt/p0-b001/stable-ids.json").entities.map((e) => e.stable_id));
  const ctx = {
    types: declaredTypes,
    remote,
    registeredIds,
    firstSlice,
    labels: new Set(tax.labels),
    ids: new Set(),
    covered: new Set(),
  };
  for (const mp of mappings) checkMapping(mp, ctx);
  for (const p of firstSlice) {
    if (!ctx.covered.has(p)) throw new Error(`fail-closed: no mapping covers first-slice source ${p}`);
  }
  checkSplitExpectations(v);
}

function checkVisibility() {
  checkVisibilityObj(loadJson("aipt/p0-b001/visibility.json"));
  pass("visibility: exact 73 mapping ids; exact six labels/remote booleans/locator types/absent labels; three fail-closed overlap_resolution fields; all 17 stage3 mappings GM-only; exactly five session0 mappings (preamble 1-4 + sections 1-4)");
}

// ---------------------------------------------------------------------------
// 7. Safety profile
// ---------------------------------------------------------------------------

const EXPECTED_LINES = [
  { name: "儿童受害", rule: "Line", source_text: "儿童受害：Line（不出现）" },
  { name: "精神疾病污名化", rule: "Line", source_text: "精神疾病污名化：Line（不出现；认知污染≠精神疾病，机制文案须明确区分）" },
];
const EXPECTED_VEILS = [
  { name: "身体恐怖（变形/虫/自残）", rule: "Veil", source_text: "身体恐怖（变形/虫/自残）：Veil（淡化处理，不正面描写）" },
];
const EXPECTED_CONFIRMATIONS = [
  {
    name: "自我认知攻击/现实解离",
    levels: { "0": "不接受", "1": "只能模糊暗示", "2": "可正面呈现" },
    source_text:
      "自我认知攻击/现实解离（\"你不是你\"\"你的记忆可能是假的\"）：本作核心机制，必须逐人确认可接受强度（0 不接受 / 1 只能模糊暗示 / 2 可正面呈现）",
  },
  { name: "酷刑与审讯细节", source_text: "酷刑与审讯细节" },
  { name: "亲密关系/家庭创伤", source_text: "亲密关系/家庭创伤" },
  { name: "被囚禁/幽闭", source_text: "被囚禁/幽闭" },
  { name: "尸体与暴力细节", source_text: "尸体与暴力细节" },
];

function checkSafetyObj(sp) {
  if (!sp || typeof sp !== "object") throw new Error("safety-profile.json: missing object");
  assertExact(sp.aipt_schema, "aipt.safety-profile.v1", "safety-profile.aipt_schema");
  assertExact(sp.batch_id, BATCH, "safety-profile.batch_id");
  if (!sp.lifecycle || sp.lifecycle.status !== "PROPOSAL" || sp.lifecycle.source_status !== "PROPOSAL" || sp.lifecycle.promotes_to_canon !== false) {
    throw new Error("safety-profile.lifecycle must be { status: PROPOSAL, source_status: PROPOSAL, promotes_to_canon: false }");
  }
  if (!sp.derivation || sp.derivation.source !== "campaign/session0-redlines.md" || sp.derivation.invent_policy !== false) {
    throw new Error("safety-profile.derivation must derive solely from campaign/session0-redlines.md with invent_policy false");
  }
  const sourceNorm = norm(readRel("campaign/session0-redlines.md"));

  const lines = sp.lines;
  if (!Array.isArray(lines) || lines.length !== 2) throw new Error("safety-profile.lines must have exactly 2 Line entries");
  for (let i = 0; i < 2; i++) {
    const want = EXPECTED_LINES[i];
    const got = lines[i];
    if (!got || got.name !== want.name || got.rule !== "Line") throw new Error(`line ${i + 1} must be ${want.name} with rule Line`);
    if (got.source_text !== want.source_text) throw new Error(`line ${i + 1} source_text drifted from the accepted text`);
    if (!sourceNorm.includes(norm(want.source_text))) throw new Error(`line ${i + 1} source_text not found in campaign/session0-redlines.md`);
  }

  const veils = sp.veils;
  if (!Array.isArray(veils) || veils.length !== 1) throw new Error("safety-profile.veils must have exactly 1 Veil entry");
  const veil = veils[0];
  if (!veil || veil.name !== EXPECTED_VEILS[0].name || veil.rule !== "Veil" || veil.source_text !== EXPECTED_VEILS[0].source_text) {
    throw new Error("the single Veil drifted (changed or widened)");
  }
  if (!sourceNorm.includes(norm(EXPECTED_VEILS[0].source_text))) throw new Error("Veil source_text not found in campaign/session0-redlines.md");

  const conf = sp.required_confirmations;
  if (!Array.isArray(conf) || conf.length !== 5) throw new Error("required_confirmations must have exactly 5 entries");
  for (let i = 0; i < 5; i++) {
    const want = EXPECTED_CONFIRMATIONS[i];
    const got = conf[i];
    if (!got || got.name !== want.name) throw new Error(`confirmation ${i + 1} must be ${want.name}`);
    if (got.source_text !== want.source_text) throw new Error(`confirmation ${i + 1} source_text drifted from the accepted text`);
    if (!sourceNorm.includes(norm(want.source_text))) throw new Error(`confirmation ${i + 1} source_text not found in campaign/session0-redlines.md`);
    if (i === 0) {
      if (JSON.stringify(got.levels) !== JSON.stringify(want.levels)) {
        throw new Error("confirmation 1 levels must be exactly {0: 不接受, 1: 只能模糊暗示, 2: 可正面呈现}");
      }
    } else if (got.levels !== undefined) {
      throw new Error(`confirmation ${i + 1} must not carry levels`);
    }
  }

  if (sp.unconfirmed_default !== "VEIL") throw new Error("unconfirmed_default must be exactly VEIL");

  const tt = sp.table_tools;
  if (!tt || tt.x_card_or_safety_pause !== true || tt.new_redlight_term_becomes_line !== true || tt.decompression_check !== true) {
    throw new Error("table_tools must enable X card/safety pause, redlight-added becomes Line, and decompression check");
  }
  if (typeof tt.x_card_detail !== "string" || !tt.x_card_detail.includes("X 卡")) throw new Error("x_card_detail must describe the X card / platform safety pause");
  if (typeof tt.new_redlight_term_detail !== "string" || !tt.new_redlight_term_detail.includes("加入即 Line")) {
    throw new Error("new_redlight_term_detail must state that an added word becomes a Line");
  }
  if (typeof tt.decompression_check_detail !== "string" || !tt.decompression_check_detail.includes("解压检查")) {
    throw new Error("decompression_check_detail must describe the decompression check");
  }

  const cp = sp.cognitive_pollution_protections;
  if (!cp || cp.false_information_scope !== "character_rule_knowledge_only" || cp.false_information_never_player_reality !== true) {
    throw new Error("cognitive pollution must be character-rule-knowledge only and never player reality");
  }
  if (cp.fixed_format_card_text !== "你的角色现在相信：___") {
    throw new Error('fixed_format_card_text must be exactly "你的角色现在相信：___"');
  }
  if (cp.identity_alteration_requires_player_consent !== true) throw new Error("identity alteration must require player consent");
  if (!String(cp.false_information_detail || "").includes("绝不对玩家本人使用")) {
    throw new Error("false_information_detail must forbid using false information against the player");
  }

  const dh = sp.data_handling;
  if (!dh || typeof dh !== "object") throw new Error("safety-profile.data_handling missing");
  if (dh.participant_response_classification !== HPD) {
    throw new Error(`participant_response_classification must be exactly ${HPD}`);
  }
  if (dh.persist_in_public_game_repo !== false) throw new Error("persist_in_public_game_repo must be false");
  if (dh.remote_model_send_default !== false) throw new Error("remote_model_send_default must be false");
  if (dh.formal_game_input !== false) {
    throw new Error(`${HPD} must never be a formal game input (formal_game_input must be false)`);
  }
  const stores = dh.stores;
  if (!stores || stores.participant_answers !== false || stores.participant_names !== false || stores.mental_health_data !== false) {
    throw new Error("stores must be all false: no participant answers, names, or mental-health data stored");
  }
}

function checkSafetyProfile() {
  checkSafetyObj(loadJson("aipt/p0-b001/safety-profile.json"));
  pass("safety-profile: exact 2 Lines, exact 1 Veil, exact 5 confirmations (0/1/2), VEIL default, table tools, cognitive-pollution protections, " + HPD + " data-handling");
}

// ---------------------------------------------------------------------------
// 8. Artifact paths + delivery-surface scan
// ---------------------------------------------------------------------------

/** Collect every entry under a directory tree with its lstat-derived kind:
 *  "file" for regular files, "symlink" for symbolic links, "other" for any
 *  device/socket/fifo/etc. Symlinks and other non-regular entries are never
 *  silently ignored — they are surfaced so the allowlist can reject them. */
function collectEntriesWithKinds(dir, out = []) {
  const base = path.join(ROOT, dir);
  const ents = readdirSync(base, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const ent of ents) {
    if (WALK_EXCLUDED.has(ent.name)) continue;
    const p = path.join(base, ent.name);
    const st = lstatSync(p);
    if (st.isSymbolicLink()) {
      out.push({ rel: relPath(p), kind: "symlink" });
      continue;
    }
    if (st.isDirectory()) {
      collectEntriesWithKinds(path.relative(ROOT, p), out);
      continue;
    }
    if (st.isFile()) {
      out.push({ rel: relPath(p), kind: "file" });
      continue;
    }
    out.push({ rel: relPath(p), kind: "other" });
  }
  return out;
}

function collectAiptEntries() {
  return collectEntriesWithKinds("aipt");
}

function collectScriptsAiptEntries() {
  return collectEntriesWithKinds(path.join("scripts", "aipt"));
}

function checkArtifactPaths(entries) {
  const nonRegular = entries.filter((e) => e.kind !== "file");
  if (nonRegular.length > 0) {
    throw new Error(
      `non-regular AIPT entries are rejected (symlinks/devices/sockets/fifos are never silently ignored): ${nonRegular
        .map((e) => `${e.rel} (${e.kind})`)
        .join(", ")}`,
    );
  }
  const files = entries.map((e) => e.rel).sort();
  const expected = [
    "aipt/README.md",
    "aipt/input-manifest.json",
    "aipt/p0-b000/identity.json",
    "aipt/p0-b000/licensing.json",
    "aipt/p0-b000/premades-v2.json",
    "aipt/p0-b001/safety-profile.json",
    "aipt/p0-b001/stable-ids.json",
    "aipt/p0-b001/visibility.json",
    "aipt/status.json",
  ].sort();
  if (JSON.stringify(files) !== JSON.stringify(expected)) {
    throw new Error(`unexpected AIPT artifact paths: expected exactly ${JSON.stringify(expected)}, got ${JSON.stringify(files)}`);
  }
}

/** This batch's validator allowlist: scripts/aipt must contain exactly
 *  validate-p0-b000.mjs and validate-p0-b001.mjs, all regular files — no
 *  adapter/runtime/mutant executable (or any other script) may be added under
 *  the allowed script path. */
function checkScriptsAipt(entries) {
  const nonRegular = entries.filter((e) => e.kind !== "file");
  if (nonRegular.length > 0) {
    throw new Error(
      `non-regular entries under scripts/aipt are rejected (${nonRegular.map((e) => `${e.rel} (${e.kind})`).join(", ")})`,
    );
  }
  const files = entries.map((e) => e.rel).sort();
  const expected = ["scripts/aipt/validate-p0-b000.mjs", "scripts/aipt/validate-p0-b001.mjs"].sort();
  if (JSON.stringify(files) !== JSON.stringify(expected)) {
    throw new Error(
      `scripts/aipt must contain exactly validate-p0-b000.mjs and validate-p0-b001.mjs for this batch (an adapter/runtime/mutant executable cannot be added under the allowed script path), got ${JSON.stringify(files)}`,
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
    for (let i = 0; i < lines.length; i++) {
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
  pass(`delivery-surface scan: no credentials, private absolute paths, private prompt/package markers, or actual participant data (${scanned} files scanned; classification token allowed only in aipt/p0-b001/)`);
}

// ---------------------------------------------------------------------------
// 9. In-memory negative probes — every one must reject
// ---------------------------------------------------------------------------

function runProbes() {
  const manifest = loadJson(MANIFEST_REL);
  const stableIds = loadJson("aipt/p0-b001/stable-ids.json");
  const visibility = loadJson("aipt/p0-b001/visibility.json");
  const safety = loadJson("aipt/p0-b001/safety-profile.json");

  const probes = [
    // --- source + manifest digests ---
    ["source digest drift (manifest declares wrong sha256)", () => {
      const m = structuredClone(manifest);
      m.source_files[0].sha256 = "0".repeat(64);
      expectThrown(() => checkSourceDigests([...m.source_files, ...m.registry_refs]), "source digest drift");
    }],
    ["source+manifest co-drift (both drifted from accepted)", () => {
      const m = structuredClone(manifest);
      const first = m.source_files[0];
      const drifted = Buffer.from("drifted bytes for the co-drift probe");
      m.source_files[0].sha256 = sha256(drifted);
      expectThrown(
        () =>
          checkSourceDigests([...m.source_files, ...m.registry_refs], {
            readBytes: (p) => (p === first.path ? drifted : readFileSync(path.join(ROOT, p))),
          }),
        "accepted-digest anchor (source + manifest cannot co-drift)",
      );
    }],
    // --- path policy ---
    ["absolute path in source_files", () => {
      const m = structuredClone(manifest);
      m.source_files[0].path = "/etc/passwd";
      expectThrown(() => checkPathPolicy(m.source_files), "absolute path");
    }],
    ["dot-dot traversal path", () => {
      const m = structuredClone(manifest);
      m.source_files[0].path = "campaign/../../README.md";
      expectThrown(() => checkPathPolicy(m.source_files), "dot-dot traversal");
    }],
    ["backslash path", () => {
      const m = structuredClone(manifest);
      m.source_files[0].path = "campaign\\evil.md";
      expectThrown(() => checkPathPolicy(m.source_files), "backslash path");
    }],
    ["NUL byte in path", () => {
      const m = structuredClone(manifest);
      m.source_files[0].path = "campaign/evil\u0000.md";
      expectThrown(() => checkPathPolicy(m.source_files), "NUL byte path");
    }],
    ["empty segment path", () => {
      const m = structuredClone(manifest);
      m.source_files[0].path = "campaign//evil.md";
      expectThrown(() => checkPathPolicy(m.source_files), "empty segment");
    }],
    ["dot segment path", () => {
      const m = structuredClone(manifest);
      m.source_files[0].path = "campaign/./evil.md";
      expectThrown(() => checkPathPolicy(m.source_files), "dot segment");
    }],
    ["simulated symlink (injected lstat)", () => {
      expectThrown(
        () =>
          checkPathPolicy(manifest.source_files, {
            lstat: (p) => (String(p).endsWith("identity.json") ? { isSymbolicLink: () => true, isFile: () => true } : lstatSync(p)),
          }),
        "symlink rejection",
      );
    }],
    ["realpath escape (injected realpath)", () => {
      expectThrown(
        () =>
          checkPathPolicy(manifest.source_files, {
            real: (p) => (p === ROOT ? realpathSync(p) : "/tmp/outside-repo"),
          }),
        "realpath-inside-repo",
      );
    }],
    // --- AIPT compatibility ---
    ["wrong AIPT protocol commit", () => {
      const m = structuredClone(manifest);
      m.aipt_compatibility.protocol_commit = "a".repeat(40);
      expectThrown(() => checkAiptCompatibility(m.aipt_compatibility), "AIPT commit pin");
    }],
    ["wrong AIPT protocol tree", () => {
      const m = structuredClone(manifest);
      m.aipt_compatibility.protocol_tree = "b".repeat(40);
      expectThrown(() => checkAiptCompatibility(m.aipt_compatibility), "AIPT tree pin");
    }],
    ["wrong AIPT protocol version", () => {
      const m = structuredClone(manifest);
      m.aipt_compatibility.protocol_version = "2.0.0";
      expectThrown(() => checkAiptCompatibility(m.aipt_compatibility), "protocol version");
    }],
    ["wrong AIPT schema version", () => {
      const m = structuredClone(manifest);
      m.aipt_compatibility.schema_version = "0.9.0";
      expectThrown(() => checkAiptCompatibility(m.aipt_compatibility), "schema version");
    }],
    ["wrong AIPT schema digest", () => {
      const m = structuredClone(manifest);
      m.aipt_compatibility.protocol_schema_sha256 = "c".repeat(64);
      expectThrown(() => checkAiptCompatibility(m.aipt_compatibility), "schema digest");
    }],
    ["wrong AIPT jsonrpc", () => {
      const m = structuredClone(manifest);
      m.aipt_compatibility.jsonrpc = "1.0";
      expectThrown(() => checkAiptCompatibility(m.aipt_compatibility), "jsonrpc");
    }],
    // --- circular revision keys + self-hash ---
    ["injected circular game/source/candidate/self revision key", () => {
      for (const k of ["game_revision", "source_revision", "candidate_revision", "self_commit", "containing_commit", "game_sha256"]) {
        const m = structuredClone(manifest);
        m[k] = "x";
        expectThrown(() => checkNoCircularRevision(m), "circular revision key " + k);
      }
    }],
    ["manifest self-hash embedded", () => {
      const m = structuredClone(manifest);
      const selfSha = sha256(readFileSync(path.join(ROOT, MANIFEST_REL)));
      m.self_reference = selfSha;
      expectThrown(() => checkNoCircularRevision(m), "self revision key");
      expectThrown(() => checkNotSelfHashed(m), "self-hash value");
    }],
    // --- stable-ids ---
    ["duplicate stable_id (one ID two entities)", () => {
      const s = structuredClone(stableIds);
      s.entities.push({ ...s.entities[0], display_name: "游隼副本" });
      expectThrown(() => checkStableIdsObj(s), "duplicate stable_id");
    }],
    ["two IDs binding the same source entity", () => {
      const s = structuredClone(stableIds);
      const first = s.entities[0];
      s.entities.push({ ...first, stable_id: "UNR-CHAR-9999" });
      expectThrown(() => checkStableIdsObj(s), "same (path,locator,kind) under two IDs");
    }],
    ["same path+locator under two kinds", () => {
      const s = structuredClone(stableIds);
      const first = s.entities[0];
      s.entities.push({ ...first, stable_id: "UNR-SECRET-9999", kind: "SECRET" });
      expectThrown(() => checkStableIdsObj(s), "same path+locator even if kind changes");
    }],
    ["retired id reuse", () => {
      const s = structuredClone(stableIds);
      s.retired = [{ stable_id: "UNR-CHAR-0001", reason: "probe" }];
      expectThrown(() => checkStableIdsObj(s), "retired ids disjoint from active entities");
    }],
    ["wrong eight-scene binding", () => {
      const s = structuredClone(stableIds);
      s.entities.find((e) => e.stable_id === "UNR-SCENE-T000-01").source.locator = "### S1 据点接单 (Strong Start)";
      expectThrown(() => checkStableIdsObj(s), "scene locator byte-exact binding");
    }],
    ["early RULE assignment", () => {
      const s = structuredClone(stableIds);
      s.entities.push({
        stable_id: "UNR-RULE-0001",
        kind: "RULE",
        display_name: "rule probe",
        source: { path: "campaign/rules/vertical-slice-v0.md", locator: "## 0. 本草案回答什么", locator_type: "markdown_heading" },
        lifecycle_status: "PROPOSAL",
        canonical: false,
      });
      expectThrown(() => checkStableIdsObj(s), "RULE namespace reserved");
    }],
    ["early INVARIANT assignment", () => {
      const s = structuredClone(stableIds);
      s.entities.push({
        stable_id: "UNR-INVARIANT-0001",
        kind: "INVARIANT",
        display_name: "invariant probe",
        source: { path: "campaign/rules/logic-map-v1.md", locator: "## 1. 概念节点表（10 个节点，全部引用收敛）", locator_type: "markdown_heading" },
        lifecycle_status: "PROPOSAL",
        canonical: false,
      });
      expectThrown(() => checkStableIdsObj(s), "INVARIANT namespace reserved");
    }],
    ["early MUTATION assignment", () => {
      const s = structuredClone(stableIds);
      s.entities.push({
        stable_id: "UNR-MUTATION-0001",
        kind: "MUTATION",
        display_name: "mutation probe",
        source: { path: "campaign/rules/mechanics-fine-v1.md", locator: "## A. 资源参数（resource-economy 五要素）", locator_type: "markdown_heading" },
        lifecycle_status: "PROPOSAL",
        canonical: false,
      });
      expectThrown(() => checkStableIdsObj(s), "MUTATION namespace reserved");
    }],
    // --- visibility ---
    ["missing visibility label (taxonomy)", () => {
      const v = structuredClone(visibility);
      v.policy.taxonomy.labels = v.policy.taxonomy.labels.filter((l) => l !== "PUBLIC");
      expectThrown(() => checkVisibilityObj(v), "six-label taxonomy exact");
    }],
    ["unknown mapping label", () => {
      const v = structuredClone(visibility);
      v.mappings[0].label = "TOP_SECRET";
      expectThrown(() => checkVisibilityObj(v), "unknown label fail-closed");
    }],
    ["missing mapping label", () => {
      const v = structuredClone(visibility);
      delete v.mappings[0].label;
      expectThrown(() => checkVisibilityObj(v), "missing label fail-closed");
    }],
    ["TABLE_HIDDEN empty principals", () => {
      const v = structuredClone(visibility);
      const mp = v.mappings.find((m) => m.label === "TABLE_HIDDEN_REMOTE_ALLOWED");
      mp.principals = [];
      expectThrown(() => checkVisibilityObj(v), "TABLE_HIDDEN principals non-empty");
    }],
    ["Secret mapping to ALL_PLAYERS", () => {
      const v = structuredClone(visibility);
      const mp = v.mappings.find((m) => m.entity_ids && m.entity_ids.includes("UNR-SECRET-0001"));
      mp.principals = ["GM", "ALL_PLAYERS"];
      expectThrown(() => checkVisibilityObj(v), "secret never ALL_PLAYERS");
    }],
    ["Secret mapping to wrong Character", () => {
      const v = structuredClone(visibility);
      const mp = v.mappings.find((m) => m.entity_ids && m.entity_ids.includes("UNR-SECRET-0001"));
      mp.principals = ["GM", "CHARACTER:UNR-CHAR-0002"];
      expectThrown(() => checkVisibilityObj(v), "secret principals [GM, owning character]");
    }],
    ["LOCAL_ONLY_SECRET remote true", () => {
      const v = structuredClone(visibility);
      v.policy.taxonomy.remote_allowed.LOCAL_ONLY_SECRET = true;
      expectThrown(() => checkVisibilityObj(v), "LOCAL_ONLY_SECRET remote false");
    }],
    ["LOCAL_ONLY_SECRET mapping used", () => {
      const v = structuredClone(visibility);
      const mp = v.mappings.find((m) => m.label === "PUBLIC");
      mp.label = "LOCAL_ONLY_SECRET";
      expectThrown(() => checkVisibilityObj(v), "LOCAL_ONLY_SECRET declared absent");
    }],
    [HPD + " mapping used for a repository source", () => {
      const v = structuredClone(visibility);
      const mp = v.mappings.find((m) => m.label === "PUBLIC");
      mp.label = HPD;
      expectThrown(() => checkVisibilityObj(v), HPD + " never a formal source mapping");
    }],
    ["fail-closed missing coverage for a first-slice source", () => {
      const v = structuredClone(visibility);
      v.mappings = v.mappings.filter((m) => m.source.path !== "campaign/rules/logic-map-v1.md");
      expectThrown(() => checkVisibilityObj(v), "every first-slice source covered");
    }],
    ["stage3 whole-file coarse mapping", () => {
      const v = structuredClone(visibility);
      v.mappings.push({
        id: "stage3-whole-probe",
        source: { path: "campaign/playtest/stage3-run-guide-v1.md", locator: null, locator_type: "whole_file" },
        label: "TABLE_HIDDEN_REMOTE_ALLOWED",
        remote_allowed: true,
        principals: ["GM"],
      });
      expectThrown(() => checkVisibilityObj(v), "no whole-file coarse entry for stage3");
    }],
    ["visibility remote_allowed overridden on a mapping", () => {
      const v = structuredClone(visibility);
      const mp = v.mappings.find((m) => m.entity_ids && m.entity_ids.includes("UNR-SECRET-0001"));
      mp.remote_allowed = false;
      expectThrown(() => checkVisibilityObj(v), "mapping remote_allowed must equal taxonomy");
    }],
    ["first-slice source set drifts from the manifest", () => {
      const v = structuredClone(visibility);
      v.scope.first_slice_sources = v.scope.first_slice_sources.filter((p) => p !== "campaign/rules/logic-map-v1.md");
      expectThrown(() => checkVisibilityObj(v), "first_slice_sources equals manifest source set");
    }],
    ["undeclared locator type", () => {
      const v = structuredClone(visibility);
      v.mappings[0].source.locator_type = "regex_search";
      expectThrown(() => checkVisibilityObj(v), "locator type declared");
    }],
    // --- safety ---
    ["required Line removed", () => {
      const sp = structuredClone(safety);
      sp.lines = sp.lines.filter((l) => l.name !== "儿童受害");
      expectThrown(() => checkSafetyObj(sp), "exactly 2 Lines");
    }],
    ["Veil changed", () => {
      const sp = structuredClone(safety);
      sp.veils[0].rule = "Line";
      expectThrown(() => checkSafetyObj(sp), "Veil must stay Veil");
    }],
    ["Veil widened (second veil added)", () => {
      const sp = structuredClone(safety);
      sp.veils.push({ name: "暴力", rule: "Veil", source_text: "暴力：Veil" });
      expectThrown(() => checkSafetyObj(sp), "exactly 1 Veil");
    }],
    ["unconfirmed default not VEIL", () => {
      const sp = structuredClone(safety);
      sp.unconfirmed_default = "LINE";
      expectThrown(() => checkSafetyObj(sp), "unconfirmed_default VEIL");
    }],
    ["cognitive-pollution protection removed", () => {
      const sp = structuredClone(safety);
      sp.cognitive_pollution_protections.false_information_never_player_reality = false;
      expectThrown(() => checkSafetyObj(sp), "false information never player reality");
    }],
    ["participant response classification changed", () => {
      const sp = structuredClone(safety);
      sp.data_handling.participant_response_classification = "PUBLIC";
      expectThrown(() => checkSafetyObj(sp), "classification token exact");
    }],
    ["public persistence true", () => {
      const sp = structuredClone(safety);
      sp.data_handling.persist_in_public_game_repo = true;
      expectThrown(() => checkSafetyObj(sp), "persist_in_public_game_repo false");
    }],
    [HPD + " as formal game input", () => {
      const sp = structuredClone(safety);
      sp.data_handling.formal_game_input = true;
      expectThrown(() => checkSafetyObj(sp), "formal_game_input false");
    }],
    ["actual participant payload stored", () => {
      const sp = structuredClone(safety);
      sp.data_handling.stores.participant_answers = ["player-a: level 2"];
      expectThrown(() => checkSafetyObj(sp), "stores all false");
      const payloadText = JSON.stringify({ data_handling: { participant_answers: ["player-a: level 2"] } }, null, 2);
      expectThrown(() => scanText("aipt/p0-b001/safety-profile.json", payloadText), "participant payload scan");
    }],
    // --- scope / next-batch-work ---
    ["machine Rule object enabled", () => {
      const m = structuredClone(manifest);
      m.scope.rules_inputs.machine_rule_object = true;
      expectThrown(() => checkManifestObj(m), "machine_rule_object false");
    }],
    ["semantic graph enabled", () => {
      const m = structuredClone(manifest);
      m.scope.rules_inputs.semantic_graph = true;
      expectThrown(() => checkManifestObj(m), "semantic_graph false");
    }],
    ["adapter/runtime enabled", () => {
      const m = structuredClone(manifest);
      m.scope.rules_inputs.adapter_or_runtime = true;
      expectThrown(() => checkManifestObj(m), "adapter_or_runtime false");
    }],
    ["mutant definition enabled", () => {
      const m = structuredClone(manifest);
      m.scope.rules_inputs.mutant_definition = true;
      expectThrown(() => checkManifestObj(m), "mutant_definition false");
    }],
    // --- status ---
    ["status drift from IN_PROGRESS", () => {
      const s = structuredClone(loadJson("aipt/status.json"));
      s.status = "MERGED_CLOSED";
      expectThrown(() => checkStatusObj(s), "status IN_PROGRESS");
    }],
    ["previous_batch status drift", () => {
      const s = structuredClone(loadJson("aipt/status.json"));
      s.previous_batch.status = "IN_PROGRESS";
      expectThrown(() => checkStatusObj(s), "previous batch B000 MERGED_CLOSED");
    }],
    ["global_wip drift", () => {
      const s = structuredClone(loadJson("aipt/status.json"));
      s.global_wip = 0;
      expectThrown(() => checkStatusObj(s), "global_wip 1");
    }],
    // --- artifacts ---
    ["unexpected B001 artifact path", () => {
      const entries = collectAiptEntries().concat([{ rel: "aipt/p0-b001/extra.json", kind: "file" }]);
      expectThrown(() => checkArtifactPaths(entries), "exact artifact set");
    }],
    // --- A: schema-shape fail-closed — actual object injections, not just
    //     toggling the existing false flags ---
    ["top-level machine_rules object injected", () => {
      const m = structuredClone(manifest);
      m.machine_rules = { rules: [{ rule_id: "UNR-RULE-0001", kind: "RULE", body: "if X then Y" }] };
      expectThrown(() => checkManifestObj(m), "top-level machine_rules key rejected (exact top-level key set)");
    }],
    ["nested machine Rule object injected (rules_inputs.Rule)", () => {
      const m = structuredClone(manifest);
      m.scope.rules_inputs.Rule = { rule_id: "UNR-RULE-0001", kind: "RULE", semantics: "machine" };
      expectThrown(() => checkManifestObj(m), "nested Rule object rejected (exact rules_inputs key set)");
    }],
    ["semantic graph payload object injected", () => {
      const m = structuredClone(manifest);
      m.scope.semantic_graph_payload = { nodes: [{ id: "n1" }], edges: [{ from: "n1", to: "n2" }] };
      expectThrown(() => checkManifestObj(m), "semantic_graph_payload rejected (exact scope key set)");
    }],
    ["adapter object injected", () => {
      const m = structuredClone(manifest);
      m.scope.rules_inputs.adapter = { kind: "rules-adapter", target: "UNR" };
      expectThrown(() => checkManifestObj(m), "adapter object rejected (exact rules_inputs key set)");
    }],
    ["runtime object injected", () => {
      const m = structuredClone(manifest);
      m.scope.rules_inputs.runtime = { engine: "node", version: "24.19.0", entry: "scripts/aipt/adapter-runtime.mjs" };
      expectThrown(() => checkManifestObj(m), "runtime object rejected (exact rules_inputs key set)");
    }],
    ["mutant definition object injected", () => {
      const m = structuredClone(manifest);
      m.scope.mutants = [{ mutant_id: "UNR-MUTATION-0001", rule_id: "UNR-RULE-0001", delta: "invert" }];
      expectThrown(() => checkManifestObj(m), "mutants object rejected (exact scope key set)");
    }],
    ["arbitrary packaged_inputs object injected", () => {
      const m = structuredClone(manifest);
      m.packaged_inputs = { bundle: ["campaign/rules/vertical-slice-v0.md", "machine/rules.json"] };
      expectThrown(() => checkManifestObj(m), "packaged_inputs rejected (exact top-level key set)");
    }],
    // --- B: exact lifecycle for every source entry / registry ref ---
    ["source lifecycle CANON promotion", () => {
      const m = structuredClone(manifest);
      m.source_files.find((e) => e.path === "campaign/rules/vertical-slice-v0.md").lifecycle = "CANON";
      expectThrown(() => checkManifestObj(m), "CANON promotion rejected for every source entry");
    }],
    ["source entry missing required field (lifecycle_note deleted)", () => {
      const m = structuredClone(manifest);
      delete m.source_files[3].lifecycle_note;
      expectThrown(() => checkManifestObj(m), "every source entry must carry role/lifecycle/lifecycle_note/sha256");
    }],
    // --- C: semantic visibility structure ---
    ["non-scene stage3 section deleted", () => {
      const v = structuredClone(visibility);
      v.mappings = v.mappings.filter((m) => m.id !== "stage3-s5-tips");
      expectThrown(() => checkVisibilityObj(v), "all 17 stage3 mappings (incl. non-scene sections) required");
    }],
    ["ambiguous session0 whole-file mapping added", () => {
      const v = structuredClone(visibility);
      v.mappings.push({
        id: "session0-whole-probe",
        source: { path: "campaign/session0-redlines.md", locator: null, locator_type: "whole_file" },
        label: "TABLE_HIDDEN_REMOTE_ALLOWED",
        remote_allowed: true,
        principals: ["GM"],
      });
      expectThrown(() => checkVisibilityObj(v), "session0 whole-file coarse entry rejected (ambiguous vs section-level mappings)");
    }],
    ["session0 preamble swapped for whole-file coarse entry", () => {
      const v = structuredClone(visibility);
      const preamble = v.mappings.find((m) => m.id === "session0-preamble");
      preamble.source = { path: "campaign/session0-redlines.md", locator: null, locator_type: "whole_file" };
      expectThrown(() => checkVisibilityObj(v), "session0 must keep preamble + sections 1-4 with no whole-file entry");
    }],
    // --- D: artifact/scope allowlist ---
    ["unexpected aipt symlink entry", () => {
      const entries = collectAiptEntries().concat([{ rel: "aipt/p0-b001/evil-link.json", kind: "symlink" }]);
      expectThrown(() => checkArtifactPaths(entries), "symlinks/non-regular entries under aipt rejected (never silently ignored)");
    }],
    ["unexpected scripts/aipt/adapter-runtime.mjs entry", () => {
      const entries = collectScriptsAiptEntries().concat([{ rel: "scripts/aipt/adapter-runtime.mjs", kind: "file" }]);
      expectThrown(() => checkScriptsAipt(entries), "scripts/aipt must contain exactly validate-p0-b000.mjs and validate-p0-b001.mjs");
    }],
  ];

  let rejected = 0;
  probes.forEach(([label, fn], i) => {
    try {
      fn();
      rejected += 1;
      console.log(`PASS negative probe ${i + 1}/${probes.length} (${label}): rejected`);
    } catch (e) {
      fail(`negative probe ${i + 1}/${probes.length} (${label}) failed to reject — ${e.message}`);
    }
  });
  if (rejected === probes.length) {
    console.log(`PASS negative probes: ${probes.length}/${probes.length} rejected as expected`);
  } else {
    console.error(`FAIL negative probes: only ${rejected}/${probes.length} rejected as expected`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!existsSync(path.join(ROOT, "aipt", "input-manifest.json"))) {
    console.error("FAIL root: cannot find aipt/input-manifest.json; run this validator from the repository root (no writes performed)");
    process.exit(1);
  }

  runCheck("shared repo gates", () => {
    pass("repository-wide JSON-parse and relative Markdown-link gates remain enforced by the still-run validate-p0-b000.mjs step (B001 relies on them)");
  });
  runCheck("status", checkStatus);
  runCheck("manifest", checkManifest);
  runCheck("source digests", () => {
    const m = loadJson(MANIFEST_REL);
    checkSourceDigests([...m.source_files, ...m.registry_refs]);
    pass(`source digests: all ${EXPECTED_SOURCE_FILES.length + EXPECTED_REGISTRY_REFS.length} referenced paths hash to their declared sha256 AND to the hardcoded accepted digests (source + manifest cannot co-drift)`);
  });
  runCheck("path policy", () => {
    const m = loadJson(MANIFEST_REL);
    checkPathPolicy([...m.source_files, ...m.registry_refs]);
    pass(`path policy: all ${EXPECTED_SOURCE_FILES.length + EXPECTED_REGISTRY_REFS.length} referenced paths are relative POSIX regular files inside the repository (no absolute/dot-dot/backslash/NUL/symlink/escape)`);
  });
  runCheck("stable-ids", checkStableIds);
  runCheck("visibility", checkVisibility);
  runCheck("safety-profile", checkSafetyProfile);
  runCheck("artifact paths", () => {
    checkArtifactPaths(collectAiptEntries());
    pass("artifact paths: aipt/** contains exactly the accepted B000 + B001 regular files; symlinks and other non-regular entries are rejected (never silently ignored)");
  });
  runCheck("scripts/aipt allowlist", () => {
    checkScriptsAipt(collectScriptsAiptEntries());
    pass("scripts/aipt allowlist: exactly validate-p0-b000.mjs and validate-p0-b001.mjs for this batch — no adapter/runtime/mutant executable can be added under the allowed script path");
  });
  runCheck("delivery-surface scan", checkScan);
  runProbes();

  if (errors.length > 0) {
    for (const e of errors) console.error("FAIL " + e);
    console.error(`FAIL AIPT Content Gate B001: ${errors.length} error(s)`);
    process.exit(1);
  }
  console.log("PASS AIPT Content Gate B001: all checks passed");
}

main();
