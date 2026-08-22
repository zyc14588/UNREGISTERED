#!/usr/bin/env node
/**
 * scripts/aipt/validate-p0-b000.mjs
 *
 * Deterministic content-gate validator for AIPT batch UNREGISTERED-AIPT-P0-B000.
 *
 * Hard constraints: Node.js standard library only — no dependencies, no network,
 * no subprocess, no git, no model calls. It works by reading the checkout
 * filesystem; it never writes anything.
 *
 * Checks (iteration 4 contract — B000 gate evolved only where B001 requires it):
 *   1. every repository JSON file parses (recursive checkout walk with .git,
 *      node_modules, .sessions excluded; symlinks and non-files ignored) and
 *      every ordinary relative inline Markdown link in all repository Markdown
 *      resolves;
 *   2. exact identity (formal title, historical-only old codename, unchanged
 *      package_id, root README heading) + rejection of the prohibited
 *      current-title typo and of unmarked old-codename occurrences on the
 *      product-facing textual surfaces (root README, campaign, aipt, LICENSES;
 *      Markdown/JSON/YAML);
 *   3. exact licensing metadata + human policy prominence + no root LICENSE;
 *   4. fail-closed path classification (most-specific rule wins, pending
 *      default, pending rejected whenever content policy is required; the
 *      scripts/aipt/** and AIPT workflow rules carry exactly the keys
 *      pattern/classification/reason and no alternate-license or license-ref
 *      field);
 *   5. premades-v2.json vs. the accepted sources (premades-v1.md,
 *      premades-v2.md, mechanics-fine-v1.md §A6), with exact attribute/skill/
 *      clue/trigger/tier/bond values and normalized source extraction;
 *   6. recursive rejection of forbidden schema concepts (stable IDs,
 *      visibility, audience, SafetyProfile) scoped to the B000 delivery JSON
 *      (aipt/p0-b000/**) only — the new B001 artifacts and the B001 input
 *      manifest are out of B000 schema-key scope (they are deeply validated by
 *      validate-p0-b001.mjs);
 *   7. credential / private-path / private prompt- and package-marker scan of
 *      the generated delivery surfaces (needles are assembled from fragments
 *      so this file does not flag itself); the required participant-data
 *      classification token (HUMAN/PRIVATE/DATA) is allowed only inside the
 *      B001 metadata files
 *      (aipt/p0-b001/**), while actual participant data and credentials stay
 *      rejected;
 *   8. static check of the AIPT Content Gate workflow, including a hardened
 *      top-level permissions block parse (blank/comment-safe, runs until the
 *      next top-level key), rejection of any permission entry valued write,
 *      and the requirement that all three validator commands run as separate
 *      steps — immutable action pins, Node.js 24.19.0, contents:read,
 *      persist-credentials:false, ubuntu-24.04 and the no-install/no-cache/
 *      no-token/no-remote-call rules are unchanged;
 *   9. eight in-memory negative probes, all of which must be rejected; plus an
 *      in-memory status-mutation probe set proving the status.json B002
 *      MERGED_CLOSED closeout shape rejects every stale, legacy, or
 *      contradictory mutation (9b).
 *
 * B000 and B001 are historical MERGED_CLOSED batches. The current repository
 * lifecycle is B002 MERGED_CLOSED with global_wip 0; B003 is authorized to
 * prepare but not started. The required B001 artifacts remain frozen, while
 * only the explicit B002 delivery paths are allowed.
 *
 * Output is concise and deterministic; exits non-zero with actionable errors
 * on any failure.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");

const BATCH = "UNREGISTERED-AIPT-P0-B000";
const B001_BATCH = "UNREGISTERED-AIPT-P0-B001";
const CURRENT_BATCH = "UNREGISTERED-AIPT-P0-B002";
const NEXT_BATCH = "UNREGISTERED-AIPT-P0-B003";
const CODENAME = "《特工模拟》";
// The prohibited current-name typo (未登记 misspelled) and its bracketed title
// form must be assembled from fragments so this validator does not flag its
// own source.
const TYPO_BARE = "未注" + "册";
const TYPO_TITLE = "《" + TYPO_BARE + "》";
// Outside identity metadata and this validator, a line carrying the old
// codename must be clearly marked with one of these.
const CODENAME_MARKERS = ["旧代号", "old codename", "historical"];

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

function expectThrow(label, fn) {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`${label} must be rejected`);
}

function relPath(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

function readRel(relPath) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

function loadJson(relPath) {
  try {
    return JSON.parse(readRel(relPath));
  } catch (e) {
    throw new Error(`invalid JSON in ${relPath}: ${e.message}`);
  }
}

const WALK_EXCLUDED = new Set([".git", "node_modules", ".sessions"]);

function walk(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    if (WALK_EXCLUDED.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    // Symlinks are neither directories nor files here, so they are ignored;
    // non-files never enter the output.
    if (ent.isDirectory()) walk(p, out);
    else if (ent.isFile()) out.push(p);
  }
  return out;
}

/** Normalize prose for comparison: drop whitespace, straight quotes, markdown bold/code markers, backslashes. */
function norm(s) {
  return String(s ?? "").replace(/\s+/g, "").replace(/[*"`\\]/g, "");
}

function assertMapEqual(actual, expected, label) {
  if (!actual || typeof actual !== "object") throw new Error(`${label}: missing map`);
  const ak = Object.keys(actual).sort();
  const ek = Object.keys(expected).sort();
  if (JSON.stringify(ak) !== JSON.stringify(ek)) {
    throw new Error(`${label}: keys must be exactly ${JSON.stringify(ek)}, got ${JSON.stringify(ak)}`);
  }
  for (const k of ek) {
    if (actual[k] !== expected[k]) throw new Error(`${label}.${k} must be exactly ${expected[k]}, got ${JSON.stringify(actual[k])}`);
  }
}

function assertNormMapEqual(actual, expected, label) {
  if (!actual || typeof actual !== "object") throw new Error(`${label}: missing map`);
  const ak = Object.keys(actual).sort();
  const ek = Object.keys(expected).sort();
  if (JSON.stringify(ak) !== JSON.stringify(ek)) {
    throw new Error(`${label}: keys must be exactly ${JSON.stringify(ek)}, got ${JSON.stringify(ak)}`);
  }
  for (const k of ek) {
    if (norm(actual[k]) !== norm(expected[k])) throw new Error(`${label}.${k} drifted from the accepted text`);
  }
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

// ---------------------------------------------------------------------------
// 1. Relative inline Markdown links across all repository Markdown
// ---------------------------------------------------------------------------

const INLINE_LINK_RE = /\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^)]*["'])?\s*\)/g;

function countLinks(relFile, text) {
  let count = 0;
  for (const m of text.matchAll(INLINE_LINK_RE)) {
    const target = m[1].trim();
    if (target.startsWith("#")) continue; // same-document anchor
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) continue; // URL / mailto / any scheme
    const filePart = target.split("#")[0].split("?")[0];
    if (!filePart) continue;
    const base = path.dirname(path.join(ROOT, relFile));
    const resolved = path.normalize(path.join(base, filePart));
    const relResolved = relPath(resolved);
    if (relResolved.startsWith("..") || path.isAbsolute(relResolved)) {
      throw new Error(`link escapes the repository: [..](${target}) in ${relFile}`);
    }
    if (!existsSync(resolved) || !statSync(resolved).isFile()) {
      throw new Error(`broken relative Markdown link [..](${target}) in ${relFile} -> ${relResolved} does not resolve`);
    }
    count += 1;
  }
  return count;
}

/** Resolve ordinary relative inline Markdown links in every repository
 *  Markdown file, and keep the same resolution for AIPT delivery JSON string
 *  content. Deterministic counts are reported, never hardcoded. */
function checkRepoLinks(mdFiles, jsons) {
  let total = 0;
  for (const f of mdFiles) {
    total += countLinks(relPath(f), readRel(relPath(f)));
  }
  let deliveryJsonFiles = 0;
  for (const [r, obj] of jsons) {
    if (!r.startsWith("aipt/")) continue;
    deliveryJsonFiles += 1;
    total += countLinks(r, [...jsonStrings(obj)].join("\n"));
  }
  pass(`links: ${total}/${total} relative inline Markdown links resolve (${mdFiles.length} Markdown files + ${deliveryJsonFiles} AIPT delivery JSON files scanned)`);
}

// ---------------------------------------------------------------------------
// 2. Exact identity
// ---------------------------------------------------------------------------

function checkIdentity() {
  const id = loadJson("aipt/p0-b000/identity.json");
  const exact = {
    aipt_schema: "aipt.identity.v1",
    batch_id: BATCH,
    formal_name_zh: "《未登记》",
    formal_name_en: "UNREGISTERED",
    formal_display_name: "《未登记》UNREGISTERED",
  };
  for (const [k, v] of Object.entries(exact)) {
    if (id[k] !== v) throw new Error(`identity.${k} must be exactly ${JSON.stringify(v)}, got ${JSON.stringify(id[k])}`);
  }
  const oc = id.old_codename;
  if (!oc || typeof oc !== "object") throw new Error("identity.old_codename missing");
  if (oc.value_zh !== CODENAME) throw new Error(`identity.old_codename.value_zh must be exactly ${CODENAME}`);
  if (oc.status !== "OLD_CODENAME_ONLY") throw new Error("identity.old_codename.status must be exactly OLD_CODENAME_ONLY");
  if (!/historical/i.test(oc.usage_note || "")) throw new Error("identity.old_codename.usage_note must mark the codename as historical");
  if (!/never be used as the display name/i.test(oc.usage_note || "")) throw new Error("identity.old_codename.usage_note must forbid display-name use");
  for (const k of ["formal_name_zh", "formal_name_en", "formal_display_name"]) {
    if (String(id[k]).includes(CODENAME)) throw new Error(`identity.${k} must not contain the old codename ${CODENAME}`);
  }
  const pkg = id.package_id;
  if (!pkg || typeof pkg !== "object") throw new Error("identity.package_id missing");
  if (pkg.value !== "zyc14588/agent-sim") throw new Error("identity.package_id.value must be exactly zyc14588/agent-sim (unchanged)");
  if (pkg.unchanged !== true) throw new Error("identity.package_id.unchanged must be true");
  if (pkg.role !== "TECHNICAL_IDENTIFIER_NOT_DISPLAY_IDENTITY") throw new Error("identity.package_id.role must be exactly TECHNICAL_IDENTIFIER_NOT_DISPLAY_IDENTITY");
  if (!/not a display identity/i.test(pkg.usage_note || "")) throw new Error("identity.package_id.usage_note must mark the package id as non-display");
  if (JSON.stringify(id).includes(TYPO_BARE)) throw new Error("identity.json must not use the prohibited current-title spelling");

  const readme = readRel("README.md");
  const lines = readme.split(/\r?\n/);
  const h1s = lines.filter((l) => /^#\s/.test(l));
  if (h1s.length !== 1) throw new Error(`root README.md must have exactly one H1, found ${h1s.length}`);
  if (h1s[0] !== "# 《未登记》UNREGISTERED") throw new Error(`root README.md H1 must be exactly "# 《未登记》UNREGISTERED", got "${h1s[0]}"`);
  if (h1s[0] !== "# " + id.formal_display_name) throw new Error("root README.md H1 must match identity.formal_display_name");
  if (!readme.includes("zyc14588/agent-sim")) throw new Error("root README.md must keep the unchanged technical package_id zyc14588/agent-sim");
  for (const l of lines) {
    if (l.includes(CODENAME) && !l.includes("旧代号")) {
      throw new Error(`root README.md uses the old codename outside a historical (旧代号) context: "${l.trim()}"`);
    }
  }
  if (readme.includes(TYPO_BARE)) throw new Error("root README.md must not use the prohibited current-title spelling");

  pass("identity: exact formal title; old codename historical-only; package_id unchanged; root README heading exact");
}

// ---------------------------------------------------------------------------
// 2b. Title-surface scan: prohibited current-title typo + old-codename line
//     marking on the product-facing textual surfaces
// ---------------------------------------------------------------------------

/** Product-facing textual surfaces: root README plus campaign/**, aipt/**,
 *  LICENSES/** — Markdown/JSON/YAML files. */
function titleSurfaceFiles() {
  const files = [];
  const rootReadme = path.join(ROOT, "README.md");
  if (existsSync(rootReadme) && statSync(rootReadme).isFile()) files.push(rootReadme);
  for (const dir of ["campaign", "aipt", "LICENSES"]) {
    const abs = path.join(ROOT, dir);
    if (existsSync(abs)) files.push(...walk(abs));
  }
  return files.filter((f) => /\.(md|json|ya?ml)$/i.test(f)).sort();
}

function checkTitleSurface(f) {
  const r = relPath(f);
  const lines = readRel(r).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const form = line.includes(TYPO_TITLE)
      ? `bracketed title form ${TYPO_TITLE}`
      : line.includes(TYPO_BARE)
        ? `bare form ${TYPO_BARE}`
        : null;
    if (form) throw new Error(`${r}:${i + 1} contains the prohibited current-title typo (${form})`);
  }
  // Identity metadata is the one sanctioned home of the old codename itself;
  // this validator's own source is never scanned.
  if (r === "aipt/p0-b000/identity.json") return;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes(CODENAME)) continue;
    const marked = CODENAME_MARKERS.some((m) => line.toLowerCase().includes(m.toLowerCase()));
    if (!marked) {
      throw new Error(`${r}:${i + 1} uses the old codename outside a line clearly marked 旧代号 / old codename / historical`);
    }
  }
}

function checkTitleSurfaces() {
  const files = titleSurfaceFiles();
  for (const f of files) checkTitleSurface(f);
  pass(`title surfaces: no prohibited current-title typo; old codename only on clearly marked historical lines (${files.length} files scanned)`);
}

// ---------------------------------------------------------------------------
// 3. Licensing metadata + human policy + root LICENSE absence
// ---------------------------------------------------------------------------

function checkLicensingValues(lic) {
  const exact = {
    aipt_schema: "aipt.licensing.v1",
    batch_id: BATCH,
    policy_name_zh: "《未登记》非商业相同方式共享内容许可证 1.0",
    license_ref: "LicenseRef-UNREGISTERED-NC-SA-1.0",
    policy_status: "POLICY_FROZEN_TEXT_NOT_DRAFTED",
    future_adapter_execution_code_policy: "FUTURE_MIT_POLICY",
  };
  for (const [k, v] of Object.entries(exact)) {
    if (lic[k] !== v) throw new Error(`licensing.${k} must be exactly ${JSON.stringify(v)}, got ${JSON.stringify(lic[k])}`);
  }
  const bools = {
    final_legal_text_published: false,
    legal_review_required: true,
    repo_wide_relicense: false,
    is_osi_open_source_license: false,
    future_adapter_execution_code_implemented: false,
  };
  for (const [k, v] of Object.entries(bools)) {
    if (lic[k] !== v) throw new Error(`licensing.${k} must be exactly ${v}, got ${JSON.stringify(lic[k])}`);
  }
}

function checkLicensing() {
  const lic = loadJson("aipt/p0-b000/licensing.json");
  checkLicensingValues(lic);

  const policy = readRel("LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md");
  const head = policy.split(/\r?\n/).slice(0, 12).join("\n");
  if (!head.includes("POLICY SUMMARY / NOT FINAL LICENSE TEXT")) {
    throw new Error("human policy must prominently say POLICY SUMMARY / NOT FINAL LICENSE TEXT");
  }
  if (!head.includes("最终法律正文尚未起草")) {
    throw new Error("human policy must prominently say the final legal text has not been drafted");
  }
  if (!policy.includes("POLICY_FROZEN_TEXT_NOT_DRAFTED")) throw new Error("human policy must reference POLICY_FROZEN_TEXT_NOT_DRAFTED");
  if (!policy.includes("不是最终法律文本")) throw new Error("human policy must state it is not the final legal text");
  if (!policy.includes("LicenseRef-UNREGISTERED-NC-SA-1.0")) throw new Error("human policy must reference LicenseRef-UNREGISTERED-NC-SA-1.0");
  const h1 = policy.split(/\r?\n/).find((l) => /^#\s/.test(l));
  if (h1 !== "# " + lic.policy_name_zh) throw new Error(`human policy H1 must match licensing.policy_name_zh exactly, got "${h1}"`);
  if (!norm(policy).includes("本批次不创建根目录通用LICENSE")) throw new Error("human policy must state that no root LICENSE is created");

  const licensesReadme = readRel("LICENSES/README.md");
  if (!norm(licensesReadme).includes("没有根目录LICENSE")) throw new Error("LICENSES/README.md must state that no root LICENSE exists");

  for (const ent of readdirSync(ROOT)) {
    if (statSync(path.join(ROOT, ent)).isFile() && /^license/i.test(ent)) {
      throw new Error(`root LICENSE file present: ${ent} (the frozen policy says none may exist)`);
    }
  }
  pass("licensing: exact metadata; policy frozen, final legal text unpublished; no root LICENSE file");
}

// ---------------------------------------------------------------------------
// 4. Fail-closed path classification
// ---------------------------------------------------------------------------

const ALLOWED_CLASSIFICATIONS = ["CONTENT_POLICY_APPLIES", "EXCLUDED_FROM_CONTENT_POLICY", "UNCLASSIFIED_PENDING_REVIEW"];

function compilePattern(p) {
  const escaped = p
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\u0000/g, ".*");
  return new RegExp("^" + escaped + "$");
}

function patternSpecificity(p) {
  return p.length - (p.match(/\*/g) || []).length;
}

function classify(ps, p) {
  const normPath = p.replace(/\\/g, "/").replace(/^\.\//, "");
  let best = null;
  for (const rule of ps.rules) {
    if (compilePattern(rule.pattern).test(normPath)) {
      const spec = patternSpecificity(rule.pattern);
      if (!best || spec > best.spec) {
        best = { spec, classification: rule.classification, pattern: rule.pattern };
      }
    }
  }
  return best ? best.classification : ps.default;
}

/** Fail-closed: any caller requiring CONTENT_POLICY_APPLIES must be rejected on pending/unknown paths. */
function requireContentPolicy(ps, p) {
  const got = classify(ps, p);
  if (got !== "CONTENT_POLICY_APPLIES") {
    throw new Error(`path "${p}" classified ${got}; a caller requiring CONTENT_POLICY_APPLIES must reject it (fail-closed)`);
  }
  return true;
}

function checkPathScope(lic) {
  const ps = lic.path_scope;
  if (!ps || typeof ps !== "object") throw new Error("licensing.path_scope missing");
  if (ps.evaluation !== "fail_closed_most_specific_first") {
    throw new Error(`path_scope.evaluation must be exactly "fail_closed_most_specific_first", got ${JSON.stringify(ps.evaluation)}`);
  }
  if (ps.default !== "UNCLASSIFIED_PENDING_REVIEW") throw new Error("path_scope.default must be UNCLASSIFIED_PENDING_REVIEW");
  const set = new Set(ps.classifications || []);
  if (!ALLOWED_CLASSIFICATIONS.every((c) => set.has(c)) || set.size !== ALLOWED_CLASSIFICATIONS.length) {
    throw new Error("path_scope.classifications must be exactly the three allowed values: " + ALLOWED_CLASSIFICATIONS.join(", "));
  }
  if (!ps.unmatched_paths || ps.unmatched_paths.classification !== "UNCLASSIFIED_PENDING_REVIEW") {
    throw new Error("path_scope.unmatched_paths.classification must be UNCLASSIFIED_PENDING_REVIEW (fail-closed default)");
  }
  if (!Array.isArray(ps.rules) || ps.rules.length === 0) throw new Error("path_scope.rules must be a non-empty array");
  for (const rule of ps.rules) {
    if (typeof rule.pattern !== "string" || rule.pattern.length === 0) throw new Error("every path-scope rule needs a non-empty string pattern");
    if (!ALLOWED_CLASSIFICATIONS.includes(rule.classification)) {
      throw new Error(`path-scope rule ${rule.pattern} uses a disallowed classification ${JSON.stringify(rule.classification)}`);
    }
    compilePattern(rule.pattern);
  }
  const hasRule = (pattern, want) => {
    const found = ps.rules.filter((r) => r.pattern === pattern);
    if (found.length !== 1) throw new Error(`path-scope requires exactly one rule for pattern ${pattern}, found ${found.length}`);
    if (found[0].classification !== want) {
      throw new Error(`path-scope rule ${pattern} must be classified ${want}, got ${found[0].classification}`);
    }
  };
  hasRule("scripts/aipt/**", "EXCLUDED_FROM_CONTENT_POLICY");
  hasRule(".github/workflows/aipt-content-gate.yml", "EXCLUDED_FROM_CONTENT_POLICY");

  // The two new scope rules may carry only pattern/classification/reason; the
  // reason must say "assigns no alternate license"; no alternate-license or
  // license-ref field may appear (a later mutation adding alternate_license
  // must fail here).
  for (const pattern of ["scripts/aipt/**", ".github/workflows/aipt-content-gate.yml"]) {
    const rule = ps.rules.find((r) => r.pattern === pattern);
    const keys = Object.keys(rule).sort();
    if (JSON.stringify(keys) !== JSON.stringify(["classification", "pattern", "reason"])) {
      throw new Error(`path-scope rule ${pattern} keys must be exactly pattern, classification, reason — got ${JSON.stringify(keys)}`);
    }
    if (typeof rule.reason !== "string" || !rule.reason.includes("assigns no alternate license")) {
      throw new Error(`path-scope rule ${pattern} reason must say "assigns no alternate license"`);
    }
    for (const k of Object.keys(rule)) {
      if (/alternate[-_]?license/i.test(k) || /license[-_]?ref/i.test(k)) {
        throw new Error(`path-scope rule ${pattern} must not contain an alternate-license or license-ref field (found "${k}")`);
      }
    }
  }

  const resolutions = [
    ["campaign/00-campaign.md", "CONTENT_POLICY_APPLIES"],
    ["campaign/playtest/scripts/sim_infiltration_v1.py", "UNCLASSIFIED_PENDING_REVIEW"],
    ["aipt/status.json", "EXCLUDED_FROM_CONTENT_POLICY"],
    ["LICENSES/README.md", "EXCLUDED_FROM_CONTENT_POLICY"],
    [".opencode/skills/trpg-system-designer/SKILL.md", "EXCLUDED_FROM_CONTENT_POLICY"],
    ["knowledge/规则怪谈知识库.md", "EXCLUDED_FROM_CONTENT_POLICY"],
    ["SOURCES.md", "EXCLUDED_FROM_CONTENT_POLICY"],
    ["README.md", "UNCLASSIFIED_PENDING_REVIEW"],
    ["scripts/aipt/validate-p0-b000.mjs", "EXCLUDED_FROM_CONTENT_POLICY"],
    [".github/workflows/aipt-content-gate.yml", "EXCLUDED_FROM_CONTENT_POLICY"],
  ];
  for (const [p, want] of resolutions) {
    const got = classify(ps, p);
    if (got !== want) throw new Error(`path classification for ${p} must be ${want}, got ${got}`);
  }
  if (classify(ps, "totally/unmatched/example.md") !== "UNCLASSIFIED_PENDING_REVIEW") {
    throw new Error("unmatched paths must default to UNCLASSIFIED_PENDING_REVIEW");
  }
  requireContentPolicy(ps, "campaign/00-campaign.md");
  expectThrow("requireContentPolicy on pending README.md", () => requireContentPolicy(ps, "README.md"));
  expectThrow("requireContentPolicy on unknown path", () => requireContentPolicy(ps, "totally/unmatched/example.md"));
  pass(`path-scope: fail-closed most-specific-first verified (${ps.rules.length} rules; ${resolutions.length} representative resolutions)`);
}

// ---------------------------------------------------------------------------
// 5. Forbidden schema concepts + status/artifacts
// ---------------------------------------------------------------------------

const FORBIDDEN_EXACT_KEYS = new Set([
  "character_id", "characterId", "character-id",
  "secret_id", "secretId", "secret-id",
  "bond_id", "bondId", "bond-id",
  "id", "uid", "uuid", "guid", "stable_id", "stableId", "stable-id",
  "visibility", "audience", "SafetyProfile", "safety_profile", "safetyProfile",
]);
const ALLOWED_ID_SUFFIX_KEYS = new Set(["package_id", "batch_id"]);

function checkForbiddenKeys(obj, fileLabel) {
  if (Array.isArray(obj)) {
    obj.forEach((x, i) => checkForbiddenKeys(x, fileLabel));
    return;
  }
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_EXACT_KEYS.has(key)) {
      throw new Error(`${fileLabel}: forbidden schema key "${key}" (stable-ID / visibility / audience / SafetyProfile concepts are rejected)`);
    }
    if (/^(character|secret|bond)[_-]?id$/i.test(key)) throw new Error(`${fileLabel}: forbidden stable-ID key "${key}"`);
    if (/_id$/i.test(key) && !ALLOWED_ID_SUFFIX_KEYS.has(key)) {
      throw new Error(`${fileLabel}: forbidden stable-ID key "${key}" (only package_id and batch_id are allowed)`);
    }
    if (/(visibility|audience)/i.test(key)) throw new Error(`${fileLabel}: forbidden visibility/audience taxonomy key "${key}"`);
    if (/safety[_-]?profile/i.test(key)) throw new Error(`${fileLabel}: forbidden SafetyProfile key "${key}"`);
    checkForbiddenKeys(obj[key], fileLabel + "." + key);
  }
}

/** Legal B002 MERGED_CLOSED closeout status for aipt/status.json: exactly these
 *  keys and values. It records the previous repository batch separately from
 *  the external serial predecessor that authorized B002. */
const STATUS_KEYS_B002 = [
  "aipt_schema",
  "current_batch",
  "status",
  "global_wip",
  "previous_repo_batch",
  "external_serial_predecessor",
  "next_batch",
  "next_batch_state",
  "next_batch_authorized",
  "next_batch_started",
];

const EXPECTED_STATUS_B002 = {
  aipt_schema: "aipt.status.v2",
  current_batch: CURRENT_BATCH,
  status: "MERGED_CLOSED",
  global_wip: 0,
  previous_repo_batch: {
    batch_id: B001_BATCH,
    status: "MERGED_CLOSED",
    closeout_commit: "a37b284bf5ec35895f436abe71d22599edb6da53",
  },
  external_serial_predecessor: {
    batch_id: "AIPT-M0-B006",
    status: "MERGED_CLOSED",
    implementation_merge: "35acba9fb629f50087def3b720df304fadfd2158",
    implementation_tree: "4271a3fb71236a8b003b4d9ddc84727c6fec8d46",
    closeout_commit: "e1e1a6315ef2308922105dd30fd4bbcf4e3f91c8",
    closeout_ci_run: 32579049539,
    closeout_ci_conclusion: "success",
  },
  next_batch: NEXT_BATCH,
  next_batch_state: "AUTHORIZED_TO_PREPARE",
  next_batch_authorized: true,
  next_batch_started: false,
};

/** The B001 artifacts that must now exist (they are the accepted baseline);
 *  validate-p0-b001.mjs performs the deep validation. */
const REQUIRED_B001_ARTIFACTS = [
  "aipt/input-manifest.json",
  "aipt/p0-b001/stable-ids.json",
  "aipt/p0-b001/visibility.json",
  "aipt/p0-b001/safety-profile.json",
];

const REQUIRED_B002_ARTIFACTS = [
  "aipt/p0-b002/README.md",
  "aipt/p0-b002/rule-id-map.json",
  "aipt/p0-b002/machine-rules.json",
  "aipt/p0-b002/semantic-graph.json",
];
const ALLOWED_B002_ARTIFACTS = new Set(REQUIRED_B002_ARTIFACTS);

function checkBatchStatus(s) {
  if (!s || typeof s !== "object") throw new Error("status.json: missing status object");
  const keys = Object.keys(s).sort();
  const expectedKeys = [...STATUS_KEYS_B002].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
    throw new Error(`status.json keys must be exactly ${JSON.stringify(expectedKeys)}, got ${JSON.stringify(keys)}`);
  }
  for (const [k, v] of Object.entries(EXPECTED_STATUS_B002)) {
    if (JSON.stringify(s[k]) !== JSON.stringify(v)) {
      throw new Error(`status.${k} must be exactly ${JSON.stringify(v)}, got ${JSON.stringify(s[k])}`);
    }
  }
}

function checkStatusAndArtifacts() {
  const status = loadJson("aipt/status.json");
  checkBatchStatus(status);
  if (status.previous_repo_batch.batch_id !== B001_BATCH || status.previous_repo_batch.status !== "MERGED_CLOSED") {
    throw new Error(`status.previous_repo_batch must record ${B001_BATCH} MERGED_CLOSED`);
  }
  // B001 artifacts are required now (accepted baseline), not rejected.
  for (const r of REQUIRED_B001_ARTIFACTS) {
    const abs = path.join(ROOT, r);
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      throw new Error(`required B001 artifact missing: ${r}`);
    }
  }
  // S1 freezes the complete B002 delivery surface: all four artifacts are
  // required and no other construction or later-batch path may appear.
  for (const r of REQUIRED_B002_ARTIFACTS) {
    const abs = path.join(ROOT, r);
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      throw new Error(`required B002 artifact missing after S1 finalization: ${r}`);
    }
  }
  for (const f of walk(path.join(ROOT, "aipt"))) {
    const r = relPath(f);
    if (r.startsWith("aipt/p0-b002/") && !ALLOWED_B002_ARTIFACTS.has(r)) {
      throw new Error(`unexpected P0-B002 artifact outside the explicit construction allowlist: ${r}`);
    }
    if (/^aipt\/p0-b00[3-9]\//i.test(r)) throw new Error(`unexpected later-batch artifact present: ${r}`);
    if (/^(rule-id-map|machine-rules|semantic-graph)\.json$/i.test(path.basename(f)) && !r.startsWith("aipt/p0-b002/")) {
      throw new Error(`P0-B002 rule authority artifact outside aipt/p0-b002/**: ${r}`);
    }
    if (/run[-_]?manifest/i.test(path.basename(f))) {
      throw new Error(`AIPT run manifest present: ${r} (not allowed: ${CURRENT_BATCH} is MERGED_CLOSED and ${NEXT_BATCH} is authorized to prepare but not started)`);
    }
  }
  pass(`status: ${CURRENT_BATCH} MERGED_CLOSED (closeout); previous repo batch ${B001_BATCH} MERGED_CLOSED; external predecessor AIPT-M0-B006 closed successfully; global_wip=0; next ${NEXT_BATCH} AUTHORIZED_TO_PREPARE, not started; B001 artifacts frozen; B002 surface explicit`);
}

// ---------------------------------------------------------------------------
// 6. premades-v2.json vs. the accepted sources
// ---------------------------------------------------------------------------

const ROSTER = ["游隼", "短波", "静水", "底片"];
const PRESERVED = ["铁砧", "缝线"];
const SOURCE_PATHS = [
  "campaign/00-campaign.md",
  "campaign/proposals/premades-v1.md",
  "campaign/proposals/premades-v2.md",
  "campaign/rules/mechanics-fine-v1.md",
];

const EXPECTED_TIER_DEFS = {
  "当众爆发": "侦破即爆：被侦破者与侦破者各压力+1；相关羁绊立即受损（A6 抵命不可用，至休整\"联络\"修复）；下一幕必须发生一次队内摊牌场景（GM 即兴，玩家自行决定态度）",
  "长线影响": "不即爆：该秘密关联的谜底线索立即对全队公开一条（GM 选，走角色规则知识接口）；终局前结算一次长线后果",
  "纯私人": "只改变侦破者与被侦破者之间的双向羁绊状态（受损或转向）；不影响队伍局势与长线",
};

const EXPECTED_CARD_TIERS = { "游隼": "当众爆发", "短波": "长线影响", "静水": "当众爆发", "底片": "长线影响" };

const EXPECTED_SECRETS = {
  "游隼": "你卡面上的名字是假的。上一个身份因一次「不该失手」的失手作废——那次你偷出来的不是财物，而是一段「不该存在的录音」。事后你记不清那晚最后十分钟，每次回想，那十分钟都会更短一点。管理方用你本名下的通缉令招了你，你接单只为换回被他们「保管」的真名。你要查清那晚到底发生了什么，以及自己还漏记了多少。",
  "短波": "你的「退隐」是假的。你不是功成身退，而是在一次监听任务里截到一段不该存在的信号，随后整个小组被灭口，只有你带着那段信号逃了出来。你把信号藏进了自己的植入物里，它偶尔会在你的监控画面里「重播」已经死掉的人。管理方知道你身上有它，用「帮你屏蔽」当诱饵。你的目标是销毁那段信号，并找出当年下令灭口的人——哪怕那意味着承认自己已经不完整了。",
  "静水": "你对外说自己是「退休」了。真相是三年前一桩劫持案，你为救孩子亲手放走了真正的犯人，并作了伪证结案。孩子活了下来，可每次见你，他都说「叔叔，你背后多了一个人」。管理方握着那份伪证把你招进队里。你的私人目标不是查管理方，而是在任何人发现之前，找到被你放走的人、把案子真正了结——哪怕代价是让自己也「少掉」一段人生。",
  "底片": "你不是被掳进来的，你是自己走进来的。你追「管理方」这条线已经两年，编辑、线人、连同你的一个消息来源，都在这条线上先后消失。你把他们写进稿子，却发现稿子上的字会自己增减——你开始分不清哪些是你查到的，哪些是你「写出来」的。你要把报道写完、活着带出去。为此你不介意利用队里任何一个人，哪怕最后只有你一个人记得他们是谁。",
};

const SECRET_OPENERS = {
  "游隼": "你卡面上的名字是假的",
  "短波": "你的「退隐」是假的",
  "静水": "你对外说自己是「退休」了",
  "底片": "你不是被掳进来的，你是自己走进来的",
};

const EXPECTED_CLUES = {
  "游隼": ["从不摘手套、从不直呼真名（全队可见，读人/观察可识破紧张源）", "通缉数据库出现\"叶岚\"旧案关联（任务1 侦查文本）"],
  "短波": ["黑眼圈＋植入物接口痕迹；监控画面偶尔\"重播已死的人\"", "信号日志/监听记录出现无法溯源的数据流（电子对抗）"],
  "静水": ["\"退休\"却保留审讯/法律程序熟练度，旧徽章壳从不离身", "徽章编号可查，对应一桩未结案（法证/情报分析）"],
  "底片": ["对每个队友都做了档案式记录（记录/观察可发现）", "她稿件上的字会增减——队友若读过稿件（文本比对）"],
};

const EXPECTED_TRIGGERS = {
  "游隼": { trigger: "见到与\"录音／那晚十分钟\"相关的异常（录音设备、被剪掉的监控时段）", gm_observation: "你的手腕开始发凉，那晚最后十分钟又短了一点。" },
  "短波": { trigger: "见到\"那段信号\"相关异常（监控重播、无溯源数据流）", gm_observation: "你的植入物轻响了一下，画面里那个已经死掉的人又在看你。" },
  "静水": { trigger: "见到与伪证案／被放走犯人相关的线索", gm_observation: "你背后像多站了一个人——孩子说过的那种感觉。" },
  "底片": { trigger: "见到与管理方报道线相关的文本（编辑/线人的名字出现）", gm_observation: "你口袋里的稿子多了一行你没写过的话。" },
};

const EXPECTED_ATTRS = {
  "游隼": { "体能": 55, "敏捷": 60, "意志": 30, "智识": 35, "共情": 20 },
  "短波": { "体能": 30, "敏捷": 35, "意志": 50, "智识": 60, "共情": 25 },
  "静水": { "体能": 35, "敏捷": 20, "意志": 55, "智识": 40, "共情": 60 },
  "底片": { "体能": 20, "敏捷": 30, "意志": 40, "智识": 55, "共情": 50 },
};

const EXPECTED_SKILLS = {
  "游隼": {
    high: { "隐匿": 68, "开锁与物理入侵": 65, "攀爬": 60 },
    regular: { "观察": 50, "反侦察": 45, "潜入行动": 40, "驾驶": 30 },
    total: 358,
    adjustments: "观察 55→50；伪装 30→反侦察 45",
  },
  "短波": {
    high: { "电子对抗": 70, "反侦察": 62, "通信": 58 },
    regular: { "数据处理": 40, "爆破（受限）": 35, "伪装": 30, "驾驶": 30 },
    total: 325,
    adjustments: "电子干扰并入电子对抗；密码学→数据处理",
  },
  "静水": {
    high: { "话术": 65, "审讯": 60, "读人": 60 },
    regular: { "情报分析": 40, "近身格斗": 30, "驾驶": 30 },
    total: 285,
    adjustments: "唬骗并入话术；冷静→意志素质；法律/刑侦→情报分析",
  },
  "底片": {
    high: { "观察": 62, "搜查": 60, "记录": 58 },
    regular: { "伪装": 50, "法证": 45, "话术": 45, "情报分析": 40, "驾驶": 30 },
    total: 390,
    adjustments: "伪装 55→50；调查/取证拆 60/45；删潜行 30（靠伪装混入，弱项）",
  },
};

const EXPECTED_DISCOVERY_RULE = "没有线索的\"可侦破\"是空转。每秘密配 2 条可被局内行动发现的线索；GM 不主动给，玩家用 观察/读人/搜查/法证/审讯 或规则知识接口触发；须证据＋成功检定，猜到不算。";
const EXPECTED_TRIGGER_RULE = "用法：触发器只递见闻，不递结论；玩家自己在规则知识页记推测。每触发器一任务至多触发一次，防滥用。";
const EXPECTED_DETECTION_INTERFACE = "当众爆发档的秘密被侦破→该对的抵命立即不可用（其余两对不受影响）；纯私人档被侦破→只改该对状态；长线影响档→不即改羁绊，改公开线索。";

const BOND_MECHANICS = {
  frequency: "每任务 1 次，二选一",
  choices: { "支撑": "免 1 压力", "抵命": "逆转窗口②免污染" },
  damage: "抵命后关系受损",
  repair: "休整\"联络\"1 行动点",
};

const EXPECTED_BONDS = [
  {
    pair: ["游隼", "静水"],
    perspectives: { "游隼": "欠他一次放行，防着这条子", "静水": "把他当\"不敢查下去的案子\"养着" },
    tension_core: "追捕与放行的旧账",
    mechanics: BOND_MECHANICS,
  },
  {
    pair: ["短波", "底片"],
    perspectives: { "短波": "欠她一份答案，怕她知道自己带着信号", "底片": "他是\"那边出来的人\"，也是仅剩的活线索" },
    tension_core: "灭口案与活线索",
    mechanics: BOND_MECHANICS,
  },
];

function splitSections(md, marker) {
  const out = new Map();
  // `(?![\\s\\S])` is a valid end-of-input construction (replaces the
  // unsupported `\\z`); section boundaries stay exactly at line-start markers
  // or the absolute end of the input.
  const re = new RegExp("^" + marker + " ([^\\n]*)\\n([\\s\\S]*?)(?=^" + marker + " |(?![\\s\\S]))", "gm");
  for (const m of md.matchAll(re)) out.set(m[1].trim(), m[2]);
  return out;
}

function getSection(map, prefix) {
  for (const k of map.keys()) {
    if (k.startsWith(prefix)) return map.get(k);
  }
  throw new Error("accepted source section not found: " + prefix);
}

function tableRows(section) {
  const rows = [];
  for (const line of (section || "").split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    rows.push(t.split("|").slice(1, -1).map((c) => c.trim()));
  }
  return rows;
}

function parseSkillCell(cell) {
  const map = {};
  for (const tok of cell.split("·")) {
    const m = /^(.+?)\s+(\d+)(（[^）]*）)?$/.exec(tok.trim());
    if (!m) throw new Error("cannot parse skill token: " + JSON.stringify(tok));
    map[m[1] + (m[3] || "")] = Number(m[2]);
  }
  return map;
}

function extractAttributes(section) {
  const line = section.split(/\r?\n/).find((l) => l.includes("五素质"));
  if (!line) throw new Error("premades-v1.md: 五素质 line missing");
  const m = /体能\s*(\d+)\s*｜\s*敏捷\s*(\d+)\s*｜\s*意志\s*(\d+)\s*｜\s*智识\s*(\d+)\s*｜\s*共情\s*(\d+)/.exec(line);
  if (!m) throw new Error("premades-v1.md: cannot parse 五素质 line: " + line.trim());
  return { "体能": Number(m[1]), "敏捷": Number(m[2]), "意志": Number(m[3]), "智识": Number(m[4]), "共情": Number(m[5]) };
}

function extractSecret(section, opener) {
  for (const line of section.split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith(">")) {
      const body = t.replace(/^>\s?/, "").trim();
      if (body.startsWith(opener)) return body;
    }
  }
  throw new Error("premades-v1.md: secret card blockquote not found (opener: " + opener + ")");
}

function checkPremades(json) {
  const srcV1 = readRel("campaign/proposals/premades-v1.md");
  const srcV2 = readRel("campaign/proposals/premades-v2.md");
  const srcMechanics = readRel("campaign/rules/mechanics-fine-v1.md");

  if (json.aipt_schema !== "aipt.premades-v2.v1") {
    throw new Error(`premades-v2.aipt_schema must be exactly "aipt.premades-v2.v1", got ${JSON.stringify(json.aipt_schema)}`);
  }
  if (json.status !== "PLAYTESTABLE_DRAFT") throw new Error(`premades-v2.status must be exactly "PLAYTESTABLE_DRAFT", got ${JSON.stringify(json.status)}`);
  if (json.delivery !== "AIPT FIRST ROSTER V2") throw new Error(`premades-v2.delivery must be exactly "AIPT FIRST ROSTER V2", got ${JSON.stringify(json.delivery)}`);
  const src = json.source;
  if (!src || !Array.isArray(src.paths) || JSON.stringify(src.paths) !== JSON.stringify(SOURCE_PATHS)) {
    throw new Error("premades-v2.source.paths must be exactly the four accepted source paths");
  }
  for (const p of src.paths) {
    if (!existsSync(path.join(ROOT, p))) throw new Error(`premades-v2.source.paths entry missing on disk: ${p}`);
  }
  if (src.bond_mechanics_source !== "campaign/rules/mechanics-fine-v1.md §A6") {
    throw new Error("premades-v2.source.bond_mechanics_source must be exactly \"campaign/rules/mechanics-fine-v1.md §A6\"");
  }
  if (src.gm_decisions !== "#62–#66") throw new Error("premades-v2.source.gm_decisions must be exactly \"#62–#66\"");

  if (JSON.stringify(json.first_roster) !== JSON.stringify(ROSTER)) {
    throw new Error(`premades-v2.first_roster must be exactly the ordered roster ${JSON.stringify(ROSTER)}, got ${JSON.stringify(json.first_roster)}`);
  }
  const preserved = json.preserved_project_premades && json.preserved_project_premades.excluded_from_first_roster;
  if (!Array.isArray(preserved) || JSON.stringify([...preserved].sort()) !== JSON.stringify([...PRESERVED].sort())) {
    throw new Error("premades-v2.preserved_project_premades.excluded_from_first_roster must be exactly 铁砧 and 缝线");
  }
  if (json.first_roster.includes("铁砧") || json.first_roster.includes("缝线")) {
    throw new Error("铁砧/缝线 must stay outside the first roster");
  }

  const chars = json.characters;
  if (!chars || typeof chars !== "object") throw new Error("premades-v2.characters missing");
  if (JSON.stringify(Object.keys(chars).sort()) !== JSON.stringify([...ROSTER].sort())) {
    throw new Error("premades-v2.characters keys must be exactly the four first-roster names");
  }

  assertNormMapEqual(json.secret_tiers, EXPECTED_TIER_DEFS, "premades-v2.secret_tiers");
  if (norm(json.discovery_rule) !== norm(EXPECTED_DISCOVERY_RULE)) throw new Error("premades-v2.discovery_rule drifted from accepted text");
  if (norm(json.trigger_rule) !== norm(EXPECTED_TRIGGER_RULE)) throw new Error("premades-v2.trigger_rule drifted from accepted text");
  if (norm(json.detection_interface) !== norm(EXPECTED_DETECTION_INTERFACE)) throw new Error("premades-v2.detection_interface drifted from accepted text");

  // --- Extract/normalize the accepted source text ---
  const v2 = splitSections(srcV2, "##");
  const s1 = getSection(v2, "1.");
  const s2 = getSection(v2, "2.");
  const s3 = getSection(v2, "3.");
  const s4 = getSection(v2, "4.");
  const s7 = getSection(v2, "7.");

  const srcTierDefs = {};
  for (const row of tableRows(s1)) {
    if (Object.prototype.hasOwnProperty.call(EXPECTED_TIER_DEFS, row[0])) {
      if (srcTierDefs[row[0]]) throw new Error(`duplicate tier definition row in accepted source §1: ${row[0]}`);
      srcTierDefs[row[0]] = row[1];
    }
  }
  for (const [tier, def] of Object.entries(EXPECTED_TIER_DEFS)) {
    if (!srcTierDefs[tier] || norm(srcTierDefs[tier]) !== norm(def)) {
      throw new Error(`accepted source §1 tier definition drifted for ${tier}`);
    }
  }
  const srcCardTiers = {};
  for (const row of tableRows(s1)) if (ROSTER.includes(row[0])) srcCardTiers[row[0]] = row[1];

  const srcClues = {};
  for (const row of tableRows(s2)) if (ROSTER.includes(row[0])) srcClues[row[0]] = [row[1], row[2]];

  const srcTriggers = {};
  for (const row of tableRows(s4)) if (ROSTER.includes(row[0])) srcTriggers[row[0]] = { trigger: row[1], gm_observation: row[2] };

  const srcSkills = {};
  for (const row of tableRows(s7)) {
    if (ROSTER.includes(row[0])) {
      srcSkills[row[0]] = {
        high: parseSkillCell(row[1]),
        regular: parseSkillCell(row[2]),
        total: Number(row[3]),
        adjustments: row[4],
      };
    }
  }

  const detLine = s3.split(/\r?\n/).find((l) => l.includes("侦破接口"));
  if (!detLine) throw new Error("accepted source §3 missing the 侦破接口 line");
  if (norm(detLine.replace(/^.*?：\*\*\s*/, "")) !== norm(EXPECTED_DETECTION_INTERFACE)) {
    throw new Error("accepted source §3 侦破接口 drifted from accepted text");
  }

  const discLine = s2.split(/\r?\n/).find((l) => l.trim().startsWith(">") && l.includes("没有线索"));
  if (!discLine) throw new Error("accepted source §2 missing the discovery rule blockquote");
  if (norm(discLine.replace(/^>\s?/, "")) !== norm(EXPECTED_DISCOVERY_RULE)) throw new Error("accepted source §2 discovery rule drifted");

  const trigLine = s4.split(/\r?\n/).find((l) => l.trim().startsWith(">") && l.includes("用法：触发器"));
  if (!trigLine) throw new Error("accepted source §4 missing the trigger rule blockquote");
  if (norm(trigLine.replace(/^>\s?/, "")) !== norm(EXPECTED_TRIGGER_RULE)) throw new Error("accepted source §4 trigger rule drifted");

  const s3Header = tableRows(s3).find((r) => r[0] === "对");
  if (!s3Header || !norm(s3Header[4] || "").includes(norm(BOND_MECHANICS.frequency))) {
    throw new Error("accepted source §3 bond mechanics header drifted (frequency)");
  }
  const allBondRows = tableRows(s3).filter((r) => /^(游隼↔静水|短波↔底片|铁砧↔缝线)$/.test(r[0]));
  if (allBondRows.length !== 3) throw new Error(`accepted source §3 must contain the three bond rows, found ${allBondRows.length}`);
  // The accepted table uses 同上 for mechanics/repair cells; resolve that
  // inheritance from the preceding row before comparing.
  for (let i = 0; i < allBondRows.length; i++) {
    for (const idx of [4, 5]) {
      if (norm(allBondRows[i][idx] || "") === "同上") {
        if (i === 0) throw new Error("accepted source §3: the first bond row must spell out its mechanics (no 同上)");
        allBondRows[i][idx] = allBondRows[i - 1][idx];
      }
    }
  }
  const bondRows = allBondRows.filter((r) => r[0] === "游隼↔静水" || r[0] === "短波↔底片");
  if (bondRows.length !== 2) throw new Error(`accepted source §3 must contain exactly the two first-roster bond rows, found ${bondRows.length}`);

  const v1 = splitSections(srcV1, "###");
  const v1ByName = {};
  for (const [head, body] of v1) {
    const m = /^([1-6])\.\s+[^\n]*「(游隼|短波|静水|底片|铁砧|缝线)」/.exec(head);
    if (m) v1ByName[m[2]] = body;
  }
  for (const name of ROSTER) {
    if (!v1ByName[name]) throw new Error(`premades-v1.md section for ${name} not found`);
  }

  const a6 = getSection(splitSections(srcMechanics, "###"), "A6");
  const a6n = norm(a6);
  for (const phrase of ["每任务可用1次（二选一）", "支撑：免1压力", "抵命：逆转窗口②免污染", "关系受损", "休整", "联络", "1行动点"]) {
    if (!a6n.includes(phrase)) throw new Error(`mechanics-fine-v1.md §A6 must contain ${phrase} (bond mechanics source)`);
  }

  // --- Per-character exact checks (JSON vs. expected vs. extracted sources) ---
  for (const name of ROSTER) {
    const c = chars[name];
    if (!c || typeof c !== "object") throw new Error(`premades-v2.characters.${name} missing`);
    if (c.name_zh !== name) throw new Error(`premades-v2.characters.${name}.name_zh must be exactly ${name}`);

    assertMapEqual(c.attributes, EXPECTED_ATTRS[name], `premades-v2.characters.${name}.attributes`);
    assertMapEqual(extractAttributes(v1ByName[name]), EXPECTED_ATTRS[name], `premades-v1.md ${name} 五素质`);

    if (c.secret && c.secret.tier !== EXPECTED_CARD_TIERS[name]) {
      throw new Error(`premades-v2.characters.${name}.secret.tier must be ${EXPECTED_CARD_TIERS[name]}, got ${JSON.stringify(c.secret.tier)}`);
    }
    if (srcCardTiers[name] !== EXPECTED_CARD_TIERS[name]) throw new Error(`accepted source §1 card tier drifted for ${name}`);
    if (norm(c.secret && c.secret.text) !== norm(EXPECTED_SECRETS[name])) {
      throw new Error(`premades-v2.characters.${name}.secret.text drifted from the accepted secret card`);
    }
    if (norm(extractSecret(v1ByName[name], SECRET_OPENERS[name])) !== norm(EXPECTED_SECRETS[name])) {
      throw new Error(`premades-v1.md secret card drifted for ${name}`);
    }

    const clues = c.discovery_clues;
    if (!Array.isArray(clues) || clues.length !== 2) {
      throw new Error(`premades-v2.characters.${name}.discovery_clues must have exactly two clues`);
    }
    if (norm(clues[0]) !== norm(EXPECTED_CLUES[name][0]) || norm(clues[1]) !== norm(EXPECTED_CLUES[name][1])) {
      throw new Error(`premades-v2.characters.${name}.discovery_clues drifted from the accepted clues`);
    }
    if (!srcClues[name] || norm(srcClues[name][0]) !== norm(EXPECTED_CLUES[name][0]) || norm(srcClues[name][1]) !== norm(EXPECTED_CLUES[name][1])) {
      throw new Error(`accepted source §2 clues drifted for ${name}`);
    }

    const trig = c.private_trigger;
    if (!trig || norm(trig.trigger) !== norm(EXPECTED_TRIGGERS[name].trigger) || norm(trig.gm_observation) !== norm(EXPECTED_TRIGGERS[name].gm_observation)) {
      throw new Error(`premades-v2.characters.${name}.private_trigger drifted from the accepted trigger list`);
    }
    if (!srcTriggers[name] || norm(srcTriggers[name].trigger) !== norm(EXPECTED_TRIGGERS[name].trigger) || norm(srcTriggers[name].gm_observation) !== norm(EXPECTED_TRIGGERS[name].gm_observation)) {
      throw new Error(`accepted source §4.5 triggers drifted for ${name}`);
    }

    const fs = c.final_skills;
    if (!fs) throw new Error(`premades-v2.characters.${name}.final_skills missing`);
    assertMapEqual(fs.high, EXPECTED_SKILLS[name].high, `premades-v2.characters.${name}.final_skills.high`);
    assertMapEqual(fs.regular, EXPECTED_SKILLS[name].regular, `premades-v2.characters.${name}.final_skills.regular`);
    for (const v of Object.values(fs.high)) {
      if (v < 55) throw new Error(`premades-v2.characters.${name}: high skill below 55`);
    }
    const allValues = [...Object.values(fs.high), ...Object.values(fs.regular)];
    const n55 = allValues.filter((v) => v >= 55).length;
    if (n55 !== 3) throw new Error(`premades-v2.characters.${name}: exactly 3 skills >=55 required, got ${n55}`);
    const sum = allValues.reduce((a, b) => a + b, 0);
    if (fs.skill_total !== EXPECTED_SKILLS[name].total) {
      throw new Error(`premades-v2.characters.${name}.final_skills.skill_total must be ${EXPECTED_SKILLS[name].total}, got ${fs.skill_total}`);
    }
    if (sum !== fs.skill_total) {
      throw new Error(`premades-v2.characters.${name}: skill values sum to ${sum}, skill_total is ${fs.skill_total}`);
    }
    if (norm(fs.adjustments) !== norm(EXPECTED_SKILLS[name].adjustments)) {
      throw new Error(`premades-v2.characters.${name}.final_skills.adjustments drifted`);
    }
    const ss = srcSkills[name];
    if (!ss) throw new Error(`accepted source §7 row missing for ${name}`);
    assertMapEqual(ss.high, EXPECTED_SKILLS[name].high, `§7 ${name} high skills`);
    assertMapEqual(ss.regular, EXPECTED_SKILLS[name].regular, `§7 ${name} regular skills`);
    if (ss.total !== EXPECTED_SKILLS[name].total) throw new Error(`§7 ${name} total drifted`);
    if (norm(ss.adjustments) !== norm(EXPECTED_SKILLS[name].adjustments)) throw new Error(`§7 ${name} adjustments drifted`);
  }

  // --- Exactly the two approved bonds, mechanics sourced from §A6 ---
  const bonds = json.bonds;
  if (!Array.isArray(bonds) || bonds.length !== 2) {
    throw new Error("premades-v2.bonds must be exactly the two approved first-roster bonds");
  }
  for (let i = 0; i < EXPECTED_BONDS.length; i++) {
    const b = bonds[i];
    const e = EXPECTED_BONDS[i];
    if (!b || JSON.stringify(b.pair) !== JSON.stringify(e.pair)) {
      throw new Error(`premades-v2.bonds[${i}].pair must be exactly ${JSON.stringify(e.pair)}`);
    }
    for (const who of e.pair) {
      if (norm(b.perspectives && b.perspectives[who]) !== norm(e.perspectives[who])) {
        throw new Error(`premades-v2.bonds[${i}].perspectives.${who} drifted`);
      }
    }
    if (norm(b.tension_core) !== norm(e.tension_core)) throw new Error(`premades-v2.bonds[${i}].tension_core drifted`);
    const m = b.mechanics;
    if (!m) throw new Error(`premades-v2.bonds[${i}].mechanics missing`);
    if (norm(m.frequency) !== norm(e.mechanics.frequency)) throw new Error(`premades-v2.bonds[${i}].mechanics.frequency drifted`);
    for (const choice of ["支撑", "抵命"]) {
      if (norm(m.choices && m.choices[choice]) !== norm(e.mechanics.choices[choice])) {
        throw new Error(`premades-v2.bonds[${i}].mechanics.choices.${choice} drifted`);
      }
    }
    if (norm(m.damage) !== norm(e.mechanics.damage)) throw new Error(`premades-v2.bonds[${i}].mechanics.damage drifted`);
    if (norm(m.repair) !== norm(e.mechanics.repair)) throw new Error(`premades-v2.bonds[${i}].mechanics.repair drifted`);

    const row = bondRows.find((r) => r[0] === e.pair.join("↔"));
    if (!row) throw new Error(`accepted source §3 bond row missing for ${e.pair.join("↔")}`);
    if (norm(row[1]) !== norm(e.perspectives[e.pair[0]]) || norm(row[2]) !== norm(e.perspectives[e.pair[1]]) || norm(row[3]) !== norm(e.tension_core)) {
      throw new Error(`accepted source §3 bond row drifted for ${e.pair.join("↔")}`);
    }
    const mcell = norm(row[4] || "");
    if (!mcell.includes(norm(e.mechanics.choices["支撑"])) || !mcell.includes(norm(e.mechanics.choices["抵命"]))) {
      throw new Error(`accepted source §3 bond mechanics drifted for ${e.pair.join("↔")}`);
    }
    if (norm(row[5]) !== norm(e.mechanics.repair)) throw new Error(`accepted source §3 bond repair drifted for ${e.pair.join("↔")}`);
  }

  pass("premades-v2: schema/status/delivery, roster, tier definitions, clues, triggers, skills, bonds — exact vs accepted sources");
}

// ---------------------------------------------------------------------------
// 7. Credential / private-path / private prompt- and package-marker scan of
//    the generated delivery surfaces
//    (needles assembled from fragments so this validator does not flag itself)
// ---------------------------------------------------------------------------

function buildNeedles() {
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
        "\"(" +
          ["pass" + "word", "passwd", "client_" + "secret", "api_" + "key", "access_" + "key", "secret_" + "key", "private_" + "key", "ssh_" + "key"].join("|") +
          ")\"\\s*:\\s*\"[^\"]+\"",
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
      label: "private data marker " + ["HUMAN", "PRIVATE", "DATA"].join("_"),
      re: new RegExp("HUMAN_" + "PRIVATE_" + "DATA"),
      // The B001 metadata files (aipt/p0-b001/**) legitimately carry the
      // required participant-data classification token; every other surface
      // keeps rejecting it. Actual participant data (see the two needles
      // below) stays rejected everywhere, including inside p0-b001.
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

function checkScan() {
  const files = [];
  for (const dir of ["aipt", "LICENSES", path.join("scripts", "aipt")]) {
    const abs = path.join(ROOT, dir);
    if (existsSync(abs)) files.push(...walk(abs));
  }
  const workflowFile = path.join(ROOT, ".github", "workflows", "aipt-content-gate.yml");
  if (existsSync(workflowFile)) files.push(workflowFile);
  files.sort();
  const needles = buildNeedles();
  let scanned = 0;
  for (const f of files) {
    if (!statSync(f).isFile()) continue;
    const r = relPath(f);
    const lines = readRel(r).split(/\r?\n/);
    scanned += 1;
    for (const n of needles) {
      // Classification metadata in B001 metadata files is the one sanctioned
      // home of the participant-data classification token; everything else
      // stays scanned.
      if (n.b001MetadataAllowed && r.startsWith("aipt/p0-b001/")) continue;
      for (let i = 0; i < lines.length; i++) {
        if (n.re.test(lines[i])) {
          throw new Error(
            `possible ${n.label} material in ${r}:${i + 1} (scanned surfaces: aipt/**, LICENSES/**, scripts/aipt/**, the workflow)`,
          );
        }
      }
    }
  }
  pass(`delivery-surface scan: no credential material, private absolute paths, or actual participant data (${scanned} files scanned; ${["HUMAN", "PRIVATE", "DATA"].join("_")} classification token allowed only in aipt/p0-b001/)`);
}

// ---------------------------------------------------------------------------
// 8. Static check of the AIPT Content Gate workflow (hardened permissions)
// ---------------------------------------------------------------------------

/**
 * Parse a `permissions:` mapping block starting at `startIdx`. Collects
 * `key: value` entries, skipping blank and comment lines, until the first
 * non-blank, non-comment line indented no deeper than the `permissions:` key
 * itself (for the top-level block: the next top-level key). Returns
 * `{ key, value, line }` entries.
 */
function parsePermissionBlock(lines, startIdx) {
  const baseIndent = (lines[startIdx].match(/^[ \t]*/) || [""])[0];
  const entries = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue; // blank line: keep parsing the block
    if (trimmed.startsWith("#")) continue; // comment line: keep parsing
    const indent = (line.match(/^[ \t]*/) || [""])[0];
    if (indent.length <= baseIndent.length) break; // next top-level key / sibling
    const m = /^[ \t]*([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*?)\s*$/.exec(line);
    if (!m) break; // unexpected structure: stop (fail-closed elsewhere)
    entries.push({ key: m[1], value: m[2].replace(/^(['"])(.*)\1$/, "$2").trim(), line: i + 1 });
  }
  return entries;
}

function checkWorkflow() {
  const rel = ".github/workflows/aipt-content-gate.yml";
  const abs = path.join(ROOT, rel);
  if (!existsSync(abs) || !statSync(abs).isFile()) throw new Error(`workflow file missing: ${rel}`);
  const text = readRel(rel);
  const lines = text.split(/\r?\n/);
  const fails = [];
  const require = (cond, msg) => {
    if (!cond) fails.push(msg);
  };
  require(lines.some((l) => l.trim() === "name: AIPT Content Gate"), "top-level name must be exactly `name: AIPT Content Gate`");
  require(
    /^on:\s*$/m.test(text) && /^\s*push:\s*$/m.test(text) && /^\s*pull_request:\s*$/m.test(text),
    "must trigger on push and pull_request",
  );
  const topPermLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^permissions:\s*$/.test(lines[i])) topPermLines.push(i);
  }
  require(topPermLines.length === 1, "exactly one top-level permissions block is required");
  let topEntries = [];
  if (topPermLines.length === 1) {
    topEntries = parsePermissionBlock(lines, topPermLines[0]);
  }
  require(
    topEntries.length === 1 && topEntries[0].key === "contents" && topEntries[0].value === "read",
    `top-level permissions must have exactly one mapping entry contents: read, got ${JSON.stringify(topEntries.map((e) => `${e.key}: ${e.value}`))}`,
  );
  const writeEntries = [];
  for (const e of topEntries) {
    if (e.value === "write") writeEntries.push(`top-level ${e.key}: write (line ${e.line})`);
  }
  for (let i = 0; i < lines.length; i++) {
    if (!/^[ \t]+permissions:\s*$/.test(lines[i])) continue;
    for (const e of parsePermissionBlock(lines, i)) {
      if (e.value === "write") writeEntries.push(`job-level ${e.key}: write (line ${e.line})`);
    }
  }
  // A top-level key valued write (e.g. an injected `actions: write` after a
  // blank line) is rejected even though it is not part of the parsed block.
  for (let i = 0; i < lines.length; i++) {
    const m = /^([A-Za-z][A-Za-z0-9_-]*):\s*["']?write["']?\s*$/.exec(lines[i]);
    if (m) writeEntries.push(`top-level ${m[1]}: write (line ${i + 1})`);
  }
  require(writeEntries.length === 0, `no permission entry may be valued write: ${writeEntries.join("; ")}`);
  require(!/write-all|read-all/.test(text), "no write-all/read-all permissions allowed");
  const uses = lines.map((l) => l.trim()).filter((l) => /^uses:\s*/.test(l));
  const pinned = [
    "uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
    "uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
  ];
  require(uses.length === 2 && pinned.every((p) => uses.includes(p)), "must use only these two immutable actions: " + pinned.join(" and "));
  require(/^\s*persist-credentials:\s*false\s*$/m.test(text), "checkout must set persist-credentials: false");
  require(/^\s*node-version:\s*['"]?24\.19\.0['"]?\s*$/m.test(text), "setup-node must set node-version: 24.19.0 exactly");
  require(/^\s*runs-on:\s*ubuntu-24\.04\s*$/m.test(text), "job must run on ubuntu-24.04");
  require(/^\s*timeout-minutes:\s*5\s*$/m.test(text), "job must set timeout-minutes: 5");
  require(text.includes("node --version") && text.includes("v24.19.0"), "must explicitly assert node --version is v24.19.0");
  require(text.includes("node scripts/aipt/validate-p0-b000.mjs"), "must run node scripts/aipt/validate-p0-b000.mjs");
  // B000, B001 and B002 must run exactly once as separate, clearly named
  // steps after S1 finalization.
  const validatorRuns = lines
    .map((l) => l.trim())
    .filter((l) => /^run:\s*node scripts\/aipt\/validate-p0-b\d+\.mjs\s*$/.test(l));
  const allowedValidatorRuns = new Set([
    "run: node scripts/aipt/validate-p0-b000.mjs",
    "run: node scripts/aipt/validate-p0-b001.mjs",
    "run: node scripts/aipt/validate-p0-b002.mjs",
  ]);
  require(
    validatorRuns.length === 3 &&
      new Set(validatorRuns).size === 3 &&
      [...allowedValidatorRuns].every((run) => validatorRuns.includes(run)),
    `must run B000, B001 and B002 exactly once as three separate steps; got ${JSON.stringify(validatorRuns)}`,
  );
  const forbidden = [];
  if (/\bnpm\s+(install|ci|i)\b/.test(text)) forbidden.push("npm install");
  if (/\bpnpm\b/.test(text)) forbidden.push("pnpm");
  if (/\byarn\b/.test(text)) forbidden.push("yarn");
  if (/\bnpx\b/.test(text)) forbidden.push("npx");
  if (/^\s*cache:\s*/m.test(text)) forbidden.push("cache");
  if (/GITHUB_TOKEN|secrets\.[A-Za-z_]/.test(text)) forbidden.push("secrets/tokens");
  if (/\b(curl|wget)\b/.test(text) || /\bgit\s+(clone|push|pull|fetch)\b/.test(text)) forbidden.push("remote calls");
  require(forbidden.length === 0, `forbidden workflow content detected: ${forbidden.join(", ")}`);
  if (fails.length) throw new Error(fails.join("; "));
  pass("workflow: AIPT Content Gate static structure OK (B000+B001+B002 required exactly once; immutable pins, Node 24.19.0, contents:read, no install/cache/token/remote calls)");
}

// ---------------------------------------------------------------------------
// 9. Eight in-memory negative probes — every one must be rejected
// ---------------------------------------------------------------------------

function runProbes() {
  const licensing = loadJson("aipt/p0-b000/licensing.json");
  const premades = loadJson("aipt/p0-b000/premades-v2.json");
  const probes = [
    ["unclassified path claimed as content", () => requireContentPolicy(licensing.path_scope, "docs/unknown/never-classified.md")],
    [".opencode/** blanket-classified as content", () => {
      const m = structuredClone(licensing);
      const rule = m.path_scope.rules.find((r) => r.pattern === ".opencode/**");
      if (!rule) throw new Error("probe setup: .opencode/** rule missing");
      rule.classification = "CONTENT_POLICY_APPLIES";
      checkPathScope(m);
    }],
    ["final_legal_text_published=true", () => {
      const m = structuredClone(licensing);
      m.final_legal_text_published = true;
      checkLicensingValues(m);
    }],
    ["license_ref drift", () => {
      const m = structuredClone(licensing);
      m.license_ref = "LicenseRef-UNREGISTERED-NC-SA-2.0";
      checkLicensingValues(m);
    }],
    ["游隼 observation 50→55", () => {
      const m = structuredClone(premades);
      m.characters["游隼"].final_skills.regular["观察"] = 55;
      checkPremades(m);
    }],
    ["短波 skill total drift", () => {
      const m = structuredClone(premades);
      m.characters["短波"].final_skills.skill_total = 326;
      checkPremades(m);
    }],
    ["铁砧 inserted into first_roster", () => {
      const m = structuredClone(premades);
      m.first_roster = [...m.first_roster, "铁砧"];
      checkPremades(m);
    }],
    ["character_id injected", () => {
      const m = structuredClone(premades);
      m.characters["游隼"].character_id = "Y-001";
      checkForbiddenKeys(m, "probe:premades-v2.json");
    }],
  ];
  let rejected = 0;
  probes.forEach(([label, fn], i) => {
    try {
      fn();
      fail(`negative probe must reject but did not: ${label}`);
    } catch {
      rejected += 1;
      console.log(`PASS negative probe ${i + 1}/8 (${label}): rejected`);
    }
  });
  if (rejected === 8) {
    console.log("PASS negative probes: 8/8 rejected as expected");
  } else {
    console.error(`FAIL negative probes: only ${rejected}/8 rejected as expected`);
  }
}

// ---------------------------------------------------------------------------
// 9b. In-memory status-mutation probe set — every stale/legacy/contradictory
//     mutation of the legal B002 MERGED_CLOSED closeout status must reject.
// ---------------------------------------------------------------------------

function runStatusProbes() {
  const base = loadJson("aipt/status.json");
  const probes = [
    ["current status drift (IN_PROGRESS)", () => checkBatchStatus({ ...base, status: "IN_PROGRESS" })],
    ["global_wip=1", () => checkBatchStatus({ ...base, global_wip: 1 })],
    ["previous_repo_batch.status drift", () =>
      checkBatchStatus({ ...base, previous_repo_batch: { ...base.previous_repo_batch, status: "IN_PROGRESS" } })],
    ["previous_repo_batch.batch_id drift", () =>
      checkBatchStatus({ ...base, previous_repo_batch: { ...base.previous_repo_batch, batch_id: BATCH } })],
    ["previous_repo_batch.closeout_commit drift", () =>
      checkBatchStatus({ ...base, previous_repo_batch: { ...base.previous_repo_batch, closeout_commit: "0".repeat(40) } })],
    ["external predecessor status drift", () =>
      checkBatchStatus({ ...base, external_serial_predecessor: { ...base.external_serial_predecessor, status: "IN_PROGRESS" } })],
    ["external predecessor merge drift", () =>
      checkBatchStatus({ ...base, external_serial_predecessor: { ...base.external_serial_predecessor, implementation_merge: "0".repeat(40) } })],
    ["external predecessor tree drift", () =>
      checkBatchStatus({ ...base, external_serial_predecessor: { ...base.external_serial_predecessor, implementation_tree: "0".repeat(40) } })],
    ["external predecessor closeout drift", () =>
      checkBatchStatus({ ...base, external_serial_predecessor: { ...base.external_serial_predecessor, closeout_commit: "0".repeat(40) } })],
    ["external predecessor CI conclusion drift", () =>
      checkBatchStatus({ ...base, external_serial_predecessor: { ...base.external_serial_predecessor, closeout_ci_conclusion: "failure" } })],
    ["next_batch drift", () => checkBatchStatus({ ...base, next_batch: "UNREGISTERED-AIPT-P0-B004" })],
    ["next_batch_state drift (NOT_AUTHORIZED)", () =>
      checkBatchStatus({ ...base, next_batch_state: "NOT_AUTHORIZED" })],
    ["next_batch_authorized=false", () => checkBatchStatus({ ...base, next_batch_authorized: false })],
    ["next_batch_started=true", () => checkBatchStatus({ ...base, next_batch_started: true })],
    ["legacy next_started key", () => checkBatchStatus({ ...base, next_started: false })],
    ["legacy previous_batch key", () => checkBatchStatus({ ...base, previous_batch: { batch_id: BATCH, status: "MERGED_CLOSED" } })],
  ];
  let rejected = 0;
  probes.forEach(([label, fn], i) => {
    try {
      fn();
      fail(`status-mutation probe must reject but did not: ${label}`);
    } catch {
      rejected += 1;
      console.log(`PASS status-mutation probe ${i + 1}/${probes.length} (${label}): rejected`);
    }
  });
  if (rejected === probes.length) {
    console.log(`PASS status-mutation probes: ${probes.length}/${probes.length} rejected as expected`);
  } else {
    console.error(`FAIL status-mutation probes: only ${rejected}/${probes.length} rejected as expected`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const identityPath = path.join(ROOT, "aipt", "p0-b000", "identity.json");
  if (!existsSync(identityPath)) {
    console.error("FAIL root: cannot find aipt/p0-b000/identity.json; run this validator from the repository root (no writes performed)");
    process.exit(1);
  }

  // Recursive checkout walk: .git / node_modules / .sessions excluded,
  // symlinks and non-files ignored. Deterministic (sorted) counts only.
  const allFiles = walk(ROOT);
  const jsonFiles = allFiles.filter((f) => f.endsWith(".json")).sort();
  const mdFiles = allFiles.filter((f) => /\.md$/i.test(f)).sort();

  const jsons = new Map();
  for (const f of jsonFiles) {
    const r = relPath(f);
    try {
      jsons.set(r, JSON.parse(readRel(r)));
    } catch (e) {
      fail(`repository JSON parse — ${r}: ${e.message}`);
    }
  }

  runCheck("repository JSON", () => {
    if (jsons.size !== jsonFiles.length) {
      throw new Error(`${jsonFiles.length - jsons.size} repository JSON file(s) failed to parse (see the FAIL lines above)`);
    }
    pass(`repository JSON: all ${jsons.size} JSON files parse cleanly (recursive walk; .git, node_modules, .sessions excluded; symlinks and non-files ignored)`);
  });
  runCheck("links", () => checkRepoLinks(mdFiles, jsons));
  runCheck("forbidden schema keys", () => {
    // AIPT schema-key concepts are checked on the B000 delivery JSON only
    // (aipt/p0-b000/**): the B001 input manifest and the p0-b001 artifacts
    // legitimately carry stable-ID / visibility / SafetyProfile fields and are
    // deeply validated by validate-p0-b001.mjs. The root pack-manifest.json
    // stays out of AIPT schema-key scope.
    const delivery = [...jsons].filter(([r]) => r.startsWith("aipt/p0-b000/"));
    for (const [r, obj] of delivery) checkForbiddenKeys(obj, r);
    pass(`forbidden schema keys: none found in ${delivery.length} AIPT P0-B000 delivery JSON file(s) (B001 artifacts and the input manifest are out of B000 schema-key scope)`);
  });
  runCheck("identity", checkIdentity);
  runCheck("title surfaces", checkTitleSurfaces);
  runCheck("licensing", checkLicensing);
  runCheck("path-scope", () => checkPathScope(loadJson("aipt/p0-b000/licensing.json")));
  runCheck("status/artifacts", checkStatusAndArtifacts);
  runCheck("premades-v2", () => checkPremades(loadJson("aipt/p0-b000/premades-v2.json")));
  runCheck("delivery-surface scan", checkScan);
  runCheck("workflow", checkWorkflow);
  runProbes();
  runStatusProbes();

  if (errors.length > 0) {
    for (const e of errors) console.error("FAIL " + e);
    console.error(`FAIL AIPT Content Gate: ${errors.length} error(s)`);
    process.exit(1);
  }
  console.log("PASS AIPT Content Gate: all checks passed");
}

main();
