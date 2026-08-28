#!/usr/bin/env node
// UNREGISTERED-AIPT-P1-B000 concrete package/input validator.
// Node.js standard library only: deterministic fixtures, no dependency install,
// network access, model call, agent execution, or real playtest.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TASK_ID = 'UNREGISTERED-AIPT-P1-B000';
const AUTHORITY_TASK_ID = 'UNREGISTERED-AIPT-P1-B000-AUTHORITY-001';
const PREDECESSOR_COMMIT = '358d6d9d08a86818e34fd0c0d9a62bfe66e73abe';
const PREDECESSOR_TREE = '5585271c78d1fe5cd8357c7b36a501bee34f0240';
const SOURCE_REPOSITORY = 'zyc14588/UNREGISTERED';
const AIPT_ANCESTRY_COMMIT = 'eede815e818d87362605f55d5bfd2a0460e6e130';
const AIPT_ANCESTRY_TREE = 'd2668f0ea9d3b72969199c7cd8afc5edb94c2a6b';
const AUTHORITY_COMMIT = 'c9f7729f666d11716c04d7682da16044ca965236';
const AUTHORITY_TREE = '9cf551e7bc70d4354ca21d62a2bd456ed6f401bb';
const AUTHORITY_REGISTRY_SHA256 = 'a9845bb74dac409ee243b7024e23aae271ab13c75e18116ae2513853cc02eed6';
const AUTHORITY_ARTIFACT_MANIFEST_SHA256 = '3e7d5ee752ac01ae4034fdaf2ec71231bb4f58eca9174e99619d0a13b200cd4f';
const PACKAGE_SOURCE_DIGEST = '605b4a72dda8348fc51245f0d0947d69cc47b174346bb9f14b378fb703ff594d';
const PACKAGE_MANIFEST_SHA256 = '99683081677f5ac098dc94ee1221b4ae1fd5a75b416da7094276dbf694bb23bd';
const ADAPTER_CANONICAL_SHA256 = 'b6b80ef8b671414ca7bc34b7e65510db9a3bad5910996f43ea92120ecaec773d';
const RUN_MANIFEST_CANONICAL_SHA256 = 'aeaea04751bb631e80503890d7e4a5b683a92e1b3060a3f7779deaf9e6a2579c';
const MIGRATION_SHA256 = '47f02a5a2129473caa0db5e359a0b294a01b2a96329d9f6fa08ac87cc429c997';
const INVENTORY_ARTIFACT_SHA256 = 'e1b3b1353a1c7cbba570bdc6ae1fdc5ad5b60a25082f6896d37ec50a71afc958';
const INVENTORY_PROJECTION_SHA256 = '55480de50eb218163db4d2bcb20b8c64ce0bc44858c6a4fa722e1a37ca6751ac';

const PACKAGE_PATH = 'aipt/p1-b000/playtest-package.json';
const ADAPTER_PATH = 'aipt/p1-b000/runtime-adapter-input.json';
const EVIDENCE_PATH = 'aipt/p1-b000/compatibility-evidence.json';
const STATUS_PATH = 'aipt/status.json';
const README_PATH = 'aipt/README.md';
const WORKFLOW_PATH = '.github/workflows/aipt-content-gate.yml';
const VALIDATOR_PATH = 'scripts/aipt/validate-p1-b000.mjs';

const ALLOWED_ADDITIONS = [
  EVIDENCE_PATH,
  PACKAGE_PATH,
  ADAPTER_PATH,
  VALIDATOR_PATH,
];
const ALLOWED_CONTROLLED_MODIFICATIONS = [
  WORKFLOW_PATH,
  README_PATH,
  STATUS_PATH,
];
const ALLOWED_CHANGED_PATHS = [...ALLOWED_CONTROLLED_MODIFICATIONS, ...ALLOWED_ADDITIONS].sort();

const SOURCE_ITEMS = Object.freeze({
  'UNR-ASSET-P0-B003-GAME-ADAPTER': Object.freeze({
    source_kind: 'ASSET',
    source_path: 'aipt/p0-b003/game-adapter.json',
    content_sha256: '5ddef252e1b93a4b9348fb71e9490f106c02e9e0b8b11fa9a11a589bbc3effc5',
    visibility_class: 'SYSTEM_INTERNAL',
  }),
  'UNR-GUIDE-T000-STAGE3': Object.freeze({
    source_kind: 'GUIDE',
    source_path: 'campaign/playtest/stage3-run-guide-v1.md',
    content_sha256: 'c1ccd8a77d917e05f86f0604731344b22c8902c508858ef71a39ed9da3cce17f',
    visibility_class: 'GM_ONLY',
  }),
  'UNR-REFERENCE-SESSION0-REDLINES': Object.freeze({
    source_kind: 'REFERENCE',
    source_path: 'campaign/session0-redlines.md',
    content_sha256: 'd5d9246e07b2d4c9de9ce602835ec763ac33f5dd01a8b5e83c9b2318f9b6e630',
    visibility_class: 'GM_ONLY',
  }),
  'UNR-RULE-P0-B002-MACHINE-RULES': Object.freeze({
    source_kind: 'RULE',
    source_path: 'aipt/p0-b002/machine-rules.json',
    content_sha256: '139d095fe54926e1599edf208b65f7a89061f1cda6d8b492f83b5e47c0693c78',
    visibility_class: 'SYSTEM_INTERNAL',
  }),
  'UNR-SCENE-T000-PLAYER-HANDOUTS': Object.freeze({
    source_kind: 'SCENE',
    source_path: 'campaign/playtest/task0-handouts-v1.md',
    content_sha256: '56f1a9fba799f5c281162290c27b39db9bbbaa9d83cdaa83dd235506f3d68288',
    visibility_class: 'PLAYER_VISIBLE',
  }),
});

const VISIBILITY_SURFACES = Object.freeze({
  PLAYER_VISIBLE: Object.freeze([
    'PLAYER_AGENT_CONTEXT', 'PLAYER_VISIBLE_EVIDENCE',
    'GM_CONTEXT', 'AUTHORIZED_EVIDENCE',
  ]),
  GM_ONLY: Object.freeze(['GM_CONTEXT', 'ADJUDICATION', 'AUTHORIZED_EVIDENCE']),
  SYSTEM_INTERNAL: Object.freeze(['HARNESS_CONTROL', 'TEST_CONTROL', 'BOOKKEEPING']),
});
const VISIBILITY_RANK = Object.freeze({ PLAYER_VISIBLE: 0, GM_ONLY: 1, SYSTEM_INTERNAL: 2 });
const SOURCE_KINDS = new Set(['SCENE', 'GUIDE', 'RULE', 'ASSET', 'REFERENCE']);
const VISIBILITY_CLASSES = new Set(Object.keys(VISIBILITY_SURFACES));
const SURFACES = new Set(Object.values(VISIBILITY_SURFACES).flat());
const TASK_TYPES = new Set([
  'SYSTEM_QUALIFICATION', 'RULE', 'PROSE', 'ORACLE', 'HUMAN_SIMULATION',
  'ADVERSARIAL', 'PACKAGE_BUILD', 'CALIBRATION', 'REGRESSION',
]);

const EXPECTED_BASELINE = Object.freeze({
  campaign_suite_case_run: true,
  attempt_internal_only: true,
  attempt_externally_addressable: false,
  run_manifest_immutable: true,
  second_run_manifest_authority: false,
  postgresql_queue_authority: true,
  formal_wip: 1,
  deterministic_selection: true,
  lease: true,
  heartbeat: true,
  expiry: true,
  recovery: true,
  attempt_history_append_only: true,
  migration_path: 'internal/storage/postgres/migrations/000002_playtest_queue.sql',
  migration_sha256: MIGRATION_SHA256,
});

const EXPECTED_RUNTIME_BOUNDARIES = Object.freeze({
  run_core_implemented: false,
  agent_orchestration_implemented: false,
  real_model_gateway_implemented: false,
  real_model_calls: 0,
  real_playtest_executed: false,
});

const NEGATIVE_NAMES = Object.freeze([
  'MALFORMED_PACKAGE_MANIFEST',
  'UNSUPPORTED_SCHEMA_VERSION',
  'MISSING_PACKAGE_ID',
  'DUPLICATE_PACKAGE_IDENTITY',
  'INVALID_PACKAGE_VERSION',
  'MISSING_SOURCE_COMMIT',
  'SOURCE_COMMIT_MISMATCH',
  'SOURCE_TREE_MISMATCH',
  'SOURCE_DIGEST_MISMATCH',
  'STALE_SOURCE_MANIFEST',
  'DUPLICATE_LOGICAL_MAPPING_ID',
  'UNKNOWN_SOURCE_KIND',
  'DANGLING_MAPPING_REFERENCE',
  'PATH_TRAVERSAL',
  'MAPPING_ESCAPES_PACKAGE_ROOT',
  'MISSING_MAPPED_FILE',
  'MAPPED_CONTENT_DIGEST_MISMATCH',
  'MISSING_VISIBILITY',
  'UNKNOWN_VISIBILITY',
  'PLAYER_VISIBLE_REFERENCE_TO_GM_ONLY',
  'PLAYER_VISIBLE_EVIDENCE_CONTAINS_GM_ONLY',
  'SYSTEM_INTERNAL_EXPOSED_TO_PLAYER',
  'SECRET_MATERIAL_DETECTED',
  'CONFLICTING_VISIBILITY_DECLARATIONS',
  'UNSUPPORTED_ADAPTER_CONTRACT_VERSION',
  'INVALID_ADAPTER_INPUT',
  'ADAPTER_REFERENCES_UNKNOWN_PACKAGE',
  'CROSS_PACKAGE_REFERENCE_WITHOUT_AUTHORIZATION',
  'MISSING_RUN_MANIFEST_SOURCE_BINDING',
  'SOURCE_BINDING_IDENTITY_MISMATCH',
  'MUTABLE_BRANCH_USED_AS_IMMUTABLE_IDENTITY',
  'EVIDENCE_PROVENANCE_INCOMPLETE',
  'B001_CAMPAIGN_SUITE_CASE_RUN_REGRESSION',
  'ATTEMPT_EXTERNALLY_ADDRESSABLE',
  'RUN_MANIFEST_MUTATION_REGRESSION',
  'POSTGRESQL_QUEUE_AUTHORITY_REGRESSION',
  'FORMAL_WIP_ONE_REGRESSION',
  'LEASE_RECOVERY_REGRESSION',
  'ATTEMPT_APPEND_ONLY_REGRESSION',
]);

const EXPECTED_PROBE_CODES = Object.freeze([
  'FAIL_SCHEMA', 'FAIL_UNSUPPORTED_VERSION', 'FAIL_SCHEMA',
  'FAIL_DUPLICATE_PACKAGE_IDENTITY', 'FAIL_SCHEMA', 'FAIL_SCHEMA',
  'FAIL_SOURCE_IDENTITY', 'FAIL_SOURCE_IDENTITY', 'FAIL_SOURCE_DIGEST',
  'FAIL_SOURCE_DIGEST', 'FAIL_MAPPING', 'FAIL_SCHEMA', 'FAIL_MAPPING',
  'FAIL_PATH_POLICY', 'FAIL_PATH_POLICY', 'FAIL_REFERENCE_INTEGRITY',
  'FAIL_SOURCE_DIGEST', 'FAIL_VISIBILITY', 'FAIL_SCHEMA', 'FAIL_VISIBILITY',
  'FAIL_VISIBILITY', 'FAIL_VISIBILITY', 'FAIL_SECRET', 'FAIL_VISIBILITY',
  'FAIL_UNSUPPORTED_VERSION', 'FAIL_SCHEMA', 'FAIL_PACKAGE_BINDING',
  'FAIL_CROSS_PACKAGE_REFERENCE', 'FAIL_SCHEMA', 'FAIL_B001_COMPATIBILITY',
  'FAIL_SCHEMA', 'FAIL_SCHEMA', 'FAIL_B001_REGRESSION', 'FAIL_B001_REGRESSION',
  'FAIL_B001_REGRESSION', 'FAIL_B001_REGRESSION', 'FAIL_B001_REGRESSION',
  'FAIL_B001_REGRESSION', 'FAIL_B001_REGRESSION',
]);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GIT_OID = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const IDENTITY = /^[A-Za-z0-9][A-Za-z0-9._:@+/-]{0,127}$/u;
const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;
const REPOSITORY = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/u;
const PACKAGE_ROOT = /^(?:\.|[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*)$/u;
const SOURCE_PATH = /^[A-Za-z0-9_@+.-]+(?:\/[A-Za-z0-9_@+.-]+)*$/u;
const CAPABILITY = /^[a-z][a-z0-9.-]*\/v(0|[1-9][0-9]*)$/u;
const MEDIA_TYPE = /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/u;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalJSON(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(',')}]`;
  if (object(value)) {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJSON(value[key])}`).join(',')}}`;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('non-finite JSON number');
  }
  return JSON.stringify(value);
}

function same(left, right) {
  return canonicalJSON(left) === canonicalJSON(right);
}

function byteSort(values) {
  return [...values].sort((left, right) =>
    Buffer.compare(Buffer.from(String(left), 'utf8'), Buffer.from(String(right), 'utf8')));
}

function unique(values) {
  return Array.isArray(values) && new Set(values.map((value) => canonicalJSON(value))).size === values.length;
}

function sameSet(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    same(byteSort(new Set(left)), byteSort(new Set(right)));
}

function exactKeys(value, keys) {
  return object(value) && same(Object.keys(value).sort(), [...keys].sort());
}

function identity(value) {
  return typeof value === 'string' && value.length <= 128 && IDENTITY.test(value);
}

function identityList(value, minimum = 0) {
  return Array.isArray(value) && value.length >= minimum && unique(value) && value.every(identity);
}

function capabilityList(value, minimum = 1) {
  return Array.isArray(value) && value.length >= minimum && unique(value) &&
    value.every((item) => typeof item === 'string' && CAPABILITY.test(item));
}

function validSourcePath(value) {
  if (typeof value !== 'string' || value.length > 512 || !SOURCE_PATH.test(value) ||
      value.includes('\\') || value.includes('\0') || value.startsWith('/') || value.endsWith('/')) return false;
  return value.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

function withinRoot(sourcePath, packageRoot) {
  return validSourcePath(sourcePath) &&
    (packageRoot === '.' || sourcePath.startsWith(`${packageRoot}/`));
}

function exactStringList(value, allowed, minimum = 1) {
  return Array.isArray(value) && value.length >= minimum && unique(value) &&
    value.every((item) => typeof item === 'string' && allowed.has(item));
}

function boundDigest(value, member) {
  if (!object(value) || typeof value[member] !== 'string' || !SHA256.test(value[member])) return false;
  const projection = clone(value);
  const claimed = projection[member];
  delete projection[member];
  return sha256(Buffer.from(canonicalJSON(projection), 'utf8')) === claimed;
}

function rebind(value, member) {
  const projection = clone(value);
  delete projection[member];
  return { ...projection, [member]: sha256(Buffer.from(canonicalJSON(projection), 'utf8')) };
}

function addCode(codes, code) {
  if (!codes.includes(code)) codes.push(code);
}

function secretDetected(value) {
  const source = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
  return /-----BEGIN [A-Z ]*PRIVATE KEY-----/u.test(source) ||
    /(?:^|[^A-Za-z0-9])(?:sk-|dsk-|ghp_)[A-Za-z0-9_-]{8,}/u.test(source) ||
    /(?:api[_-]?key|password|credential|access[_-]?token)\s*[:=]\s*["']?[^\s"']{8,}/iu.test(source) ||
    /https?:\/\/[^/\s:@]+:[^@\s/]+@/iu.test(source);
}

function packageShape(pkg) {
  if (!exactKeys(pkg, [
    'schema', 'schema_version', 'mapping_version', 'package_id', 'package_version',
    'game_id', 'game_version', 'package_root', 'source_repository', 'source_commit',
    'source_tree', 'source_digest', 'digest_scope', 'adapter_contract_version',
    'entrypoints', 'mappings', 'visibility_declarations', 'declared_capabilities',
    'references', 'compatibility',
  ])) return false;
  if (pkg.schema !== 'aipt.playtest-package/v1' || pkg.schema_version !== '1.0.0' ||
      pkg.mapping_version !== '1.0.0' || pkg.adapter_contract_version !== '1.0.0' ||
      !identity(pkg.package_id) || !SEMVER.test(pkg.package_version || '') ||
      !identity(pkg.game_id) || !SEMVER.test(pkg.game_version || '') ||
      !PACKAGE_ROOT.test(pkg.package_root || '') || !REPOSITORY.test(pkg.source_repository || '') ||
      !GIT_OID.test(pkg.source_commit || '') || !GIT_OID.test(pkg.source_tree || '') ||
      !SHA256.test(pkg.source_digest || '')) return false;
  const scope = pkg.digest_scope;
  if (!exactKeys(scope, [
    'algorithm', 'manifest_canonicalization', 'file_content_mode', 'path_order',
    'symlink_policy', 'unexpected_file_policy', 'entries',
  ]) || scope.algorithm !== 'SHA-256' || scope.manifest_canonicalization !== 'RFC8785-JCS' ||
      scope.file_content_mode !== 'GIT_BLOB_EXACT_BYTES_NO_NEWLINE_NORMALIZATION' ||
      scope.path_order !== 'UTF8_BYTE_LEX_ASC' || scope.symlink_policy !== 'REJECT' ||
      scope.unexpected_file_policy !== 'UNREFERENCED_OUT_OF_SCOPE_REFERENCED_UNLISTED_REJECT' ||
      !Array.isArray(scope.entries) || scope.entries.length < 1 || !unique(scope.entries) ||
      !scope.entries.every((entry) => exactKeys(entry, ['source_path', 'content_sha256']) &&
        validSourcePath(entry.source_path) && SHA256.test(entry.content_sha256 || ''))) return false;
  if (!Array.isArray(pkg.mappings) || pkg.mappings.length < 1 || !unique(pkg.mappings) ||
      !pkg.mappings.every((mapping) => exactKeys(mapping, [
        'logical_id', 'source_kind', 'source_path', 'content_sha256',
        'visibility_class', 'depends_on',
      ]) && identity(mapping.logical_id) && SOURCE_KINDS.has(mapping.source_kind) &&
        validSourcePath(mapping.source_path) && SHA256.test(mapping.content_sha256 || '') &&
        VISIBILITY_CLASSES.has(mapping.visibility_class) && identityList(mapping.depends_on))) return false;
  if (!Array.isArray(pkg.references) || pkg.references.length < 1 || !unique(pkg.references) ||
      !pkg.references.every((reference) => exactKeys(reference, [
        'reference_id', 'source_path', 'content_sha256', 'visibility_class', 'media_type', 'required_by',
      ]) && identity(reference.reference_id) && validSourcePath(reference.source_path) &&
        SHA256.test(reference.content_sha256 || '') && VISIBILITY_CLASSES.has(reference.visibility_class) &&
        typeof reference.media_type === 'string' && reference.media_type.length <= 100 &&
        MEDIA_TYPE.test(reference.media_type) && identityList(reference.required_by, 1))) return false;
  if (!Array.isArray(pkg.visibility_declarations) || pkg.visibility_declarations.length < 1 ||
      !unique(pkg.visibility_declarations) || !pkg.visibility_declarations.every((declaration) =>
        exactKeys(declaration, ['logical_id', 'visibility_class', 'allowed_surfaces']) &&
        identity(declaration.logical_id) && VISIBILITY_CLASSES.has(declaration.visibility_class) &&
        exactStringList(declaration.allowed_surfaces, SURFACES))) return false;
  if (!capabilityList(pkg.declared_capabilities)) return false;
  if (!Array.isArray(pkg.entrypoints) || pkg.entrypoints.length < 1 || !unique(pkg.entrypoints) ||
      !pkg.entrypoints.every((entrypoint) => exactKeys(entrypoint, [
        'test_unit_id', 'scene_ids', 'guide_ids', 'rule_ids', 'asset_ids', 'reference_ids',
        'player_visible_ids', 'gm_only_ids', 'system_internal_ids', 'required_capabilities',
      ]) && identity(entrypoint.test_unit_id) && identityList(entrypoint.scene_ids, 1) &&
        identityList(entrypoint.guide_ids, 1) && identityList(entrypoint.rule_ids, 1) &&
        identityList(entrypoint.asset_ids) && identityList(entrypoint.reference_ids, 1) &&
        identityList(entrypoint.player_visible_ids, 1) && identityList(entrypoint.gm_only_ids, 1) &&
        identityList(entrypoint.system_internal_ids, 1) && capabilityList(entrypoint.required_capabilities))) return false;
  const compatibility = pkg.compatibility;
  return exactKeys(compatibility, [
    'test_plan_schema', 'run_manifest_schema', 'campaign_hierarchy', 'attempt_internal_only',
    'manifest_binding_model', 'aipt_ancestry_commit', 'aipt_ancestry_tree', 'authority_task_id',
    'authority_version', 'authority_commit', 'authority_tree', 'authority_registry_sha256',
    'authority_artifact_manifest_sha256',
  ]) && compatibility.test_plan_schema === 'aipt.test-plan/v1' &&
    compatibility.run_manifest_schema === 'aipt.run-manifest/v1' &&
    compatibility.campaign_hierarchy === 'CAMPAIGN_SUITE_CASE_RUN' &&
    compatibility.attempt_internal_only === true &&
    compatibility.manifest_binding_model === 'B001_GAME_SOURCE_PLUS_ADAPTER_BINDING_V1' &&
    GIT_OID.test(compatibility.aipt_ancestry_commit || '') &&
    GIT_OID.test(compatibility.aipt_ancestry_tree || '') && identity(compatibility.authority_task_id) &&
    SEMVER.test(compatibility.authority_version || '') && GIT_OID.test(compatibility.authority_commit || '') &&
    GIT_OID.test(compatibility.authority_tree || '') &&
    SHA256.test(compatibility.authority_registry_sha256 || '') &&
    SHA256.test(compatibility.authority_artifact_manifest_sha256 || '');
}

function repositorySourceShape(value) {
  return exactKeys(value, ['repository', 'commit', 'tree']) && REPOSITORY.test(value.repository || '') &&
    GIT_OID.test(value.commit || '') && GIT_OID.test(value.tree || '');
}

function adapterShape(input) {
  if (!exactKeys(input, [
    'schema', 'schema_version', 'adapter_contract_version', 'adapter_input_id', 'package_binding',
    'selected_test_unit', 'resolved_mappings', 'visibility_resolution', 'scenario_references',
    'guide_references', 'rule_references', 'asset_references', 'declared_capabilities',
    'evidence_boundary', 'provenance', 'canonical_sha256',
  ]) || input.schema !== 'aipt.runtime-adapter-input/v1' || input.schema_version !== '1.0.0' ||
      input.adapter_contract_version !== '1.0.0' || !identity(input.adapter_input_id) ||
      !identity(input.selected_test_unit) || !SHA256.test(input.canonical_sha256 || '')) return false;
  const binding = input.package_binding;
  if (!exactKeys(binding, [
    'package_id', 'package_version', 'game_id', 'game_version', 'source_repository',
    'source_commit', 'source_tree', 'source_digest', 'package_manifest_sha256',
  ]) || !identity(binding.package_id) || !SEMVER.test(binding.package_version || '') ||
      !identity(binding.game_id) || !SEMVER.test(binding.game_version || '') ||
      !REPOSITORY.test(binding.source_repository || '') || !GIT_OID.test(binding.source_commit || '') ||
      !GIT_OID.test(binding.source_tree || '') || !SHA256.test(binding.source_digest || '') ||
      !SHA256.test(binding.package_manifest_sha256 || '')) return false;
  if (!Array.isArray(input.resolved_mappings) || input.resolved_mappings.length < 1 ||
      !unique(input.resolved_mappings) || !input.resolved_mappings.every((mapping) =>
        exactKeys(mapping, ['logical_id', 'source_kind', 'source_path', 'content_sha256', 'visibility_class']) &&
        identity(mapping.logical_id) && SOURCE_KINDS.has(mapping.source_kind) && validSourcePath(mapping.source_path) &&
        SHA256.test(mapping.content_sha256 || '') && VISIBILITY_CLASSES.has(mapping.visibility_class))) return false;
  if (!Array.isArray(input.visibility_resolution) || input.visibility_resolution.length < 1 ||
      !unique(input.visibility_resolution) || !input.visibility_resolution.every((resolution) =>
        exactKeys(resolution, ['logical_id', 'visibility_class', 'allowed_surfaces']) &&
        identity(resolution.logical_id) && VISIBILITY_CLASSES.has(resolution.visibility_class) &&
        exactStringList(resolution.allowed_surfaces, SURFACES))) return false;
  if (!identityList(input.scenario_references, 1) || !identityList(input.guide_references, 1) ||
      !identityList(input.rule_references, 1) || !identityList(input.asset_references) ||
      !capabilityList(input.declared_capabilities)) return false;
  const boundary = input.evidence_boundary;
  if (!exactKeys(boundary, [
    'player_visible_source_ids', 'non_player_source_ids', 'player_visible_gm_only_source_ids',
    'visibility_proof',
  ]) || !identityList(boundary.player_visible_source_ids, 1) ||
      !identityList(boundary.non_player_source_ids, 1) ||
      !identityList(boundary.player_visible_gm_only_source_ids) ||
      boundary.player_visible_gm_only_source_ids.length !== 0 ||
      boundary.visibility_proof !== 'EXACT_CLASS_MEMBERSHIP_NO_GM_ONLY_LEAK') return false;
  const provenance = input.provenance;
  if (!exactKeys(provenance, ['authority', 'run_manifest', 'mapping_logical_ids', 'source_paths']) ||
      !identityList(provenance.mapping_logical_ids, 1) || !Array.isArray(provenance.source_paths) ||
      provenance.source_paths.length < 1 || !unique(provenance.source_paths) ||
      !provenance.source_paths.every(validSourcePath)) return false;
  const authority = provenance.authority;
  if (!exactKeys(authority, [
    'task_id', 'authority_version', 'commit', 'tree', 'registry_sha256', 'artifact_manifest_sha256',
  ]) || !identity(authority.task_id) || !SEMVER.test(authority.authority_version || '') ||
      !GIT_OID.test(authority.commit || '') || !GIT_OID.test(authority.tree || '') ||
      !SHA256.test(authority.registry_sha256 || '') || !SHA256.test(authority.artifact_manifest_sha256 || '')) return false;
  const manifest = provenance.run_manifest;
  return exactKeys(manifest, [
    'schema', 'manifest_id', 'run_id', 'canonical_sha256', 'ancestry', 'aipt_source', 'game_source',
  ]) && manifest.schema === 'aipt.run-manifest/v1' && identity(manifest.manifest_id) &&
    identity(manifest.run_id) && SHA256.test(manifest.canonical_sha256 || '') &&
    exactKeys(manifest.ancestry, ['campaign_id', 'suite_id', 'case_id', 'run_id']) &&
    Object.values(manifest.ancestry).every(identity) && repositorySourceShape(manifest.aipt_source) &&
    repositorySourceShape(manifest.game_source);
}

function validateCanonicalPaths(paths) {
  const problems = [];
  const exact = new Set();
  const folded = new Map();
  const normalized = new Map();
  for (const sourcePath of paths) {
    if (!validSourcePath(sourcePath)) problems.push('INVALID_PATH');
    if (exact.has(sourcePath)) problems.push('DUPLICATE_CANONICAL_PATH');
    exact.add(sourcePath);
    const fold = typeof sourcePath === 'string' ? sourcePath.toLocaleLowerCase('en-US') : String(sourcePath);
    if (folded.has(fold) && folded.get(fold) !== sourcePath) problems.push('CASE_FOLD_COLLISION');
    else folded.set(fold, sourcePath);
    const nfc = typeof sourcePath === 'string' ? sourcePath.normalize('NFC') : String(sourcePath);
    if (normalized.has(nfc) && normalized.get(nfc) !== sourcePath) problems.push('UNICODE_NORMALIZATION_COLLISION');
    else normalized.set(nfc, sourcePath);
  }
  return problems;
}

function validatePackage(pkg, fileFacts, expectedSource, loadedPackages = [pkg]) {
  const codes = [];
  try {
    if (!object(pkg)) return ['FAIL_SCHEMA'];
    if (pkg.schema !== 'aipt.playtest-package/v1' || pkg.schema_version !== '1.0.0' ||
        pkg.mapping_version !== '1.0.0' || pkg.adapter_contract_version !== '1.0.0') {
      addCode(codes, 'FAIL_UNSUPPORTED_VERSION');
    }
    if (!packageShape(pkg)) addCode(codes, 'FAIL_SCHEMA');
    const duplicates = loadedPackages.filter((candidate) => object(candidate) &&
      candidate.package_id === pkg.package_id && candidate.package_version === pkg.package_version);
    if (duplicates.length !== 1) addCode(codes, 'FAIL_DUPLICATE_PACKAGE_IDENTITY');
    if (pkg.source_repository !== expectedSource.repository || pkg.source_commit !== expectedSource.commit ||
        pkg.source_tree !== expectedSource.tree) addCode(codes, 'FAIL_SOURCE_IDENTITY');
    if (!boundDigest(pkg, 'source_digest')) addCode(codes, 'FAIL_SOURCE_DIGEST');

    const mappings = Array.isArray(pkg.mappings) ? pkg.mappings : [];
    const references = Array.isArray(pkg.references) ? pkg.references : [];
    const entries = Array.isArray(pkg.digest_scope?.entries) ? pkg.digest_scope.entries : [];
    const mappingIDs = mappings.map((item) => item?.logical_id);
    const referenceIDs = references.map((item) => item?.reference_id);
    const allIDs = [...mappingIDs, ...referenceIDs];
    if (allIDs.some((item) => typeof item !== 'string') || new Set(allIDs).size !== allIDs.length) {
      addCode(codes, 'FAIL_MAPPING');
    }
    const idSet = new Set(allIDs);
    const visibilityByID = new Map([
      ...mappings.map((item) => [item?.logical_id, item?.visibility_class]),
      ...references.map((item) => [item?.reference_id, item?.visibility_class]),
    ]);
    for (const mapping of mappings) {
      for (const dependency of Array.isArray(mapping?.depends_on) ? mapping.depends_on : []) {
        if (!idSet.has(dependency)) addCode(codes, 'FAIL_MAPPING');
        if ((VISIBILITY_RANK[mapping?.visibility_class] ?? -1) <
            (VISIBILITY_RANK[visibilityByID.get(dependency)] ?? 99)) addCode(codes, 'FAIL_VISIBILITY');
      }
    }
    for (const reference of references) {
      for (const consumer of Array.isArray(reference?.required_by) ? reference.required_by : []) {
        if (!idSet.has(consumer)) addCode(codes, 'FAIL_MAPPING');
        if ((VISIBILITY_RANK[visibilityByID.get(consumer)] ?? -1) <
            (VISIBILITY_RANK[reference?.visibility_class] ?? 99)) addCode(codes, 'FAIL_VISIBILITY');
      }
    }

    const sourcePaths = [...mappings.map((item) => item?.source_path),
      ...references.map((item) => item?.source_path)];
    if (validateCanonicalPaths(sourcePaths).length > 0) addCode(codes, 'FAIL_PATH_POLICY');
    if (sourcePaths.some((sourcePath) => !withinRoot(sourcePath, pkg.package_root))) {
      addCode(codes, 'FAIL_PATH_POLICY');
    }
    const entryPaths = entries.map((entry) => entry?.source_path);
    if (new Set(entryPaths).size !== entryPaths.length || !same(entryPaths, byteSort(entryPaths)) ||
        validateCanonicalPaths(entryPaths).length > 0) addCode(codes, 'FAIL_SOURCE_DIGEST');
    if (!sameSet([...new Set(entryPaths)], [...new Set(sourcePaths)])) addCode(codes, 'FAIL_REFERENCE_INTEGRITY');
    const entryByPath = new Map(entries.map((entry) => [entry?.source_path, entry]));
    for (const sourcePath of new Set(sourcePaths)) {
      const fact = fileFacts.get(sourcePath);
      if (!fact || fact.type !== 'blob' || !['100644', '100755'].includes(fact.mode)) {
        addCode(codes, 'FAIL_REFERENCE_INTEGRITY');
        if (fact && (fact.type !== 'blob' || fact.mode === '120000')) addCode(codes, 'FAIL_PATH_POLICY');
        continue;
      }
      const actual = sha256(fact.bytes);
      if (entryByPath.get(sourcePath)?.content_sha256 !== actual) addCode(codes, 'FAIL_SOURCE_DIGEST');
    }
    for (const item of [...mappings, ...references]) {
      if (entryByPath.get(item?.source_path)?.content_sha256 !== item?.content_sha256) {
        addCode(codes, 'FAIL_SOURCE_DIGEST');
      }
    }

    const declarations = Array.isArray(pkg.visibility_declarations) ? pkg.visibility_declarations : [];
    const declarationByID = new Map();
    for (const declaration of declarations) {
      if (declarationByID.has(declaration?.logical_id)) addCode(codes, 'FAIL_VISIBILITY');
      declarationByID.set(declaration?.logical_id, declaration);
    }
    if (!sameSet([...declarationByID.keys()], allIDs)) addCode(codes, 'FAIL_VISIBILITY');
    for (const item of [...mappings, ...references]) {
      const logicalID = item.logical_id ?? item.reference_id;
      const declaration = declarationByID.get(logicalID);
      if (!declaration || declaration.visibility_class !== item.visibility_class ||
          !sameSet(declaration.allowed_surfaces ?? [], VISIBILITY_SURFACES[item.visibility_class] ?? [])) {
        addCode(codes, 'FAIL_VISIBILITY');
      }
    }

    const itemByID = new Map([
      ...mappings.map((item) => [item.logical_id, item]),
      ...references.map((item) => [item.reference_id, { ...item, source_kind: 'REFERENCE' }]),
    ]);
    const capabilities = new Set(Array.isArray(pkg.declared_capabilities) ? pkg.declared_capabilities : []);
    for (const entrypoint of Array.isArray(pkg.entrypoints) ? pkg.entrypoints : []) {
      const selections = {
        scene_ids: 'SCENE', guide_ids: 'GUIDE', rule_ids: 'RULE', asset_ids: 'ASSET',
        reference_ids: 'REFERENCE',
      };
      for (const [field, expectedKind] of Object.entries(selections)) {
        for (const logicalID of Array.isArray(entrypoint[field]) ? entrypoint[field] : []) {
          if (itemByID.get(logicalID)?.source_kind !== expectedKind) addCode(codes, 'FAIL_MAPPING');
        }
      }
      for (const capability of Array.isArray(entrypoint.required_capabilities) ? entrypoint.required_capabilities : []) {
        if (!capabilities.has(capability)) addCode(codes, 'FAIL_MAPPING');
      }
      const selected = Object.keys(selections).flatMap((field) =>
        Array.isArray(entrypoint[field]) ? entrypoint[field] : []);
      const partitions = [
        ...(entrypoint.player_visible_ids ?? []), ...(entrypoint.gm_only_ids ?? []),
        ...(entrypoint.system_internal_ids ?? []),
      ];
      if (!sameSet(selected, partitions) || new Set(partitions).size !== partitions.length) {
        addCode(codes, 'FAIL_VISIBILITY');
      }
      for (const logicalID of entrypoint.player_visible_ids ?? []) {
        if (itemByID.get(logicalID)?.visibility_class !== 'PLAYER_VISIBLE') addCode(codes, 'FAIL_VISIBILITY');
      }
      for (const logicalID of entrypoint.gm_only_ids ?? []) {
        if (itemByID.get(logicalID)?.visibility_class !== 'GM_ONLY') addCode(codes, 'FAIL_VISIBILITY');
      }
      for (const logicalID of entrypoint.system_internal_ids ?? []) {
        if (itemByID.get(logicalID)?.visibility_class !== 'SYSTEM_INTERNAL') addCode(codes, 'FAIL_VISIBILITY');
      }
    }
    if (secretDetected(canonicalJSON(pkg)) ||
        [...fileFacts.values()].some((fact) => secretDetected(fact.bytes))) addCode(codes, 'FAIL_SECRET');
  } catch {
    addCode(codes, 'FAIL_SCHEMA');
  }
  return codes;
}

function testPlanShape(plan) {
  if (!exactKeys(plan, ['schema', 'plan_id', 'campaigns']) || plan.schema !== 'aipt.test-plan/v1' ||
      !identity(plan.plan_id) || !Array.isArray(plan.campaigns) || plan.campaigns.length < 1) return false;
  return plan.campaigns.every((campaign) => exactKeys(campaign, ['campaign_id', 'name', 'suites']) &&
    identity(campaign.campaign_id) && typeof campaign.name === 'string' && campaign.name.length > 0 &&
    campaign.name.length <= 200 && Array.isArray(campaign.suites) && campaign.suites.length > 0 &&
    campaign.suites.every((suite) => exactKeys(suite, ['suite_id', 'name', 'cases']) &&
      identity(suite.suite_id) && typeof suite.name === 'string' && suite.name.length > 0 &&
      suite.name.length <= 200 && Array.isArray(suite.cases) && suite.cases.length > 0 &&
      suite.cases.every((testCase) => exactKeys(testCase, ['case_id', 'name', 'task_type', 'runs']) &&
        identity(testCase.case_id) && typeof testCase.name === 'string' && testCase.name.length > 0 &&
        testCase.name.length <= 200 && TASK_TYPES.has(testCase.task_type) &&
        Array.isArray(testCase.runs) && testCase.runs.length > 0 && testCase.runs.every((run) =>
          exactKeys(run, ['run_id', 'run_type', 'manifest_id', 'attempt_policy']) &&
          identity(run.run_id) && TASK_TYPES.has(run.run_type) && identity(run.manifest_id) &&
          exactKeys(run.attempt_policy, ['scope', 'max_attempts']) &&
          run.attempt_policy.scope === 'RUN_INTERNAL_ONLY' && Number.isInteger(run.attempt_policy.max_attempts) &&
          run.attempt_policy.max_attempts >= 1 && run.attempt_policy.max_attempts <= 1000))));
}

function runManifestShape(manifest) {
  if (!exactKeys(manifest, [
    'schema', 'manifest_id', 'run_id', 'ancestry', 'run_type', 'source', 'model_assignments',
    'prompt_assets', 'seat_roster', 'budget', 'evidence', 'visibility_profile_id',
    'safety_applicable', 'safety_profile_id', 'classification', 'qualification_eligible',
    'canonical_sha256',
  ]) || manifest.schema !== 'aipt.run-manifest/v1' || !identity(manifest.manifest_id) ||
      !identity(manifest.run_id) || !exactKeys(manifest.ancestry, ['campaign_id', 'suite_id', 'case_id']) ||
      !Object.values(manifest.ancestry).every(identity) || !TASK_TYPES.has(manifest.run_type) ||
      !exactKeys(manifest.source, ['aipt', 'game']) || !repositorySourceShape(manifest.source.aipt) ||
      !repositorySourceShape(manifest.source.game) || !Array.isArray(manifest.model_assignments) ||
      manifest.model_assignments.length < 1 || manifest.model_assignments.length > 64 ||
      !manifest.model_assignments.every((assignment) => exactKeys(assignment, ['assignment_id', 'model_profile_id']) &&
        identity(assignment.assignment_id) && identity(assignment.model_profile_id)) ||
      !Array.isArray(manifest.prompt_assets) || manifest.prompt_assets.length < 1 ||
      manifest.prompt_assets.length > 256 || !manifest.prompt_assets.every((asset) =>
        exactKeys(asset, ['asset_id', 'sha256']) && identity(asset.asset_id) && SHA256.test(asset.sha256 || '')) ||
      !Array.isArray(manifest.seat_roster) || manifest.seat_roster.length < 1 || manifest.seat_roster.length > 64 ||
      !manifest.seat_roster.every((seat) => exactKeys(seat, ['seat_id', 'role_id', 'model_assignment_id']) &&
        identity(seat.seat_id) && identity(seat.role_id) && identity(seat.model_assignment_id)) ||
      !exactKeys(manifest.budget, ['policy_id', 'limits_id', 'max_input_tokens', 'max_output_tokens', 'max_duration_seconds']) ||
      !identity(manifest.budget.policy_id) || !identity(manifest.budget.limits_id) ||
      !Number.isInteger(manifest.budget.max_input_tokens) || manifest.budget.max_input_tokens < 1 ||
      !Number.isInteger(manifest.budget.max_output_tokens) || manifest.budget.max_output_tokens < 1 ||
      !Number.isInteger(manifest.budget.max_duration_seconds) || manifest.budget.max_duration_seconds < 1 ||
      !exactKeys(manifest.evidence, ['profile_id', 'config_id']) || !identity(manifest.evidence.profile_id) ||
      !identity(manifest.evidence.config_id) ||
      !['AIPT_VISIBILITY_STANDARD_V1', 'AIPT_VISIBILITY_DIAGNOSTIC_V1'].includes(manifest.visibility_profile_id) ||
      typeof manifest.safety_applicable !== 'boolean' ||
      !['AIPT_SAFETY_STANDARD_V1', 'AIPT_SAFETY_DIAGNOSTIC_V1', 'NOT_APPLICABLE'].includes(manifest.safety_profile_id) ||
      !['QUALIFICATION', 'DIAGNOSTIC'].includes(manifest.classification) ||
      typeof manifest.qualification_eligible !== 'boolean' || !SHA256.test(manifest.canonical_sha256 || '')) return false;
  if ((manifest.classification === 'QUALIFICATION') !== manifest.qualification_eligible) return false;
  if (manifest.safety_applicable && manifest.safety_profile_id === 'NOT_APPLICABLE') return false;
  if (!manifest.safety_applicable && manifest.safety_profile_id !== 'NOT_APPLICABLE') return false;
  return boundDigest(manifest, 'canonical_sha256');
}

function validateAdapter(input, pkg, packageBytes, manifest) {
  const codes = [];
  try {
    if (!object(input)) return ['FAIL_SCHEMA'];
    if (input.schema !== 'aipt.runtime-adapter-input/v1' || input.schema_version !== '1.0.0' ||
        input.adapter_contract_version !== '1.0.0') addCode(codes, 'FAIL_UNSUPPORTED_VERSION');
    if (Object.hasOwn(input, 'cross_package_reference')) addCode(codes, 'FAIL_CROSS_PACKAGE_REFERENCE');
    if (!adapterShape(input)) addCode(codes, 'FAIL_SCHEMA');
    if (!pkg) return [...codes, 'FAIL_PACKAGE_BINDING'];
    const expectedBinding = {
      package_id: pkg.package_id,
      package_version: pkg.package_version,
      game_id: pkg.game_id,
      game_version: pkg.game_version,
      source_repository: pkg.source_repository,
      source_commit: pkg.source_commit,
      source_tree: pkg.source_tree,
      source_digest: pkg.source_digest,
      package_manifest_sha256: sha256(packageBytes),
    };
    if (!same(input.package_binding, expectedBinding)) addCode(codes, 'FAIL_PACKAGE_BINDING');
    const entrypoint = Array.isArray(pkg.entrypoints)
      ? pkg.entrypoints.find((item) => item.test_unit_id === input.selected_test_unit)
      : null;
    if (!entrypoint) return [...codes, 'FAIL_PACKAGE_BINDING'];
    const mappingIDs = [
      ...entrypoint.scene_ids, ...entrypoint.guide_ids, ...entrypoint.rule_ids, ...entrypoint.asset_ids,
    ];
    const allIDs = [...mappingIDs, ...entrypoint.reference_ids];
    const expectedMappings = pkg.mappings.filter((item) => mappingIDs.includes(item.logical_id))
      .map(({ logical_id, source_kind, source_path, content_sha256, visibility_class }) =>
        ({ logical_id, source_kind, source_path, content_sha256, visibility_class }))
      .sort((left, right) => left.logical_id.localeCompare(right.logical_id));
    const actualMappings = Array.isArray(input.resolved_mappings)
      ? [...input.resolved_mappings].sort((left, right) => String(left.logical_id).localeCompare(String(right.logical_id)))
      : [];
    if (!same(expectedMappings, actualMappings)) addCode(codes, 'FAIL_PACKAGE_BINDING');
    const expectedVisibility = pkg.visibility_declarations.filter((item) => allIDs.includes(item.logical_id))
      .sort((left, right) => left.logical_id.localeCompare(right.logical_id));
    const actualVisibility = Array.isArray(input.visibility_resolution)
      ? [...input.visibility_resolution].sort((left, right) => String(left.logical_id).localeCompare(String(right.logical_id)))
      : [];
    if (!same(expectedVisibility, actualVisibility)) addCode(codes, 'FAIL_VISIBILITY');
    if (!sameSet(input.scenario_references ?? [], entrypoint.scene_ids) ||
        !sameSet(input.guide_references ?? [], entrypoint.guide_ids) ||
        !sameSet(input.rule_references ?? [], entrypoint.rule_ids) ||
        !sameSet(input.asset_references ?? [], entrypoint.asset_ids) ||
        !sameSet(input.declared_capabilities ?? [], pkg.declared_capabilities)) addCode(codes, 'FAIL_PACKAGE_BINDING');
    const boundary = input.evidence_boundary;
    if (!boundary || !sameSet(boundary.player_visible_source_ids ?? [], entrypoint.player_visible_ids) ||
        !sameSet(boundary.non_player_source_ids ?? [], [...entrypoint.gm_only_ids, ...entrypoint.system_internal_ids]) ||
        (boundary.player_visible_gm_only_source_ids ?? []).length !== 0) addCode(codes, 'FAIL_VISIBILITY');
    const visibility = new Map(pkg.visibility_declarations.map((item) => [item.logical_id, item.visibility_class]));
    for (const logicalID of boundary?.player_visible_source_ids ?? []) {
      if (visibility.get(logicalID) !== 'PLAYER_VISIBLE') addCode(codes, 'FAIL_VISIBILITY');
    }
    const runBinding = input.provenance?.run_manifest;
    if (!manifest || !runBinding || runBinding.manifest_id !== manifest.manifest_id ||
        runBinding.run_id !== manifest.run_id || runBinding.canonical_sha256 !== manifest.canonical_sha256) {
      addCode(codes, manifest ? 'FAIL_B001_COMPATIBILITY' : 'FAIL_SCHEMA');
    }
    const gameSource = {
      repository: pkg.source_repository, commit: pkg.source_commit, tree: pkg.source_tree,
    };
    if (!same(runBinding?.game_source, gameSource) || !same(runBinding?.game_source, manifest?.source?.game) ||
        !same(runBinding?.aipt_source, manifest?.source?.aipt) ||
        runBinding?.ancestry?.run_id !== manifest?.run_id) addCode(codes, 'FAIL_B001_COMPATIBILITY');
    const authority = input.provenance?.authority;
    if (!authority || authority.task_id !== pkg.compatibility.authority_task_id ||
        authority.authority_version !== pkg.compatibility.authority_version ||
        authority.commit !== pkg.compatibility.authority_commit || authority.tree !== pkg.compatibility.authority_tree ||
        authority.registry_sha256 !== pkg.compatibility.authority_registry_sha256 ||
        authority.artifact_manifest_sha256 !== pkg.compatibility.authority_artifact_manifest_sha256) {
      addCode(codes, 'FAIL_PACKAGE_BINDING');
    }
    if (!sameSet(input.provenance?.mapping_logical_ids ?? [], allIDs)) addCode(codes, 'FAIL_PACKAGE_BINDING');
    const selectedPaths = [...pkg.mappings.filter((item) => mappingIDs.includes(item.logical_id)),
      ...pkg.references.filter((item) => entrypoint.reference_ids.includes(item.reference_id))]
      .map((item) => item.source_path);
    if (!sameSet(input.provenance?.source_paths ?? [], selectedPaths)) addCode(codes, 'FAIL_PACKAGE_BINDING');
    if (!boundDigest(input, 'canonical_sha256')) addCode(codes, 'FAIL_PACKAGE_BINDING');
    if (secretDetected(canonicalJSON(input))) addCode(codes, 'FAIL_SECRET');
  } catch {
    addCode(codes, 'FAIL_SCHEMA');
  }
  return codes;
}

function validateEvidence(evidence, pkg, adapter) {
  const codes = [];
  try {
    if (!object(evidence) || !exactKeys(evidence, [
      'schema', 'evidence_version', 'task_id', 'predecessor_validation_target',
      'candidate_validation_target', 'authority', 'package_binding', 'adapter_binding',
      'b001_binding', 'visibility_proof', 'runtime_boundaries',
    ]) || evidence.schema !== 'unregistered.aipt.p1-b000.compatibility-evidence/v1' ||
        evidence.evidence_version !== '1.0.0' || evidence.task_id !== TASK_ID) return ['FAIL_SCHEMA'];
    const predecessor = evidence.predecessor_validation_target;
    if (predecessor?.repository !== SOURCE_REPOSITORY || predecessor?.commit !== PREDECESSOR_COMMIT ||
        predecessor?.tree !== PREDECESSOR_TREE || predecessor?.detached_checkout_required !== true ||
        predecessor?.candidate_overlay_permitted !== false || predecessor?.node_version !== 'v24.19.0' ||
        !Array.isArray(predecessor?.p0_gate_results) || predecessor.p0_gate_results.length !== 4 ||
        predecessor.p0_gate_results.some((gate, index) => gate.result !== 'PASS' ||
          gate.gate_id !== `P0-B00${index}` || !SHA256.test(gate.validator_sha256 || ''))) {
      addCode(codes, 'FAIL_PROVENANCE');
    }
    const candidate = evidence.candidate_validation_target;
    if (candidate?.base_commit !== PREDECESSOR_COMMIT || candidate?.base_tree !== PREDECESSOR_TREE ||
        candidate?.branch !== 'task/UNREGISTERED-AIPT-P1-B000' || candidate?.candidate_commit_embedded !== false ||
        candidate?.candidate_identity_recording !== 'STRUCTURED_STAGE_REVIEW' ||
        candidate?.protected_inventory_artifact_sha256 !== INVENTORY_ARTIFACT_SHA256 ||
        candidate?.protected_inventory_projection_sha256 !== INVENTORY_PROJECTION_SHA256 ||
        !same(candidate?.allowed_additions, ALLOWED_ADDITIONS) ||
        !same(candidate?.allowed_controlled_modifications, ALLOWED_CONTROLLED_MODIFICATIONS) ||
        candidate?.p0_preservation_required !== true || candidate?.unexpected_delta_permitted !== false) {
      addCode(codes, 'FAIL_PROVENANCE');
    }
    const authority = evidence.authority;
    if (authority?.canonical_lifecycle_source !== 'ACCEPTED_APPEND_ONLY_LIFECYCLE_RECORD_CHAIN' ||
        authority?.base_authority?.task_id !== AUTHORITY_TASK_ID ||
        authority?.base_authority?.semantic_candidate_commit !== AUTHORITY_COMMIT ||
        authority?.base_authority?.semantic_candidate_tree !== AUTHORITY_TREE ||
        authority?.base_authority?.lifecycle_state !== 'CLOSED' || authority?.base_authority?.effective !== true ||
        authority?.authority_version !== '1.0.0' || authority?.authority_registry_sha256 !== AUTHORITY_REGISTRY_SHA256 ||
        authority?.authority_artifact_manifest_sha256 !== AUTHORITY_ARTIFACT_MANIFEST_SHA256 ||
        authority?.authority_validator_sha256 !== 'c6f0c8e01397200ce15f48bf1fc2412d9db477dddc37d3f99e0478d26956dd0c' ||
        authority?.b001_validator_sha256 !== '319c8d4a3466c20d14e2d5fc74cc246c9b796d36f884fcc39e2b0a25317351c4' ||
        !Array.isArray(authority?.accepted_amendments) || authority.accepted_amendments.length !== 3 ||
        authority.accepted_amendments.some((item) => item.lifecycle_state !== 'CLOSED' || item.effective !== true)) {
      addCode(codes, 'FAIL_PROVENANCE');
    }
    const expectedPackageBinding = {
      path: PACKAGE_PATH,
      package_id: pkg.package_id,
      package_version: pkg.package_version,
      source_repository: pkg.source_repository,
      source_commit: pkg.source_commit,
      source_tree: pkg.source_tree,
      source_digest: pkg.source_digest,
      package_manifest_sha256: PACKAGE_MANIFEST_SHA256,
    };
    if (!same(evidence.package_binding, expectedPackageBinding)) addCode(codes, 'FAIL_PROVENANCE');
    if (evidence.adapter_binding?.path !== ADAPTER_PATH ||
        evidence.adapter_binding?.adapter_input_id !== adapter.adapter_input_id ||
        evidence.adapter_binding?.adapter_contract_version !== adapter.adapter_contract_version ||
        evidence.adapter_binding?.canonical_sha256 !== adapter.canonical_sha256) addCode(codes, 'FAIL_PROVENANCE');
    const b001 = evidence.b001_binding;
    const plan = b001?.test_plan;
    const manifest = b001?.run_manifest;
    if (!testPlanShape(plan) || !runManifestShape(manifest)) addCode(codes, 'FAIL_B001_REGRESSION');
    const campaign = plan?.campaigns?.[0];
    const suite = campaign?.suites?.[0];
    const testCase = suite?.cases?.[0];
    const run = testCase?.runs?.[0];
    if (plan?.campaigns?.length !== 1 || campaign?.suites?.length !== 1 || suite?.cases?.length !== 1 ||
        testCase?.runs?.length !== 1 || run?.run_id !== manifest?.run_id ||
        run?.manifest_id !== manifest?.manifest_id || run?.run_type !== manifest?.run_type ||
        manifest?.ancestry?.campaign_id !== campaign?.campaign_id ||
        manifest?.ancestry?.suite_id !== suite?.suite_id || manifest?.ancestry?.case_id !== testCase?.case_id ||
        !same(manifest?.source?.game, {
          repository: pkg.source_repository, commit: pkg.source_commit, tree: pkg.source_tree,
        }) || !same(manifest?.source?.aipt, {
          repository: 'zyc14588/AIPT', commit: AIPT_ANCESTRY_COMMIT, tree: AIPT_ANCESTRY_TREE,
        })) addCode(codes, 'FAIL_B001_REGRESSION');
    if (!same(b001?.protected_baseline, EXPECTED_BASELINE) || !same(b001?.binding_chain, [
      'CAMPAIGN_SUITE_CASE_RUN',
      'IMMUTABLE_RUN_MANIFEST_ID_AND_CANONICAL_SHA256',
      'RUN_MANIFEST_SOURCE_GAME_REPOSITORY_COMMIT_TREE',
      'ADAPTER_INPUT_PACKAGE_BINDING_WITH_EQUAL_REPOSITORY_COMMIT_TREE',
      'PACKAGE_SOURCE_DIGEST_AND_FILE_DIGESTS',
    ])) addCode(codes, 'FAIL_B001_REGRESSION');
    const entrypoint = pkg.entrypoints[0];
    const proof = evidence.visibility_proof;
    if (!sameSet(proof?.player_visible_source_ids ?? [], entrypoint.player_visible_ids) ||
        !sameSet(proof?.gm_only_source_ids ?? [], entrypoint.gm_only_ids) ||
        !sameSet(proof?.system_internal_source_ids ?? [], entrypoint.system_internal_ids) ||
        (proof?.player_visible_gm_only_intersection ?? ['invalid']).length !== 0 || proof?.result !== 'PASS') {
      addCode(codes, 'FAIL_VISIBILITY');
    }
    if (!same(evidence.runtime_boundaries, EXPECTED_RUNTIME_BOUNDARIES)) addCode(codes, 'FAIL_RUNTIME_BOUNDARY');
    if (secretDetected(canonicalJSON(evidence))) addCode(codes, 'FAIL_SECRET');
  } catch {
    addCode(codes, 'FAIL_SCHEMA');
  }
  return codes;
}

function gitCall(args, encoding = 'utf8') {
  return spawnSync('git', args, {
    cwd: ROOT,
    encoding,
    maxBuffer: 128 * 1024 * 1024,
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GITHUB_TOKEN'))),
  });
}

function gitText(args) {
  const result = gitCall(args, 'utf8');
  if (result.error || result.signal || result.status !== 0) {
    throw new Error(`git ${args[0]} failed: ${result.error?.message ?? result.stderr?.trim() ?? result.signal}`);
  }
  return result.stdout.trim();
}

function sourceFacts(pkg) {
  if (gitText(['rev-parse', `${pkg.source_commit}^{commit}`]) !== pkg.source_commit) {
    throw new Error('source commit does not resolve exactly');
  }
  if (gitText(['rev-parse', `${pkg.source_commit}^{tree}`]) !== pkg.source_tree) {
    throw new Error('source tree does not match source commit');
  }
  const paths = [...new Set([
    ...pkg.mappings.map((item) => item.source_path), ...pkg.references.map((item) => item.source_path),
  ])];
  const facts = new Map();
  for (const sourcePath of paths) {
    const result = gitCall(['ls-tree', '-z', '--full-tree', pkg.source_commit, '--', sourcePath], null);
    if (result.error || result.signal || result.status !== 0 || !Buffer.isBuffer(result.stdout)) {
      throw new Error(`cannot inspect source path: ${sourcePath}`);
    }
    const records = result.stdout.toString('utf8').split('\0').filter(Boolean);
    if (records.length !== 1) continue;
    const match = /^(\d+) (\w+) ([0-9a-f]{40})\t(.+)$/u.exec(records[0]);
    if (!match || match[4] !== sourcePath) continue;
    const [, mode, type, objectID] = match;
    const blob = gitCall(['cat-file', 'blob', objectID], null);
    if (blob.error || blob.signal || blob.status !== 0 || !Buffer.isBuffer(blob.stdout)) continue;
    facts.set(sourcePath, { mode, type, object: objectID, bytes: blob.stdout });
  }
  return facts;
}

function cloneFacts(facts) {
  return new Map([...facts].map(([sourcePath, fact]) => [sourcePath, {
    ...fact, bytes: Buffer.from(fact.bytes),
  }]));
}

function concreteContractProblems(pkg, adapter, evidence, packageBytes) {
  const problems = [];
  if (pkg.package_id !== 'zyc14588/agent-sim' || pkg.package_version !== '1.0.0' ||
      pkg.game_id !== 'UNREGISTERED' || pkg.game_version !== '0.0.0-prototype.0' || pkg.package_root !== '.' ||
      pkg.source_repository !== SOURCE_REPOSITORY || pkg.source_commit !== PREDECESSOR_COMMIT ||
      pkg.source_tree !== PREDECESSOR_TREE || pkg.source_digest !== PACKAGE_SOURCE_DIGEST ||
      sha256(packageBytes) !== PACKAGE_MANIFEST_SHA256) problems.push('concrete package/source identity drifted');
  if (pkg.compatibility?.aipt_ancestry_commit !== AIPT_ANCESTRY_COMMIT ||
      pkg.compatibility?.aipt_ancestry_tree !== AIPT_ANCESTRY_TREE ||
      pkg.compatibility?.authority_task_id !== AUTHORITY_TASK_ID ||
      pkg.compatibility?.authority_commit !== AUTHORITY_COMMIT || pkg.compatibility?.authority_tree !== AUTHORITY_TREE ||
      pkg.compatibility?.authority_registry_sha256 !== AUTHORITY_REGISTRY_SHA256 ||
      pkg.compatibility?.authority_artifact_manifest_sha256 !== AUTHORITY_ARTIFACT_MANIFEST_SHA256) {
    problems.push('AIPT/Authority compatibility binding drifted');
  }
  const actualItems = new Map([
    ...pkg.mappings.map((item) => [item.logical_id, item]),
    ...pkg.references.map((item) => [item.reference_id, { ...item, source_kind: 'REFERENCE' }]),
  ]);
  if (!sameSet([...actualItems.keys()], Object.keys(SOURCE_ITEMS))) problems.push('concrete source mapping inventory drifted');
  for (const [logicalID, expected] of Object.entries(SOURCE_ITEMS)) {
    const actual = actualItems.get(logicalID);
    if (!actual || actual.source_kind !== expected.source_kind || actual.source_path !== expected.source_path ||
        actual.content_sha256 !== expected.content_sha256 || actual.visibility_class !== expected.visibility_class) {
      problems.push(`concrete source mapping drifted: ${logicalID}`);
    }
  }
  if (adapter.canonical_sha256 !== ADAPTER_CANONICAL_SHA256 ||
      evidence.b001_binding?.run_manifest?.canonical_sha256 !== RUN_MANIFEST_CANONICAL_SHA256 ||
      evidence.adapter_binding?.canonical_sha256 !== ADAPTER_CANONICAL_SHA256) {
    problems.push('adapter/run-manifest deterministic identity drifted');
  }
  return problems;
}

function negativeProbes(pkg, adapter, evidence, packageBytes, facts) {
  const probes = [];
  let uncaught = 0;
  const record = (id, codes) => probes.push({
    id,
    name: NEGATIVE_NAMES[Number(id.slice(1)) - 1],
    expected: EXPECTED_PROBE_CODES[Number(id.slice(1)) - 1],
    observed: codes,
    matched: codes.includes(EXPECTED_PROBE_CODES[Number(id.slice(1)) - 1]),
  });
  const safe = (id, callback) => {
    try { record(id, callback()); } catch (error) {
      uncaught += 1;
      record(id, [`UNCAUGHT:${error.message}`]);
    }
  };
  const packageProbe = (id, mutate, options = {}) => safe(id, () => {
    let value = clone(pkg);
    const mutatedFacts = cloneFacts(facts);
    mutate(value, mutatedFacts);
    if (options.rebind) value = rebind(value, 'source_digest');
    return validatePackage(value, mutatedFacts, options.expectedSource ?? {
      repository: SOURCE_REPOSITORY, commit: PREDECESSOR_COMMIT, tree: PREDECESSOR_TREE,
    }, options.loadedPackages ?? [value]);
  });
  const adapterProbe = (id, mutate, options = {}) => safe(id, () => {
    let value = clone(adapter);
    mutate(value);
    if (options.rebind) value = rebind(value, 'canonical_sha256');
    return validateAdapter(value, options.noPackage ? null : pkg, packageBytes,
      options.manifest ?? evidence.b001_binding.run_manifest);
  });
  const evidenceProbe = (id, mutate) => safe(id, () => {
    const value = clone(evidence);
    mutate(value);
    return validateEvidence(value, pkg, adapter);
  });

  safe('N01', () => validatePackage('not-an-object', facts, {}));
  packageProbe('N02', (value) => { value.schema_version = '2.0.0'; }, { rebind: true });
  packageProbe('N03', (value) => { delete value.package_id; }, { rebind: true });
  packageProbe('N04', () => {}, { loadedPackages: [pkg, clone(pkg)] });
  packageProbe('N05', (value) => { value.package_version = 'v1'; }, { rebind: true });
  packageProbe('N06', (value) => { delete value.source_commit; }, { rebind: true });
  packageProbe('N07', () => {}, { expectedSource: {
    repository: SOURCE_REPOSITORY, commit: 'a'.repeat(40), tree: PREDECESSOR_TREE,
  } });
  packageProbe('N08', () => {}, { expectedSource: {
    repository: SOURCE_REPOSITORY, commit: PREDECESSOR_COMMIT, tree: 'b'.repeat(40),
  } });
  packageProbe('N09', (value) => { value.source_digest = 'f'.repeat(64); });
  packageProbe('N10', (_value, mutatedFacts) => {
    const target = SOURCE_ITEMS['UNR-SCENE-T000-PLAYER-HANDOUTS'].source_path;
    mutatedFacts.get(target).bytes = Buffer.from('# stale source\n');
  });
  packageProbe('N11', (value) => { value.mappings[1].logical_id = value.mappings[0].logical_id; }, { rebind: true });
  packageProbe('N12', (value) => { value.mappings[0].source_kind = 'UNKNOWN'; }, { rebind: true });
  packageProbe('N13', (value) => { value.mappings[0].depends_on = ['UNR-MISSING']; }, { rebind: true });
  packageProbe('N14', (value) => { value.mappings[0].source_path = '../escape'; }, { rebind: true });
  packageProbe('N15', (value) => { value.package_root = 'campaign'; }, { rebind: true });
  packageProbe('N16', (_value, mutatedFacts) => {
    mutatedFacts.delete(SOURCE_ITEMS['UNR-SCENE-T000-PLAYER-HANDOUTS'].source_path);
  });
  packageProbe('N17', (value) => { value.mappings[0].content_sha256 = 'f'.repeat(64); }, { rebind: true });
  packageProbe('N18', (value) => { value.visibility_declarations.shift(); }, { rebind: true });
  packageProbe('N19', (value) => { value.mappings[0].visibility_class = 'UNKNOWN'; }, { rebind: true });
  packageProbe('N20', (value) => {
    value.entrypoints[0].player_visible_ids.push('UNR-GUIDE-T000-STAGE3');
    value.entrypoints[0].gm_only_ids = ['UNR-REFERENCE-SESSION0-REDLINES'];
  }, { rebind: true });
  adapterProbe('N21', (value) => {
    value.evidence_boundary.player_visible_source_ids.push('UNR-GUIDE-T000-STAGE3');
  }, { rebind: true });
  packageProbe('N22', (value) => {
    value.entrypoints[0].player_visible_ids.push('UNR-ASSET-P0-B003-GAME-ADAPTER');
    value.entrypoints[0].system_internal_ids = ['UNR-RULE-P0-B002-MACHINE-RULES'];
  }, { rebind: true });
  packageProbe('N23', (_value, mutatedFacts) => {
    const target = SOURCE_ITEMS['UNR-SCENE-T000-PLAYER-HANDOUTS'].source_path;
    const sensitiveName = ['api', 'key'].join('_');
    const syntheticValue = ['dsk', 'synthetic-negative-probe'].join('-');
    mutatedFacts.get(target).bytes = Buffer.from(`${sensitiveName}=${syntheticValue}\n`);
  });
  packageProbe('N24', (value) => {
    value.visibility_declarations.push({
      ...clone(value.visibility_declarations[0]), visibility_class: 'GM_ONLY',
      allowed_surfaces: [...VISIBILITY_SURFACES.GM_ONLY],
    });
  }, { rebind: true });
  adapterProbe('N25', (value) => { value.adapter_contract_version = '2.0.0'; }, { rebind: true });
  adapterProbe('N26', (value) => { delete value.selected_test_unit; }, { rebind: true });
  adapterProbe('N27', () => {}, { noPackage: true });
  adapterProbe('N28', (value) => { value.cross_package_reference = 'other/package'; }, { rebind: true });
  adapterProbe('N29', (value) => { delete value.provenance.run_manifest; }, { rebind: true });
  adapterProbe('N30', (value) => { value.provenance.run_manifest.game_source.commit = 'a'.repeat(40); }, { rebind: true });
  packageProbe('N31', (value) => { value.source_commit = 'main'; }, { rebind: true });
  adapterProbe('N32', (value) => { delete value.provenance.source_paths; }, { rebind: true });
  evidenceProbe('N33', (value) => { value.b001_binding.test_plan.campaigns = []; });
  evidenceProbe('N34', (value) => {
    value.b001_binding.test_plan.campaigns[0].suites[0].cases[0].runs[0].attempt_policy.scope = 'EXTERNAL';
  });
  evidenceProbe('N35', (value) => { value.b001_binding.run_manifest.budget.max_input_tokens = 2; });
  evidenceProbe('N36', (value) => { value.b001_binding.protected_baseline.postgresql_queue_authority = false; });
  evidenceProbe('N37', (value) => { value.b001_binding.protected_baseline.formal_wip = 2; });
  evidenceProbe('N38', (value) => { value.b001_binding.protected_baseline.recovery = false; });
  evidenceProbe('N39', (value) => { value.b001_binding.protected_baseline.attempt_history_append_only = false; });
  return { probes, uncaught };
}

function securityProbes(pkg, facts) {
  const results = [];
  let uncaught = 0;
  const probe = (id, name, callback) => {
    try {
      const rejected = callback();
      results.push({ id, name, expectation: 'REJECT', matched: rejected === true });
    } catch {
      uncaught += 1;
      results.push({ id, name, expectation: 'REJECT', matched: false });
    }
  };
  probe('S01', 'symlink mapped target', () => {
    const value = clone(pkg);
    const mutatedFacts = cloneFacts(facts);
    const target = value.mappings[0].source_path;
    mutatedFacts.get(target).mode = '120000';
    return validatePackage(value, mutatedFacts, {
      repository: SOURCE_REPOSITORY, commit: PREDECESSOR_COMMIT, tree: PREDECESSOR_TREE,
    }).includes('FAIL_PATH_POLICY');
  });
  probe('S02', 'absolute path escape', () => !validSourcePath('/tmp/escape'));
  probe('S03', 'case-folding collision', () =>
    validateCanonicalPaths(['campaign/Test.md', 'campaign/test.md']).includes('CASE_FOLD_COLLISION'));
  probe('S04', 'Unicode normalization collision', () =>
    validateCanonicalPaths(['campaign/caf\u00e9.md', 'campaign/cafe\u0301.md'])
      .includes('UNICODE_NORMALIZATION_COLLISION'));
  probe('S05', 'duplicate canonical path', () =>
    validateCanonicalPaths(['campaign/source.md', 'campaign/source.md']).includes('DUPLICATE_CANONICAL_PATH'));
  probe('S06', 'digest algorithm mismatch', () => {
    const value = clone(pkg);
    value.digest_scope.algorithm = 'SHA-1';
    value.source_digest = rebind(value, 'source_digest').source_digest;
    return validatePackage(value, facts, {
      repository: SOURCE_REPOSITORY, commit: PREDECESSOR_COMMIT, tree: PREDECESSOR_TREE,
    }).includes('FAIL_SCHEMA');
  });
  probe('S07', 'cross-package root reference', () => {
    const value = clone(pkg);
    value.package_root = 'campaign';
    value.source_digest = rebind(value, 'source_digest').source_digest;
    return validatePackage(value, facts, {
      repository: SOURCE_REPOSITORY, commit: PREDECESSOR_COMMIT, tree: PREDECESSOR_TREE,
    }).includes('FAIL_PATH_POLICY');
  });
  probe('S08', 'indirect hidden-information leak', () => {
    const value = clone(pkg);
    value.mappings.find((item) => item.logical_id === 'UNR-SCENE-T000-PLAYER-HANDOUTS')
      .depends_on = ['UNR-GUIDE-T000-STAGE3'];
    value.source_digest = rebind(value, 'source_digest').source_digest;
    return validatePackage(value, facts, {
      repository: SOURCE_REPOSITORY, commit: PREDECESSOR_COMMIT, tree: PREDECESSOR_TREE,
    }).includes('FAIL_VISIBILITY');
  });
  return { results, uncaught };
}

function controlSurfaceProblems() {
  const problems = [];
  const workflow = fs.readFileSync(path.join(ROOT, WORKFLOW_PATH), 'utf8');
  const status = JSON.parse(fs.readFileSync(path.join(ROOT, STATUS_PATH), 'utf8'));
  const readme = fs.readFileSync(path.join(ROOT, README_PATH), 'utf8');
  const requiredWorkflowFragments = [
    "name: AIPT Content Gate",
    "node-version: '24.19.0'",
    'Validate exact frozen predecessor and P1 B000 candidate',
    'node scripts/aipt/validate-p1-b000.mjs',
    PREDECESSOR_COMMIT,
    PREDECESSOR_TREE,
    '97085cb48ea3c20fc60a049c0e145d2ecc37dc3f',
  ];
  if (requiredWorkflowFragments.some((fragment) => !workflow.includes(fragment)) ||
      /OPENAI_API_KEY|DEEPSEEK_API_KEY|model gateway|real playtest/iu.test(workflow)) {
    problems.push('AIPT Content Gate deterministic P0/P1 wiring missing or provider boundary violated');
  }
  if (status.aipt_schema !== 'aipt.status.v4' || status.current_batch !== TASK_ID ||
      status.status !== 'CANDIDATE_FROZEN' || status.global_wip !== 1 ||
      status.predecessor?.commit !== PREDECESSOR_COMMIT || status.predecessor?.tree !== PREDECESSOR_TREE ||
      status.merge_authorized !== false || status.closeout_authorized !== false ||
      status.next_batch_authorized !== false || status.next_batch_started !== false ||
      !same(status.runtime_boundaries, EXPECTED_RUNTIME_BOUNDARIES)) problems.push('P1 B000 status/control boundary drifted');
  if (!readme.includes('UNREGISTERED-AIPT-P1-B000') || !readme.includes('validate-p1-b000.mjs') ||
      !readme.includes('historical predecessor')) problems.push('P1 B000 README contract index/warning missing');
  return problems;
}

function changedPathEvidence() {
  const changed = new Set();
  for (const args of [
    ['diff', '--name-only', PREDECESSOR_COMMIT, 'HEAD'],
    ['diff', '--name-only'],
    ['diff', '--cached', '--name-only'],
    ['ls-files', '--others', '--exclude-standard'],
  ]) {
    const result = gitCall(args, 'utf8');
    if (!result.error && !result.signal && result.status === 0) {
      for (const line of result.stdout.split('\n').map((item) => item.trim()).filter(Boolean)) changed.add(line);
    }
  }
  const observed = [...changed].sort();
  return {
    observed,
    unauthorized: observed.filter((item) => !ALLOWED_CHANGED_PATHS.includes(item)),
  };
}

function secretScanProblems(facts) {
  const problems = [];
  const paths = [...ALLOWED_CHANGED_PATHS];
  for (const relative of paths) {
    const absolute = path.join(ROOT, relative);
    if (!fs.existsSync(absolute)) continue;
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      problems.push(`non-regular authorized surface: ${relative}`);
      continue;
    }
    if (secretDetected(fs.readFileSync(absolute))) problems.push(`secret signature detected: ${relative}`);
  }
  for (const [sourcePath, fact] of facts) {
    if (secretDetected(fact.bytes)) problems.push(`secret signature detected in mapped source: ${sourcePath}`);
  }
  return problems;
}

function main() {
  let uncaughtValidationErrors = 0;
  const details = [];
  const fail = (message) => details.push(`FAIL: ${message}`);
  const ok = (message) => details.push(`ok: ${message}`);
  let report;
  try {
    if (process.version !== 'v24.19.0') fail(`Node v24.19.0 required, got ${process.version}`);
    const packageBytes = fs.readFileSync(path.join(ROOT, PACKAGE_PATH));
    const pkg = JSON.parse(packageBytes.toString('utf8'));
    const adapter = JSON.parse(fs.readFileSync(path.join(ROOT, ADAPTER_PATH), 'utf8'));
    const evidence = JSON.parse(fs.readFileSync(path.join(ROOT, EVIDENCE_PATH), 'utf8'));
    const facts = sourceFacts(pkg);
    const expectedSource = {
      repository: SOURCE_REPOSITORY, commit: PREDECESSOR_COMMIT, tree: PREDECESSOR_TREE,
    };
    const packageCodes = validatePackage(pkg, facts, expectedSource);
    const adapterCodes = validateAdapter(adapter, pkg, packageBytes, evidence.b001_binding?.run_manifest);
    const evidenceCodes = validateEvidence(evidence, pkg, adapter);
    const concreteProblems = concreteContractProblems(pkg, adapter, evidence, packageBytes);
    if (packageCodes.length === 0) ok('Playtest Package schema, source identity/digest, mapping and visibility PASS');
    else fail(`Playtest Package rejected: ${packageCodes.join(',')}`);
    if (adapterCodes.length === 0) ok('Runtime Adapter Input binding, provenance and deterministic digest PASS');
    else fail(`Runtime Adapter Input rejected: ${adapterCodes.join(',')}`);
    if (evidenceCodes.length === 0) ok('B001 Campaign/Suite/Case/Run and immutable Run Manifest evidence PASS');
    else fail(`compatibility evidence rejected: ${evidenceCodes.join(',')}`);
    for (const problem of concreteProblems) fail(problem);
    if (concreteProblems.length === 0) ok('concrete UNREGISTERED package/authority identities are exact');

    const negatives = negativeProbes(pkg, adapter, evidence, packageBytes, facts);
    const security = securityProbes(pkg, facts);
    uncaughtValidationErrors += negatives.uncaught + security.uncaught;
    const unexpected = negatives.probes.filter((probe) => !probe.matched);
    const unexpectedSecurity = security.results.filter((probe) => !probe.matched);
    if (negatives.probes.length === 39 && unexpected.length === 0) ok('N01-N39 all rejected with required result classes');
    else fail(`negative probe mismatch: ${unexpected.map((probe) => probe.id).join(',')}`);
    if (security.results.length === 8 && unexpectedSecurity.length === 0) ok('additional path/digest/indirect-leak probes all rejected');
    else fail(`security probe mismatch: ${unexpectedSecurity.map((probe) => probe.id).join(',')}`);

    const controls = controlSurfaceProblems();
    for (const problem of controls) fail(problem);
    if (controls.length === 0) ok('workflow/status/README control surfaces are fail-closed');
    const delta = changedPathEvidence();
    if (delta.unauthorized.length > 0) fail(`unauthorized changed paths: ${delta.unauthorized.join(',')}`);
    else ok('observed worktree/candidate paths are inside the exact Authority allowlist');
    const secrets = secretScanProblems(facts);
    for (const problem of secrets) fail(problem);
    if (secrets.length === 0) ok('package, evidence, validator, workflow and mapped sources are secret-free');

    const head = gitText(['rev-parse', 'HEAD']);
    const tree = gitText(['rev-parse', 'HEAD^{tree}']);
    const result = details.some((item) => item.startsWith('FAIL:')) || uncaughtValidationErrors !== 0
      ? 'FAIL' : 'PASS';
    report = {
      schema: 'unregistered.aipt.p1-b000-validator-report/v1',
      task_id: TASK_ID,
      result,
      details,
      validation_target: { repository: SOURCE_REPOSITORY, head, tree },
      source: {
        repository: SOURCE_REPOSITORY,
        commit: pkg.source_commit,
        tree: pkg.source_tree,
        digest: pkg.source_digest,
        identity_verified: packageCodes.length === 0,
      },
      playtest_package: {
        path: PACKAGE_PATH,
        package_id: pkg.package_id,
        package_version: pkg.package_version,
        manifest_sha256: sha256(packageBytes),
        schema_validation: packageCodes.includes('FAIL_SCHEMA') ? 'FAIL' : 'PASS',
        source_binding: packageCodes.includes('FAIL_SOURCE_IDENTITY') ? 'FAIL' : 'PASS',
        digest_validation: packageCodes.includes('FAIL_SOURCE_DIGEST') ? 'FAIL' : 'PASS',
      },
      source_mapping: {
        scene: packageCodes.length === 0 ? 'PASS' : 'FAIL',
        guide: packageCodes.length === 0 ? 'PASS' : 'FAIL',
        rule: packageCodes.length === 0 ? 'PASS' : 'FAIL',
        asset: packageCodes.length === 0 ? 'PASS' : 'FAIL',
        reference_integrity: packageCodes.includes('FAIL_REFERENCE_INTEGRITY') ? 'FAIL' : 'PASS',
      },
      visibility: {
        classification: packageCodes.includes('FAIL_VISIBILITY') ? 'FAIL' : 'PASS',
        player_visible_boundary: [...packageCodes, ...adapterCodes, ...evidenceCodes].includes('FAIL_VISIBILITY') ? 'FAIL' : 'PASS',
        gm_only_boundary: [...packageCodes, ...adapterCodes, ...evidenceCodes].includes('FAIL_VISIBILITY') ? 'FAIL' : 'PASS',
        system_internal_boundary: [...packageCodes, ...adapterCodes, ...evidenceCodes].includes('FAIL_VISIBILITY') ? 'FAIL' : 'PASS',
        secret_detection: secrets.length === 0 ? 'PASS' : 'FAIL',
      },
      runtime_adapter_input: {
        path: ADAPTER_PATH,
        adapter_input_id: adapter.adapter_input_id,
        canonical_sha256: adapter.canonical_sha256,
        schema_validation: adapterCodes.includes('FAIL_SCHEMA') ? 'FAIL' : 'PASS',
        package_binding: adapterCodes.includes('FAIL_PACKAGE_BINDING') ? 'FAIL' : 'PASS',
        source_binding: adapterCodes.includes('FAIL_B001_COMPATIBILITY') ? 'FAIL' : 'PASS',
        provenance: evidenceCodes.includes('FAIL_PROVENANCE') ? 'FAIL' : 'PASS',
        deterministic: boundDigest(adapter, 'canonical_sha256'),
      },
      b001_compatibility: evidenceCodes.includes('FAIL_B001_REGRESSION') ||
        adapterCodes.includes('FAIL_B001_COMPATIBILITY') ? 'FAIL' : 'PASS',
      negative_testing: {
        required_probes: unexpected.length === 0 && negatives.probes.length === 39 ? 'PASS' : 'FAIL',
        required_probe_count: negatives.probes.length,
        additional_security_probes: unexpectedSecurity.length === 0 ? 'PASS' : 'FAIL',
        additional_security_probe_count: security.results.length,
        unexpected_acceptances: unexpected.length + unexpectedSecurity.length,
        uncaught_validation_errors: uncaughtValidationErrors,
      },
      controlled_delta: {
        allowed_paths: ALLOWED_CHANGED_PATHS,
        observed_paths: delta.observed,
        unexpected_paths: delta.unauthorized,
      },
      runtime_boundaries: EXPECTED_RUNTIME_BOUNDARIES,
      real_model_calls: 0,
      real_playtest_executed: false,
    };
  } catch (error) {
    uncaughtValidationErrors += 1;
    report = {
      schema: 'unregistered.aipt.p1-b000-validator-report/v1',
      task_id: TASK_ID,
      result: 'FAIL',
      details: [`FAIL: structured validator error: ${error.message}`],
      b001_compatibility: 'FAIL',
      negative_testing: {
        required_probes: 'NOT_RUN', required_probe_count: 0,
        additional_security_probes: 'NOT_RUN', additional_security_probe_count: 0,
        unexpected_acceptances: 0, uncaught_validation_errors: uncaughtValidationErrors,
      },
      runtime_boundaries: EXPECTED_RUNTIME_BOUNDARIES,
      real_model_calls: 0,
      real_playtest_executed: false,
    };
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.result === 'PASS' ? 0 : 1;
}

main();
