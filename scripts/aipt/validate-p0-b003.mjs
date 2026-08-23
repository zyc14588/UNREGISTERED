#!/usr/bin/env node
// SPDX-License-Identifier: MIT

/**
 * Deterministic, fail-closed validator for UNREGISTERED-AIPT-P0-B003.
 *
 * This program uses Node.js standard-library read APIs only. It performs no
 * network, model, subprocess, repository, or filesystem mutation. Patch
 * overlays are evaluated only against structured in-memory clones.
 */

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const ROOT_REAL = realpathSync(ROOT);

const BATCH = "UNREGISTERED-AIPT-P0-B003";
const MUTANT_BASE = "62daf4a6de3f5560d3b2ea8ac7527654a6da616c";
const SAFETY_SHARD_BASE = "b28b2e2be6a065b948ecbf4b61cd9d0bf19de4cf";
const PARTICIPANT_CLASS = ["HUMAN", "PRIVATE", "DATA"].join("_");

const COMPATIBILITY_PATH = "aipt/p0-b003/compatibility.json";
const MUTATION_MAP_PATH = "aipt/p0-b003/mutation-id-map.json";
const MUTANT_ROOT = "aipt/p0-b003/NON_CANON_TEST_FIXTURE/mutants";
const MUTANT_MANIFEST_PATH = `${MUTANT_ROOT}/manifest.json`;
const CLEAN_ROOT = "aipt/p0-b003/NON_CANON_TEST_FIXTURE/clean";
const HUMAN_MAP_PATH = "aipt/p0-b003/human-guide-map.json";
const CORE_MAP_PATH = "aipt/p0-b003/human-guide/core-map.json";
const SAFETY_MAP_PATH = "aipt/p0-b003/human-guide/safety-observer-map.json";
const ADAPTER_PATH = "aipt/p0-b003/game-adapter.json";

const DIGEST_RULE = "AIPT_CANONICAL_JSON_V1_SORT_KEYS_NO_WHITESPACE";
const MARKERS = ["NON_CANON", "TEST_FIXTURE", "MUTANT"];
const MUTATION_IDS = ["UNR-MUTATION-0001", "UNR-MUTATION-0002", "UNR-MUTATION-0003"];
const RULE_IDS = Array.from({ length: 40 }, (_, i) => `UNR-RULE-${String(i + 1).padStart(4, "0")}`);
const INVARIANT_IDS = Array.from({ length: 10 }, (_, i) => `UNR-INVARIANT-${String(i + 1).padStart(4, "0")}`);
const CHARACTER_IDS = Array.from({ length: 4 }, (_, i) => `UNR-CHAR-${String(i + 1).padStart(4, "0")}`);
const SEAT_IDS = Array.from({ length: 4 }, (_, i) => `seat-${String(i + 1).padStart(2, "0")}`);

const FROZEN_DIGESTS = {
  "aipt/input-manifest.json": "0b5f13c4dbfe429fc07a59a67b2d1c10db9ba74d205f1b3e7a9a1e896577608a",
  "aipt/p0-b000/identity.json": "b2302eb17c6ab08bbc47bbcb884ff03f92de8b0159d7508c25c565b4ef31d22d",
  "aipt/p0-b000/licensing.json": "480b8924a928bdd8ed3e4eabadf2cb4bdfb4ee4021c7a8c5c0c2f1564d9ed17e",
  "aipt/p0-b000/premades-v2.json": "5bbd5bb9ca180004b4407e558961dc679dde888df78f3dd1b9d1ea2b8c9b2163",
  "aipt/p0-b001/safety-profile.json": "dea0b7a62ba8ac81cb9314546afebca400642d9923f9ae928d97c9a40a29304f",
  "aipt/p0-b001/stable-ids.json": "c7e296bf7f7595ec17e67e44fef60ac38e979d4906ab31d1d9081e6bed53dba6",
  "aipt/p0-b001/visibility.json": "e232a2f95c6359cf54dd5f4147c72e0c3433614e00555226cd2993716f7bbb70",
  "aipt/p0-b002/README.md": "660ba7147db95029e2c609419b2b63f204dee8d9275d19223c2c11dbc3b4c119",
  "aipt/p0-b002/machine-rules.json": "139d095fe54926e1599edf208b65f7a89061f1cda6d8b492f83b5e47c0693c78",
  "aipt/p0-b002/rule-id-map.json": "321550a1bb91066c263e5857c8095878d708af3f296430bc00011d70f5bb242c",
  "aipt/p0-b002/semantic-graph.json": "8c9ad9ade247ac6195019b7225725c70cd26b55270979d31c7b3701d02092562",
  "campaign/00-campaign.md": "f3d571052e3791dc3ab3a67dbcec0a9bf8bf66bdef61a5d4f2729823499ec5d3",
  "campaign/platform-notes.md": "f45b08f94a87797f7087d29052716dd533522a2e900bd89e1eca5eef9a49d5d7",
  "campaign/platform-package-plan.md": "741a399f5586a6cc5f33d377f3810226e4e373dcc668d294678c4b1bf9782d07",
  "campaign/playtest/gm-screen-v1.md": "2a054d42eb48e378a29db07ddd6c5cd751b4d2340f6426552fea516d63bf2b8a",
  "campaign/playtest/observation-sheet-v1.md": "dea8b39c372be9134caaf7813f2c0ef72884a5c936c0ddb5bdd98006995b3908",
  "campaign/playtest/observer-cheatsheet-v1.md": "02ea5cf8d0280f16e0cab5cdc83930069363055c43366ae2e409ecea65694a62",
  "campaign/playtest/prototype-table-test-guide-v1.md": "a3cef11993fbf9765bc8e614bfca01d6dc84fe41452ffa0cf96af004e799bd40",
  "campaign/playtest/rule-knowledge-sheet-v1.md": "61af1a1beaede971b50508bc38954533b18e3706587dc96e472406c0260d3691",
  "campaign/playtest/scripts/sim_infiltration_v1.py": "2667285421d3c88eb24165eee73494e5a47b7fd1b71a4344943f222de6d05941",
  "campaign/playtest/sim-report-v1.md": "e5d19b227d79aab07ba544f3844f874854841d526a1f9de4cfc485559041ff19",
  "campaign/playtest/solo-kit-v1.md": "042dd0a33ae16af8f7ba8201a514988cc5233ecf243f49d157949c97c44aa435",
  "campaign/playtest/solo-report-v1.md": "988072a521426b499c694f96a9bc173c2223d3148951bc4145d62dd68b7035d1",
  "campaign/playtest/stage3-run-guide-v1.md": "c1ccd8a77d917e05f86f0604731344b22c8902c508858ef71a39ed9da3cce17f",
  "campaign/playtest/stage4-5-guide-v1.md": "895ed99909637322e232175d6bbd99ccf0c655306127e379e273c31389b1320f",
  "campaign/playtest/task0-handouts-v1.md": "56f1a9fba799f5c281162290c27b39db9bbbaa9d83cdaa83dd235506f3d68288",
  "campaign/playtest/task0-intel-pack-v1.md": "38908bcaa6155e5e916aa1e9f73c58289054e3a0f333a0f2114f3e239009acf0",
  "campaign/proposals/point-pools-v1.md": "044cfb266de167ed2d29b5b200efbffea2c39dc8935a8d427927e45827dc524d",
  "campaign/proposals/premades-v1.md": "26957ead0809e953e2eabdfcffc09101f10cf35d0f324e65c804804c21f39172",
  "campaign/proposals/premades-v2.md": "051a5ce180f4dc3c9882c5da4d7f2b6b6d38427dfe4fe0bd108bd79b0b532757",
  "campaign/proposals/skill-list-v2.md": "dc8fe4b1f342965bcc7a04e3a8a6ac93d11abfe3f75d67e0cc0609c1db066455",
  "campaign/proposals/tasks-v1.md": "df4d6c7afe0a891ce29a21306ab810ad32cc0b54c8ccf3d7ff3281d43cac2a72",
  "campaign/rules/design-pillars.md": "01aa0cb98b8f8e13f812a6f498c9bcdf1cff08bde649fab14fd13fb2a8689279",
  "campaign/rules/logic-map-v1.md": "7ba536f1d235981b32a8a8f27c7429d6b53ead6daa4c0f3e82e465584a89f1b4",
  "campaign/rules/mechanics-fine-v1.md": "69c6effd923b18b8bbb83331489fbd8f7949197501ab897a92e9338fdb62c37a",
  "campaign/rules/mechanics-ledger.md": "677b85ad19162bab43fc9868d191252b71133960983db51593ae7d9fbcdae435",
  "campaign/rules/playtest-log.md": "e60814a9b6aa7db073d9a70ef2f1451d4cdba3534fd4ce1a3549ad7ac52464d9",
  "campaign/rules/playtest-plan-v1.md": "e396e0fb98024ae5741036dfbc6198f0888773303a32ad400820bcdc1e4c2b27",
  "campaign/rules/probability-targets.md": "bec76d0d7f61f0b72a85c4ce200a6c7a164838f847b33d8c1891a4a9d599085f",
  "campaign/rules/rules-changelog.md": "63fbf8573f60dcea6e26b9e0be4bf42d11e598c96e815d7b9e2330b02d33d906",
  "campaign/rules/system-notes.md": "bfbd6113fcf0ee7f8dcd966d26dd1d672206e31c2247c7e6d133e04ed52da629",
  "campaign/rules/terminology.md": "7b7fe8859a2bb3231352ec83f83d526ca9817213980223511167690adc11037f",
  "campaign/rules/vertical-slice-v0.md": "e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2",
  "campaign/session0-redlines.md": "d5d9246e07b2d4c9de9ce602835ec763ac33f5dd01a8b5e83c9b2318f9b6e630",
  "campaign/sessions/README.md": "efea7b0caacc297a110a715f32aa48d1b88ced7d8770361a02c0ff1c4973341a",
  "campaign/state/thread-index.md": "237eb1644e53e443df79f76d19e476f78fa87fed4ec59108bf64d033f05c7714",
  "campaign/state/timeline.md": "f504f540c26fba8038ee6793dbb3f4e7dd70894ffcb6946d0245185ec42e1dc0",
  "campaign/state/world-state.yaml": "15edea1d29943c1bfae901228100a3560b842e4d2e8e3ff9742515ec506b9105",
  "campaign/templates/faction-template.md": "15ca9057739ce769c85f1cf1c7bada43c82a5ead96f2603aad68cb56588f9ab1",
  "campaign/templates/location-template.md": "aad0dc352a33a262cbc0c7d92447b462c7fd3590c2ced0c576de6190e7ccf11f",
  "campaign/templates/mystery-template.md": "929c4d00a7d02240489361bd178c6e753f5c103324ce105ff9ecb321ea06ace4",
  "campaign/templates/npc-template.md": "9216b3f5aa82d6676e2e5116dd6597276e141cb58870f63c0bdabb694e368fd0",
  "campaign/templates/quest-template.md": "1a8d033060846897f962313d59ee92ec57c9a85b6d0d6936da25a3a7b6131f05",
  "campaign/templates/region-template.md": "aa4f9ae0d625499dd1bb91dfce1d733d9ad0f396360fbdecd920331e83b3b45a",
  "campaign/templates/session-run-guide-template.md": "6659b6b05ab8759c6ea678052085550b73ce5f63a06677f306f6ff9b667a4fe0",
  "campaign/templates/situation-template.md": "3a1bd54d6b3d728432c27a5ae7f33d03f2b0ac67505183777dd79c10894d8b6a",
  "campaign/validation/causal-audit-v1.md": "6ebb4d90e3680543eb6d9f14099b2e4cf224bbee2b5a2340ed6f466803a8c8ed",
  "campaign/validation/lead-audit-notes-v1.md": "d032887d692a94609f331fc2606b264339b5293665142f32d55b208a0236bf8e",
  "campaign/validation/rules-audit-v1.md": "6afe741ec6cd9e1350952dcebd4c84781d7278802a0b679b6e8953cbfdd022ce",
  "knowledge/styles/01-守则手册告示体.md": "73c62fcbee204371f7014580795496080b925ae01fa2f5b66b96adb6ea2ce2e0",
  "knowledge/styles/02-公文档案媒体体.md": "8aec8b498fbc86ae4f56162f723cb6fe9c02324d0547a43557d7296b08ff69dd",
  "knowledge/styles/03-叙事与私人文本体.md": "958fd7564be07e695c3f7b531ab36570aefa603eab9cab4723cac0beb81c7e9c",
  "knowledge/styles/04-海外英译系.md": "2e75826d7fae817364e5beca0990958e76f4b0bd1c42ed9157ad053b803ea205",
  "knowledge/styles/05-互文教义经典改写系.md": "5abc5abc9d724fd1af01c667111dcfc0e7c7303eceee5cae466ec79418f25e12",
  "knowledge/styles/06-元层戏仿双声道系.md": "ecbcc67030f0ee3a8a64aa3ca74b2d8fe8df358e6064dda90369ebcc80641859",
  "knowledge/无限流知识库.md": "c98291a298155644853b2a971abbb3be426a9602ec7d3f3f78fabab7d19608fe",
  "knowledge/规则怪谈案例库.md": "3d99a502caef0eba3659cd77f4f755559a482828ba37403f8e0dd9c7de5a01c7",
  "knowledge/规则怪谈知识库.md": "09f14386ea65fb0e4a0116d49f73b5174bbeb6c2989618d7040bbcfece95c2c0",
  "LICENSES/README.md": "dfed73ce1f790650de33bfcce25cbcdc141ff510c120403da0f7150c4665b159",
  "LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md": "2aab086afd0fc6a0d9455a56ae9052039b4af3d098e5fd2fc4cc22551972bc11",
};

const FROZEN_INVENTORY_ROOTS = ["aipt/p0-b000", "aipt/p0-b001", "aipt/p0-b002", "campaign", "knowledge", "LICENSES"];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function relFromRoot(abs) {
  return path.relative(ROOT, abs).split(path.sep).join("/");
}

function absFor(rel) {
  assertSafeRelativePath(rel, "repository path");
  const abs = path.resolve(ROOT, ...rel.split("/"));
  if (abs !== ROOT_REAL && !abs.startsWith(ROOT_REAL + path.sep)) {
    throw new Error(`repository path escapes root: ${JSON.stringify(rel)}`);
  }
  return abs;
}

function readBytes(rel) {
  const abs = absFor(rel);
  if (!existsSync(abs)) throw new Error(`missing file ${rel}`);
  const stat = lstatSync(abs);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`not a regular file: ${rel}`);
  const real = realpathSync(abs);
  if (real !== ROOT_REAL && !real.startsWith(ROOT_REAL + path.sep)) throw new Error(`realpath escape: ${rel}`);
  return readFileSync(abs);
}

function readText(rel) {
  return readBytes(rel).toString("utf8");
}

function loadJson(rel) {
  try {
    return JSON.parse(readText(rel));
  } catch (error) {
    throw new Error(`invalid JSON ${rel}: ${error.message}`);
  }
}

function deepClone(value) {
  return structuredClone(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertDeepEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} drifted: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertExactKeys(value, keys, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assertDeepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} keys`);
}

function assertUnique(values, label) {
  assert(new Set(values).size === values.length, `${label} must be unique`);
}

function assertSafeRelativePath(value, label) {
  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
  assert(!value.includes("\u0000"), `${label} contains NUL`);
  assert(!value.includes("\\"), `${label} contains backslash`);
  assert(!value.startsWith("/"), `${label} must be relative`);
  assert(!/^[A-Za-z]:/.test(value), `${label} must not be drive-absolute`);
  const parts = value.split("/");
  assert(parts.every((part) => part.length > 0 && part !== "." && part !== ".."), `${label} contains traversal or empty segments`);
}

function walkEntries(relRoot) {
  const root = absFor(relRoot);
  if (!existsSync(root)) return [];
  const out = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const abs = path.join(dir, entry.name);
      const rel = relFromRoot(abs);
      if (entry.isSymbolicLink()) out.push({ path: rel, kind: "symlink" });
      else if (entry.isDirectory()) visit(abs);
      else if (entry.isFile()) out.push({ path: rel, kind: "file" });
      else out.push({ path: rel, kind: "non-regular" });
    }
  };
  visit(root);
  return out;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function canonicalBytes(value) {
  return Buffer.from(JSON.stringify(canonicalize(value)), "utf8");
}

function checkHistoricalFreeze() {
  for (const [rel, digest] of Object.entries(FROZEN_DIGESTS)) {
    const actual = sha256(readBytes(rel));
    assert(actual === digest, `historical digest mismatch ${rel}: ${actual}`);
  }
  const actualInventory = FROZEN_INVENTORY_ROOTS.flatMap(walkEntries);
  const nonRegular = actualInventory.filter((entry) => entry.kind !== "file");
  assert(nonRegular.length === 0, `historical inventory contains non-regular entries: ${JSON.stringify(nonRegular)}`);
  const actualPaths = actualInventory.map((entry) => entry.path).sort();
  const expectedPaths = Object.keys(FROZEN_DIGESTS)
    .filter((rel) => FROZEN_INVENTORY_ROOTS.some((root) => rel === root || rel.startsWith(root + "/")))
    .sort();
  assertDeepEqual(actualPaths, expectedPaths, "historical B000/B001/B002 + campaign/knowledge/LICENSES inventory");
  assert(expectedPaths.filter((rel) => rel.startsWith("campaign/") || rel.startsWith("knowledge/") || rel.startsWith("LICENSES/")).length === 59, "frozen source inventory must contain exactly 59 files");
}

const EXPECTED_COMPATIBILITY = {
  aipt_schema: "aipt.game-compatibility.v1",
  batch_id: BATCH,
  game: {
    repo: "zyc14588/UNREGISTERED",
    previous_closed_commit: "7ae44d12b3637e49f0883049a09423dd4f385341",
    readiness: "PLAYTESTABLE_DRAFT",
  },
  aipt: {
    repo: "zyc14588/AIPT",
    current_read_only_commit: "e1e1a6315ef2308922105dd30fd4bbcf4e3f91c8",
    protocol_authority_commit: "fccfb595c23feab38397506505a3e996fe7b9e9c",
    protocol_authority_tree: "f99570bc3c4307244ca926cec62e82a07ef5aee8",
    schema_path: "schemas/protocol/v1/aipt-protocol.schema.json",
    raw_schema_sha256: "59467ffb27622b7858bd590b2b711a7affc9b5b0cb13e358504bd44eabe09dcf",
    protocol_version: "1.0.0",
    schema_version: "1.0.0",
    adapter_sdk: {
      package: "@aipt/adapter-sdk",
      version: "1.0.0",
      node: ">=24.19.0 <25",
      third_party_dependencies: 0,
    },
  },
  contract: {
    model: "AIPT_SCHEMA_PLUS_GAME_COMPAT_DECLARATION",
    actual_commit_pair_binding: "DEFERRED_TO_INTEGRATION_RUN_MANIFEST",
    integration_id: "INT-AIPT-UNREGISTERED-001",
    schema_copied: false,
    sdk_vendored: false,
  },
  lifecycle: {
    source_rules: "PROPOSAL",
    canonical: false,
  },
};

function checkCompatibilityObject(value) {
  assertDeepEqual(value, EXPECTED_COMPATIBILITY, "compatibility contract");
}

function checkCompatibility() {
  checkCompatibilityObject(loadJson(COMPATIBILITY_PATH));
  assert(sha256(readBytes(COMPATIBILITY_PATH)) === "cfe8f112a5bbff6a95286953f2d9cfd5629ed1fe1f58d0a578ae17ee87a52d06", "compatibility raw digest drifted");
}

const MUTANT_SPECS = [
  {
    id: "UNR-MUTATION-0001",
    kind: "HIDDEN_INFORMATION_LEAK",
    target: "aipt/p0-b001/visibility.json",
    preimage: "e232a2f95c6359cf54dd5f4147c72e0c3433614e00555226cd2993716f7bbb70",
    operation: {
      op: "replace",
      path: "/mappings/4/principals",
      value: ["GM", "CHARACTER:UNR-CHAR-0001", "CHARACTER:UNR-CHAR-0002"],
    },
    postimage: "bf97d429184ed4db100584115e395636884922afce6d7455264fa00bf95391a0",
    overlayHash: "2646980bbba810014f66c796fc5ac2f126ac77f397c6eb2e472115cb2ad5f46d",
    oracleHash: "d1c08236054dfc34fa57170b91828a3069408da088c9e91659d168ee342fbde9",
    detector: "AIPT_VISIBILITY_UNAUTHORIZED_FIELD",
    digestRules: {
      preimage_sha256: "SHA256_EXACT_FILE_BYTES",
      postimage_sha256: "SHA256_AIPT_CANONICAL_JSON_BYTES",
      canonical_json: {
        encoding: "UTF-8",
        object_keys: "RECURSIVELY_SORTED",
        array_order: "PRESERVED",
        whitespace: "NONE",
        trailing_newline: false,
      },
    },
  },
  {
    id: "UNR-MUTATION-0002",
    kind: "PROSE_MACHINE_DIVERGENCE",
    target: "aipt/p0-b002/machine-rules.json",
    preimage: "139d095fe54926e1599edf208b65f7a89061f1cda6d8b492f83b5e47c0693c78",
    operation: {
      op: "replace",
      path: "/rules/19/resolution/3/change/amount",
      value: -5,
    },
    postimage: "292f26f19c1f6a7b0d0c23c00a8fbb2858898cb80126fc4650235e68cd0b4af8",
    overlayHash: "a5e893bbdd844ba8ee050ff0364ef6c911c0c523c82aba874c5c395e8532bcf1",
    oracleHash: "fb17f531211a57f34159e508588d9bcea807230247ea8a479c4fa4d9bcda1b2d",
    detector: "UNREGISTERED_PROSE_MACHINE_DIVERGENCE",
    digestRules: {
      hash_algorithm: "sha256",
      encoding: "UTF-8",
      preimage_input: "EXACT_TARGET_FILE_BYTES",
      postimage_input: DIGEST_RULE,
      object_keys: "SORT_RECURSIVELY",
      array_order: "PRESERVE",
      whitespace: "NONE",
      postimage_trailing_newline: false,
    },
  },
  {
    id: "UNR-MUTATION-0003",
    kind: "STATE_REPLAY_INCONSISTENCY",
    target: `${CLEAN_ROOT}/replay-assertion.json`,
    preimage: "be692ae4bfb9646d7654ba6c364d22de20b7d1ec54a641b46d0b34dc6253b716",
    operation: {
      op: "replace",
      path: "/final_state_hash",
      value: "0".repeat(64),
    },
    postimage: "bed5274233363ce215894bca921d57fc57dd8f8434d9499ebc1f19d50ab1aac2",
    overlayHash: "a9fab32feff93792f61292fe76e509565297973567b606ba32963ac94ca89ecf",
    oracleHash: "42d90ce2642582fadd3e2fad94b3420dce6ecfffd630138b54402d3bc888025e",
    detector: "AIPT_REPLAY_HASH_MISMATCH",
    digestRules: {
      preimage_sha256: "SHA256_EXACT_FILE_BYTES",
      postimage_sha256: "SHA256_AIPT_CANONICAL_JSON_BYTES",
      canonical_json: {
        encoding: "UTF-8",
        object_keys: "RECURSIVELY_SORTED",
        array_order: "PRESERVED",
        whitespace: "NONE",
        trailing_newline: false,
      },
    },
  },
];

const ALLOWED_OVERLAY_TARGETS = new Set(MUTANT_SPECS.map((spec) => spec.target));
const FORBIDDEN_POINTER_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

function overlayPath(id, leaf) {
  return `${MUTANT_ROOT}/${id}/${leaf}.json`;
}

function decodePointer(pointer) {
  assert(typeof pointer === "string" && pointer.startsWith("/"), "overlay JSON Pointer must start with slash");
  assert(pointer.length > 1 && !pointer.includes("\u0000") && !pointer.includes("\\"), "overlay JSON Pointer contains an unsafe character");
  return pointer.slice(1).split("/").map((raw) => {
    assert(!/~(?:[^01]|$)/.test(raw), `overlay JSON Pointer has invalid escape: ${raw}`);
    const segment = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    assert(segment !== "." && segment !== ".." && !FORBIDDEN_POINTER_SEGMENTS.has(segment), `overlay JSON Pointer has forbidden segment: ${segment}`);
    return segment;
  });
}

function pointerLocation(document, pointer) {
  const segments = decodePointer(pointer);
  let current = document;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (Array.isArray(current)) {
      assert(/^(0|[1-9][0-9]*)$/.test(segment), `overlay JSON Pointer array index is invalid: ${segment}`);
      const index = Number(segment);
      assert(index < current.length, `overlay JSON Pointer array index is out of range: ${segment}`);
      current = current[index];
    } else {
      assert(current && typeof current === "object" && Object.hasOwn(current, segment), `overlay JSON Pointer path does not exist: ${pointer}`);
      current = current[segment];
    }
  }
  const key = segments.at(-1);
  if (Array.isArray(current)) {
    assert(/^(0|[1-9][0-9]*)$/.test(key), `overlay JSON Pointer terminal array index is invalid: ${key}`);
    const index = Number(key);
    assert(index < current.length, `overlay JSON Pointer terminal index is out of range: ${key}`);
    return { parent: current, key: index };
  }
  assert(current && typeof current === "object" && Object.hasOwn(current, key), `overlay JSON Pointer terminal path does not exist: ${pointer}`);
  return { parent: current, key };
}

function valueAtPointer(document, pointer) {
  const { parent, key } = pointerLocation(document, pointer);
  return parent[key];
}

function applyOverlay(overlay, options = {}) {
  assertExactKeys(overlay, ["aipt_schema", "mutant_id", "kind", "markers", "base_commit", "target", "operations", "postimage_sha256", "digest_rules"], "overlay");
  assert(overlay.aipt_schema === "aipt.noncanon-patch-overlay.v1", "overlay schema drifted");
  assertSafeRelativePath(overlay.target?.path, "overlay target");
  assert(ALLOWED_OVERLAY_TARGETS.has(overlay.target.path), `overlay target is outside the exact allowlist: ${overlay.target.path}`);
  assertExactKeys(overlay.target, ["path", "preimage_sha256"], "overlay target");
  assert(/^[0-9a-f]{64}$/.test(overlay.target.preimage_sha256), "overlay preimage digest is malformed");
  assert(Array.isArray(overlay.operations) && overlay.operations.length === 1, "overlay must contain exactly one semantic operation");
  const operation = overlay.operations[0];
  assertExactKeys(operation, ["op", "path", "value"], "overlay operation");
  assert(operation.op === "replace", "overlay operation must be replace");
  decodePointer(operation.path);
  const bytes = options.readTarget ? options.readTarget(overlay.target.path) : readBytes(overlay.target.path);
  assert(Buffer.isBuffer(bytes) || bytes instanceof Uint8Array, "overlay target reader must return bytes");
  const preimage = sha256(bytes);
  assert(preimage === overlay.target.preimage_sha256, `overlay preimage hash mismatch: ${preimage}`);
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch (error) {
    throw new Error(`overlay target is not JSON: ${error.message}`);
  }
  const clone = deepClone(parsed);
  const { parent, key } = pointerLocation(clone, operation.path);
  parent[key] = deepClone(operation.value);
  if (options.verifyPostimage !== false) {
    const postimage = sha256(canonicalBytes(clone));
    assert(postimage === overlay.postimage_sha256, `overlay postimage hash mismatch: ${postimage}`);
  }
  return clone;
}

function checkMutationIdMapObject(value) {
  assertExactKeys(value, ["aipt_schema", "batch_id", "decision_ref", "historical_authority", "allocation_order", "mutations", "lifecycle"], "mutation-id-map");
  assert(value.aipt_schema === "aipt.mutation-id-map.v1" && value.batch_id === BATCH && value.decision_ref === "R14-Q021", "mutation-id-map identity drifted");
  assertDeepEqual(value.historical_authority, {
    path: "aipt/p0-b002/rule-id-map.json",
    mutation_count: 0,
    remains_historical: true,
    byte_unchanged: true,
  }, "mutation-id-map historical authority");
  assertDeepEqual(value.allocation_order, MUTATION_IDS, "mutation allocation order");
  assert(Array.isArray(value.mutations) && value.mutations.length === 3, "mutation-id-map must contain exactly three mutations");
  assertDeepEqual(value.mutations, MUTANT_SPECS.map((spec) => ({
    mutation_id: spec.id,
    kind: spec.kind,
    fixture_class: "NON_CANON_TEST_FIXTURE",
    canonical: false,
    test_only: true,
  })), "mutation-id-map exact mutations");
  assertDeepEqual(value.lifecycle, { content_class: "NON_CANON_TEST_FIXTURE", promotes_source_lifecycle: false }, "mutation-id-map lifecycle");
}

function checkMutantManifestObject(value, options = {}) {
  assertExactKeys(value, ["aipt_schema", "batch_id", "markers", "adapter_foundation_checkpoint", "mutants"], "mutant manifest");
  assert(value.aipt_schema === "aipt.mutant-manifest.v1" && value.batch_id === BATCH, "mutant manifest identity drifted");
  assertDeepEqual(value.markers, ["NON_CANON", "TEST_FIXTURE", "MUTANT_MANIFEST"], "mutant manifest markers");
  assert(value.adapter_foundation_checkpoint === MUTANT_BASE, "mutant manifest base mismatch");
  assert(Array.isArray(value.mutants) && value.mutants.length === 3, "mutant manifest must contain exactly three mutants");
  assertDeepEqual(value.mutants.map((entry) => entry.mutation_id), MUTATION_IDS, "mutant manifest order");
  for (let i = 0; i < MUTANT_SPECS.length; i += 1) {
    const spec = MUTANT_SPECS[i];
    const entry = value.mutants[i];
    assertExactKeys(entry, ["mutation_id", "kind", "overlay", "oracle", "base_commit", "target_path", "expected_detector", "max_detection_runs", "false_positive_boundary_summary"], `mutant manifest entry ${i}`);
    assertDeepEqual(entry.overlay, { path: overlayPath(spec.id, "overlay"), sha256: spec.overlayHash }, `${spec.id} overlay ref`);
    assertDeepEqual(entry.oracle, { path: overlayPath(spec.id, "oracle"), sha256: spec.oracleHash }, `${spec.id} oracle ref`);
    assert(entry.mutation_id === spec.id && entry.kind === spec.kind && entry.base_commit === MUTANT_BASE, `${spec.id} identity/base drifted`);
    assert(entry.target_path === spec.target && entry.expected_detector === spec.detector && entry.max_detection_runs === 1, `${spec.id} target/detector/run limit drifted`);
    assert(typeof entry.false_positive_boundary_summary === "string" && entry.false_positive_boundary_summary.length > 20, `${spec.id} false-positive boundary missing`);
    if (options.verifyFiles !== false) {
      assert(sha256(readBytes(entry.overlay.path)) === entry.overlay.sha256, `${spec.id} overlay artifact hash mismatch`);
      assert(sha256(readBytes(entry.oracle.path)) === entry.oracle.sha256, `${spec.id} oracle artifact hash mismatch`);
    }
  }
}

function checkOverlayObject(overlay, spec, options = {}) {
  assert(overlay.mutant_id === spec.id && overlay.kind === spec.kind, `${spec.id} overlay identity drifted`);
  assertDeepEqual(overlay.markers, MARKERS, `${spec.id} overlay markers`);
  assert(overlay.base_commit === MUTANT_BASE, `${spec.id} overlay base mismatch`);
  assertDeepEqual(overlay.target, { path: spec.target, preimage_sha256: spec.preimage }, `${spec.id} overlay target`);
  assertDeepEqual(overlay.operations, [spec.operation], `${spec.id} overlay operation`);
  assert(overlay.postimage_sha256 === spec.postimage, `${spec.id} overlay postimage digest drifted`);
  assertDeepEqual(overlay.digest_rules, spec.digestRules, `${spec.id} overlay digest rules`);
  return applyOverlay(overlay, options);
}

function checkOracleObject(oracle, spec) {
  assertExactKeys(oracle, ["aipt_schema", "mutant_id", "kind", "markers", "base_commit", "expected_detector", "max_detection_runs", "minimal_evidence", "false_positive_boundary", "expected_detection_run"], `${spec.id} oracle`);
  assert(oracle.aipt_schema === "aipt.mutant-oracle.v1", `${spec.id} oracle schema drifted`);
  assert(oracle.mutant_id === spec.id && oracle.kind === spec.kind, `${spec.id} oracle identity drifted`);
  assertDeepEqual(oracle.markers, MARKERS, `${spec.id} oracle markers`);
  assert(oracle.base_commit === MUTANT_BASE, `${spec.id} oracle base mismatch`);
  assert(oracle.expected_detector === spec.detector, `${spec.id} oracle detector mismatch`);
  assert(oracle.max_detection_runs === 1 && oracle.expected_detection_run === 1, `${spec.id} oracle detection run must be exactly one`);
  assert(oracle.minimal_evidence && typeof oracle.minimal_evidence === "object", `${spec.id} minimal evidence missing`);
  assert(oracle.false_positive_boundary && typeof oracle.false_positive_boundary === "object", `${spec.id} false-positive boundary missing`);
  if (spec.id === MUTATION_IDS[0]) {
    assertDeepEqual(oracle.minimal_evidence.original_principals, ["GM", "CHARACTER:UNR-CHAR-0001"], "M1 original principals");
    assertDeepEqual(oracle.minimal_evidence.mutated_principals, spec.operation.value, "M1 mutated principals");
    assert(oracle.minimal_evidence.mapping_id === "premades-secret-0001" && oracle.minimal_evidence.field_or_entity_id === "UNR-SECRET-0001", "M1 evidence binding drifted");
    assertDeepEqual(oracle.false_positive_boundary, {
      clean_visibility_and_clean_projection: "MUST_NOT_TRIGGER",
      overlay_applied: "MUST_TRIGGER_EXPECTED_DETECTOR",
    }, "M1 false-positive boundary");
  } else if (spec.id === MUTATION_IDS[1]) {
    const evidence = oracle.minimal_evidence;
    assert(evidence.rule_id === "UNR-RULE-0020" && evidence.machine_target_path === spec.target && evidence.machine_json_pointer === spec.operation.path, "M2 prose target is ambiguous or wrong");
    assert(evidence.expected_prose_value === -10 && evidence.mutated_machine_value === -5, "M2 prose values drifted");
    assertDeepEqual(evidence.primary_prose_source, {
      path: "campaign/rules/mechanics-fine-v1.md",
      sha256: "69c6effd923b18b8bbb83331489fbd8f7949197501ab897a92e9338fdb62c37a",
      locator: "### A2 疲劳（Expedition 尺度）",
      locator_type: "MARKDOWN_HEADING",
      frozen_supporting_table_row: "| Pressure | 每满 2 点＝所有行动判定 **−10 状态减值**（与伤口叠加、不占修正上限） |",
    }, "M2 frozen prose source");
    assert(oracle.false_positive_boundary.clean_machine_value === -10 && oracle.false_positive_boundary.frozen_prose_value === -10 && oracle.false_positive_boundary.overlay_machine_value === -5, "M2 false-positive boundary values drifted");
  } else {
    const evidence = oracle.minimal_evidence;
    assert(evidence.clean_final_state_canonical_sha256 === "4c22dea6f59ca1c4d3c880e0443a758c65ec85d4a147b242afec9f8b534f5875", "M3 clean final-state hash drifted");
    assert(evidence.clean_replay_raw_sha256 === spec.preimage && evidence.original_final_state_hash === evidence.clean_final_state_canonical_sha256, "M3 clean replay binding drifted");
    assert(evidence.mutated_pointer === spec.operation.path && evidence.mutated_value === spec.operation.value, "M3 mutation evidence drifted");
    assert(oracle.false_positive_boundary.clean_result === "NO_DETECTION" && oracle.false_positive_boundary.overlay_result === "DETERMINISTIC_HASH_MISMATCH", "M3 false-positive boundary drifted");
  }
}

function loadMutationBundle() {
  return {
    idMap: loadJson(MUTATION_MAP_PATH),
    manifest: loadJson(MUTANT_MANIFEST_PATH),
    overlays: MUTANT_SPECS.map((spec) => loadJson(overlayPath(spec.id, "overlay"))),
    oracles: MUTANT_SPECS.map((spec) => loadJson(overlayPath(spec.id, "oracle"))),
  };
}

function checkMutationContracts(bundle = loadMutationBundle(), options = {}) {
  checkMutationIdMapObject(bundle.idMap);
  checkMutantManifestObject(bundle.manifest, options);
  const applied = [];
  for (let i = 0; i < MUTANT_SPECS.length; i += 1) {
    applied.push(checkOverlayObject(bundle.overlays[i], MUTANT_SPECS[i], options));
    checkOracleObject(bundle.oracles[i], MUTANT_SPECS[i]);
  }
  return applied;
}

const CLEAN_ASSET_DIGESTS = {
  "action-intent.json": "6c1de67bdd4e408c68b72a5a358debbc13a4c8b3b016a50367a2efc53d2f43cd",
  "event.json": "e93542b0abfff511ba3274dd7c308628a2a692fb40f84349c6afb02f52a5aef5",
  "final-state.json": "fde86125510dc2505ea84e5b606c4076e65050c436c1bcd3d9e0602b6df98980",
  "projection-seat-01.json": "8869026afa22a3194f5765b56004eb1a89b5ac60c53551091ace1fa8d1b38b81",
  "projection-seat-02.json": "e5c9a45a221d47bf32434fd8c0751b8102cfb2acf51caa6e5bbeeff496251970",
  "projection-seat-03.json": "fde9ad4695208becba67c2de853cfab894cb89e916f7625ef52f3d95941640e3",
  "projection-seat-04.json": "6b53b52a22a04d8f6e58904a136add7f4af32a38d4259e788c0a204b638ce6c4",
  "replay-assertion.json": "be692ae4bfb9646d7654ba6c364d22de20b7d1ec54a641b46d0b34dc6253b716",
  "seats.json": "5e3f9c1ebc6ebc7c32f43eca558a941d6af544b5071ac628a477cb17a28ac9e3",
  "state.json": "7455a4d286c71e4096c34ac69fc2540b21756c159b8d093bdeb7611e712cd6a8",
  "transition.json": "c738b49e07954c243ae4cfdfec75434b1a3ce9c650f489a17237f6a4d965a058",
};

const CLEAN_INVENTORY = ["manifest.json", ...Object.keys(CLEAN_ASSET_DIGESTS)].sort();
const CHARACTER_SEAT_MAPPING = CHARACTER_IDS.map((character_id, i) => ({ character_id, seat_id: SEAT_IDS[i] }));

function assertProtocolEnvelope(value, fixtureId, label) {
  assert(value.protocol_version === "1.0.0" && value.schema_version === "1.0.0", `${label} protocol/schema version drifted`);
  assert(value.fixture_id === fixtureId, `${label} fixture_id drifted`);
}

function shapeSignature(value) {
  if (Array.isArray(value)) return ["array", value.map(shapeSignature)];
  if (value && typeof value === "object") {
    return ["object", Object.keys(value).sort().map((key) => [key, shapeSignature(value[key])])];
  }
  return typeof value;
}

function hiddenLeakDetectors(visibility, projections) {
  const detector = MUTANT_SPECS[0].detector;
  const mapping = visibility.mappings?.find((entry) => entry.id === "premades-secret-0001");
  assert(mapping, "clean visibility owner mapping missing");
  const authorized = new Set(["GM", "CHARACTER:UNR-CHAR-0001"]);
  const mappingLeak = mapping.principals.some((principal) => !authorized.has(principal));
  const projectionLeak = projections.some((projection) =>
    projection.seat_id !== "seat-01" && projection.fields.some((field) => field.field_id === "owner-only-fixture-flag"),
  );
  return mappingLeak || projectionLeak ? [detector] : [];
}

function checkFrozenProseEvidence(oracle) {
  const evidence = oracle.minimal_evidence;
  assert(evidence.rule_id === "UNR-RULE-0020", "prose target is ambiguous or wrong rule");
  assert(evidence.machine_target_path === MUTANT_SPECS[1].target && evidence.machine_json_pointer === MUTANT_SPECS[1].operation.path, "prose target is ambiguous or wrong pointer");
  assert(evidence.expected_prose_value === -10 && evidence.mutated_machine_value === -5, "prose target values drifted");
  const source = evidence.primary_prose_source;
  assert(source.path === "campaign/rules/mechanics-fine-v1.md" && source.sha256 === FROZEN_DIGESTS[source.path], "prose source binding drifted");
  const text = readText(source.path);
  assert(text.split(source.locator).length - 1 === 1, "prose source locator must be unique");
  assert(text.includes(source.frozen_supporting_table_row) && source.frozen_supporting_table_row.includes("−10"), "frozen prose does not prove the unique -10 value");
}

function proseDivergenceDetectors(machineRules, oracle) {
  checkFrozenProseEvidence(oracle);
  const evidence = oracle.minimal_evidence;
  const rule = machineRules.rules?.[19];
  assert(rule?.rule_id === evidence.rule_id, "prose target is ambiguous or wrong rule index");
  const machineValue = valueAtPointer(machineRules, evidence.machine_json_pointer);
  return machineValue === evidence.expected_prose_value ? [] : [MUTANT_SPECS[1].detector];
}

function replayMismatchDetectors(replay, finalState, cleanReplay) {
  assertDeepEqual(shapeSignature(replay), shapeSignature(cleanReplay), "replay schema shape");
  const finalHash = sha256(canonicalBytes(finalState));
  const hashes = [replay.final_state_hash, ...(replay.replays || []).map((entry) => entry.final_state_hash)];
  return hashes.some((hash) => hash !== finalHash) ? [MUTANT_SPECS[2].detector] : [];
}

function assertExactDetector(actual, expected, label) {
  assertDeepEqual(actual, expected ? [expected] : [], `${label} detector result`);
}

function checkCleanFixture() {
  const inventory = walkEntries(CLEAN_ROOT);
  assert(inventory.every((entry) => entry.kind === "file"), "clean fixture contains a symlink or non-regular entry");
  assertDeepEqual(inventory.map((entry) => path.posix.basename(entry.path)).sort(), CLEAN_INVENTORY, "clean fixture exact 12-file inventory");

  const manifest = loadJson(`${CLEAN_ROOT}/manifest.json`);
  assert(sha256(readBytes(`${CLEAN_ROOT}/manifest.json`)) === "e52d53541afd15b86dcf79e1e89baa74b8f2c494e342bc02ee8863b0e9ce8faa", "clean manifest digest drifted");
  assertExactKeys(manifest, ["aipt_schema", "batch_id", "fixture_id", "markers", "compatibility_ref", "scenario", "character_seat_mapping", "persona_binding", "visibility_probe", "asset_digest_rule", "assets", "expected_final_state", "replay_assertion", "execution", "lifecycle"], "clean manifest");
  assert(manifest.aipt_schema === "aipt.game-clean-fixture-manifest.v1" && manifest.batch_id === BATCH, "clean manifest identity drifted");
  assertDeepEqual(manifest.markers, ["NON_CANON", "TEST_FIXTURE", "CLEAN_BASELINE"], "clean manifest markers");
  assertDeepEqual(manifest.compatibility_ref, { path: COMPATIBILITY_PATH, sha256: "cfe8f112a5bbff6a95286953f2d9cfd5629ed1fe1f58d0a578ae17ee87a52d06" }, "clean compatibility ref");
  assert(manifest.scenario.scope === "FIRST_ROSTER_TASK0" && manifest.scenario.scene_id === "UNR-SCENE-T000-02" && manifest.scenario.action === "task0-electronic-recon-success" && manifest.scenario.rule_id === "UNR-RULE-0034", "clean scenario identity drifted");
  assert(manifest.scenario.source.path === "campaign/playtest/stage3-run-guide-v1.md" && manifest.scenario.source.sha256 === FROZEN_DIGESTS[manifest.scenario.source.path], "clean scenario source drifted");
  assert(readText(manifest.scenario.source.path).split(manifest.scenario.source.locator).length - 1 === 1, "clean scenario locator must be unique");
  assert(manifest.scenario.machine_authority.path === MUTANT_SPECS[1].target && manifest.scenario.machine_authority.sha256 === FROZEN_DIGESTS[MUTANT_SPECS[1].target], "clean machine authority drifted");
  assertDeepEqual(manifest.character_seat_mapping, CHARACTER_SEAT_MAPPING, "clean character-seat mapping");
  assertDeepEqual(manifest.persona_binding, { model: "PERSONA_SEPARATE_FROM_CHARACTER", concrete_persona_profiles: "DEFERRED_TO_AIPT_RUN_MANIFEST" }, "clean persona deferral");
  assertDeepEqual(manifest.visibility_probe, {
    field_id: "owner-only-fixture-flag",
    synthetic_value_only: true,
    real_secret_content_included: false,
    authorized_seat_ids: ["seat-01"],
    authority: {
      path: "aipt/p0-b001/visibility.json",
      sha256: FROZEN_DIGESTS["aipt/p0-b001/visibility.json"],
      mapping_id: "premades-secret-0001",
      locator: "mappings[id=premades-secret-0001]",
      locator_type: "JSON_PREDICATE",
    },
  }, "clean synthetic visibility probe");
  assert(manifest.asset_digest_rule === "SHA256_FILE_BYTES_UTF8", "clean asset digest rule drifted");
  assert(Array.isArray(manifest.assets) && manifest.assets.length === 11, "clean manifest must list exactly 11 assets");
  assertDeepEqual(manifest.assets.map((asset) => asset.path), Object.keys(CLEAN_ASSET_DIGESTS), "clean asset order");
  for (const asset of manifest.assets) {
    assertExactKeys(asset, ["path", "kind", "schema_ref", "sha256"], `clean asset ${asset.path}`);
    assertSafeRelativePath(asset.path, "clean asset path");
    assert(!asset.path.includes("/"), `clean asset must be local to fixture root: ${asset.path}`);
    assert(asset.sha256 === CLEAN_ASSET_DIGESTS[asset.path], `clean accepted asset hash drifted: ${asset.path}`);
    assert(sha256(readBytes(`${CLEAN_ROOT}/${asset.path}`)) === asset.sha256, `clean asset bytes drifted: ${asset.path}`);
  }
  assertDeepEqual(manifest.execution, { deterministic: true, timestamp_or_randomness: false, model_call: false, network: false }, "clean deterministic execution declaration");
  assertDeepEqual(manifest.lifecycle, { canonical: false, test_only: true, source_rules: "PROPOSAL" }, "clean lifecycle");

  const assets = Object.fromEntries(Object.keys(CLEAN_ASSET_DIGESTS).map((name) => [name, loadJson(`${CLEAN_ROOT}/${name}`)]));
  const fixtureId = manifest.fixture_id;
  for (const [name, value] of Object.entries(assets)) assertProtocolEnvelope(value, fixtureId, name);
  const seats = assets["seats.json"];
  assertDeepEqual(seats.seats, SEAT_IDS.map((seat_id, i) => ({ seat_id, name: ["游隼", "短波", "静水", "底片"][i] })), "clean seats");
  const state = assets["state.json"];
  const action = assets["action-intent.json"];
  const transition = assets["transition.json"];
  const event = assets["event.json"];
  const finalState = assets["final-state.json"];
  const replay = assets["replay-assertion.json"];
  const projections = SEAT_IDS.map((_, i) => assets[`projection-seat-0${i + 1}.json`]);

  assert(state.state_id === transition.from_state_id && finalState.state_id === transition.to_state_id, "clean state/transition IDs are incoherent");
  assert(action.params.action === transition.applied_action.action && action.params.seat_id === transition.applied_action.seat_id, "clean action/transition link is incoherent");
  assert(action.params.proposal.scene_id === manifest.scenario.scene_id && action.params.proposal.rule_id === manifest.scenario.rule_id, "clean action authority binding drifted");
  assert(event.transition_id === transition.transition_id && event.payload.from_state_id === state.state_id && event.payload.to_state_id === finalState.state_id, "clean event/transition link is incoherent");
  assertDeepEqual(transition.result, finalState.fields, "clean transition result/final state");
  const initialClock = state.fields.find((field) => field.field_id === "mission-clock-minutes");
  const finalClock = finalState.fields.find((field) => field.field_id === "mission-clock-minutes");
  assert(initialClock?.value === 0 && finalClock?.value === action.params.proposal.time_cost_minutes && finalClock.value === 30, "clean mission clock transition is incoherent");

  for (let i = 0; i < projections.length; i += 1) {
    const projection = projections[i];
    assert(projection.seat_id === SEAT_IDS[i] && projection.projection_id === `task0-before-recon-${SEAT_IDS[i]}`, `clean projection identity drifted: ${SEAT_IDS[i]}`);
    const expectedFields = state.fields.filter((field) => field.visibility.label === "PUBLIC" || field.visibility.authorized_seat_ids.includes(projection.seat_id));
    assertDeepEqual(projection.fields, expectedFields, `clean projection fields ${projection.seat_id}`);
  }
  assertExactDetector(hiddenLeakDetectors(loadJson("aipt/p0-b001/visibility.json"), projections), null, "clean visibility");

  const canonicalFinalHash = sha256(canonicalBytes(finalState));
  assert(canonicalFinalHash === "4c22dea6f59ca1c4d3c880e0443a758c65ec85d4a147b242afec9f8b534f5875", "clean canonical final-state hash drifted");
  assertDeepEqual(manifest.expected_final_state, { path: "final-state.json", canonical_sha256: canonicalFinalHash }, "clean expected final state");
  assert(manifest.replay_assertion === "replay-assertion.json" && replay.hash_algorithm === "sha256" && replay.canonical_json_rule === DIGEST_RULE && replay.final_state_ref === "final-state.json", "clean replay assertion contract drifted");
  assert(replay.replays.length === 2 && new Set(replay.replays.map((entry) => entry.replay_id)).size === 2, "clean replay records must be two distinct runs");
  assertExactDetector(replayMismatchDetectors(replay, finalState, replay), null, "clean replay");
  assertExactDetector(proseDivergenceDetectors(loadJson(MUTANT_SPECS[1].target), loadJson(overlayPath(MUTATION_IDS[1], "oracle"))), null, "clean prose-machine");

  const nondeterministicKeys = new Set(["timestamp", "random", "randomness", "seed", "model_request", "network_request"]);
  const inspect = (value, label) => {
    if (Array.isArray(value)) return value.forEach((item, i) => inspect(item, `${label}[${i}]`));
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert(!nondeterministicKeys.has(key.toLowerCase()), `${label} contains nondeterministic field ${key}`);
      inspect(child, `${label}.${key}`);
    }
  };
  for (const [name, value] of Object.entries(assets)) inspect(value, name);
  return { manifest, assets, projections, state, finalState, replay };
}

function checkMutantDetectors(clean, bundle, applied) {
  assertExactDetector(hiddenLeakDetectors(loadJson("aipt/p0-b001/visibility.json"), clean.projections), null, "clean hidden baseline");
  assertExactDetector(hiddenLeakDetectors(applied[0], clean.projections), bundle.oracles[0].expected_detector, "M1 overlay");

  assertExactDetector(proseDivergenceDetectors(loadJson(MUTANT_SPECS[1].target), bundle.oracles[1]), null, "clean prose baseline");
  assertExactDetector(proseDivergenceDetectors(applied[1], bundle.oracles[1]), bundle.oracles[1].expected_detector, "M2 overlay");

  assertDeepEqual(shapeSignature(applied[2]), shapeSignature(clean.replay), "M3 replay shape preservation");
  assertExactDetector(replayMismatchDetectors(clean.replay, clean.finalState, clean.replay), null, "clean replay baseline");
  assertExactDetector(replayMismatchDetectors(applied[2], clean.finalState, clean.replay), bundle.oracles[2].expected_detector, "M3 overlay");
}

function* jsonStrings(value) {
  if (typeof value === "string") {
    yield value;
  } else if (Array.isArray(value)) {
    for (const item of value) yield* jsonStrings(item);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) yield* jsonStrings(item);
  }
}

function checkSourceAnchor(source, label) {
  assertExactKeys(source, ["path", "sha256", "locator", "locator_type"], `${label} source`);
  assertSafeRelativePath(source.path, `${label} source path`);
  assert(source.sha256 === FROZEN_DIGESTS[source.path], `${label} source is not in the frozen digest set`);
  const bytes = readBytes(source.path);
  assert(sha256(bytes) === source.sha256, `${label} source digest mismatch`);
  const type = source.locator_type;
  if (type === "whole_file") {
    assert(source.locator === null, `${label} whole-file locator must be null`);
  } else if (type === "JSON_POINTER") {
    assert(typeof source.locator === "string", `${label} JSON Pointer locator missing`);
    valueAtPointer(JSON.parse(bytes.toString("utf8")), source.locator);
  } else if (type === "json_path") {
    assert(typeof source.locator === "string" && source.locator.length > 0, `${label} json_path locator missing`);
    let current = JSON.parse(bytes.toString("utf8"));
    for (const segment of source.locator.split(".")) {
      assert(current && typeof current === "object" && Object.hasOwn(current, segment), `${label} json_path locator does not resolve`);
      current = current[segment];
    }
  } else if (type === "markdown_preamble") {
    assert(source.locator && Number.isInteger(source.locator.start_line) && Number.isInteger(source.locator.end_line), `${label} preamble locator malformed`);
    const lineCount = bytes.toString("utf8").split(/\r?\n/).length;
    assert(source.locator.start_line === 1 && source.locator.end_line >= 1 && source.locator.end_line <= lineCount, `${label} preamble locator is out of range`);
  } else {
    assert(typeof source.locator === "string" && source.locator.length > 0, `${label} text locator missing`);
    assert(bytes.toString("utf8").split(source.locator).length - 1 === 1, `${label} text locator must occur exactly once`);
  }
}

function mappingById(shard, id) {
  const mapping = shard.mappings.find((entry) => entry.mapping_id === id);
  assert(mapping, `human-guide mapping missing: ${id}`);
  return mapping;
}

function assertMappingShape(shard, label) {
  assert(Array.isArray(shard.mappings) && shard.mappings.length > 0, `${label} mappings missing`);
  assertUnique(shard.mappings.map((mapping) => mapping.mapping_id), `${label} mapping IDs`);
  for (const mapping of shard.mappings) {
    assertExactKeys(mapping, ["mapping_id", "source", "machine_events", "metrics", "gates", "classification", "notes"], `${label}.${mapping.mapping_id}`);
    assert(typeof mapping.mapping_id === "string" && mapping.mapping_id.length > 0, `${label} mapping_id missing`);
    assert(Array.isArray(mapping.machine_events) && Array.isArray(mapping.metrics) && Array.isArray(mapping.gates), `${label}.${mapping.mapping_id} event/metric/gate arrays required`);
    assert(typeof mapping.classification === "string" && typeof mapping.notes === "string", `${label}.${mapping.mapping_id} classification/notes required`);
    checkSourceAnchor(mapping.source, `${label}.${mapping.mapping_id}`);
  }
}

const EXPECTED_HUMAN_MAP = {
  aipt_schema: "aipt.human-guide-map.v1",
  batch_id: BATCH,
  aggregation: {
    mode: "REFERENCE_ONLY",
    source_interpretation_added: false,
  },
  shards: [
    {
      role: "CORE_TABLE_FLOW",
      path: CORE_MAP_PATH,
      sha256: "5d06362f1993502f0f2f7b6488f65196a3a9a31256b46328846078b9f1935635",
    },
    {
      role: "SAFETY_OBSERVER",
      path: SAFETY_MAP_PATH,
      sha256: "e280c39c6b28241e9a66cb50354b4e307a5241699279a6038ba65ee7d3933e0d",
    },
  ],
};

const CORE_MAPPING_IDS = ["Q003", "Q004", "Q005", "Q007", "Q016", "Q017", "Q018", "Q019", "Q020"].map((id) => `UNR-HGM-CORE-R14-${id}`);
const SAFETY_MAPPING_IDS = [
  "R14-Q006-SAFETY-PROTOCOL-CONFORMANCE",
  "R14-Q007-SIMULATED-SUBJECTIVE-REPORT",
  "R14-Q008-SAFETY-STOP-TRIGGER-MODES",
  "R14-Q008-HUMAN-CANCEL-TERMINATION",
  "R14-Q015-VERIFIED-SAFETY-PROFILE",
  "R14-Q015-SESSION0-SEPARATE-CASE",
  "R14-SAFETY-EVIDENCE-DATA-MINIMIZATION",
  "R14-VISIBILITY-FAIL-CLOSED-EVIDENCE",
  "R14-OBSERVER-LOOKUP-EVIDENCE",
  "R14-OBSERVER-GM-SCREEN-REFERENCE",
  "R14-RULE-KNOWLEDGE-INJECTION-SCOPE",
  "R14-COGNITIVE-POLLUTION-SAFETY-BOUNDARY",
];

function checkCoreGuide(core) {
  assertExactKeys(core, ["aipt_schema", "batch_id", "shard_id", "scope", "lifecycle_status", "canonical", "source_inputs", "mappings"], "core human-guide shard");
  assert(core.aipt_schema === "aipt.human-guide-map-shard.v1" && core.batch_id === BATCH && core.shard_id === "UNR-HUMAN-GUIDE-CORE" && core.scope === "CORE_TABLE_FLOW", "core human-guide identity/scope drifted");
  assert(core.lifecycle_status === "PROPOSAL" && core.canonical === false, "core human-guide lifecycle drifted");
  assertDeepEqual(core.source_inputs, [
    { path: "campaign/playtest/prototype-table-test-guide-v1.md", sha256: FROZEN_DIGESTS["campaign/playtest/prototype-table-test-guide-v1.md"] },
    { path: "campaign/playtest/stage3-run-guide-v1.md", sha256: FROZEN_DIGESTS["campaign/playtest/stage3-run-guide-v1.md"] },
    { path: "campaign/playtest/observation-sheet-v1.md", sha256: FROZEN_DIGESTS["campaign/playtest/observation-sheet-v1.md"] },
    { path: "aipt/p0-b002/semantic-graph.json", sha256: FROZEN_DIGESTS["aipt/p0-b002/semantic-graph.json"] },
  ], "core human-guide source inputs");
  assertMappingShape(core, "core human-guide");
  assertDeepEqual(core.mappings.map((mapping) => mapping.mapping_id), CORE_MAPPING_IDS, "core mapping order");

  const q003 = mappingById(core, CORE_MAPPING_IDS[0]);
  const domains = q003.machine_events.map((event) => event.timing_domain);
  assertDeepEqual(domains, ["WALL_CLOCK", "MODEL_LATENCY", "SIMULATED_TABLE_TIME", "GAME_TIME"], "four distinct timing domains");
  assertUnique(domains, "timing domains");
  assertDeepEqual(q003.metrics.map((metric) => metric.timing_domain), domains, "timing metrics/domain mapping");

  const q004 = mappingById(core, CORE_MAPPING_IDS[1]);
  const planningMetrics = ["valid_plan_exchange_count", "alternative_count", "tradeoff_count", "contributing_seat_count", "evacuation_plan_present"];
  assertDeepEqual(q004.metrics.map((metric) => metric.metric_id), planningMetrics, "planning metrics");
  assertDeepEqual(q004.gates[0]?.inputs, planningMetrics, "planning gate inputs");

  const q005 = mappingById(core, CORE_MAPPING_IDS[2]);
  assertDeepEqual(q005.machine_events.map((event) => event.measurement_kind), ["SYSTEM_LATENCY", "RESOLUTION_COMPLEXITY"], "latency/complexity event separation");
  assertDeepEqual(q005.metrics.map((metric) => metric.measurement_kind), ["SYSTEM_LATENCY", "RESOLUTION_COMPLEXITY"], "latency/complexity metric separation");
  assert(q005.metrics[0].metric_id !== q005.metrics[1].metric_id, "SYSTEM_LATENCY must differ from RESOLUTION_COMPLEXITY");

  const q007 = mappingById(core, CORE_MAPPING_IDS[3]);
  assert(q007.classification === "SIMULATED_SUBJECTIVE_REPORT", "agent fun/bored classification drifted");
  assertDeepEqual(q007.machine_events[0]?.report_subject_enum, ["FUN", "BOREDOM"], "agent subjective report enum");
  assert(q007.machine_events[0]?.reporter_type === "AGENT" && q007.machine_events[0]?.evidence_class === "SIMULATED_SUBJECTIVE_REPORT", "agent subjective event drifted");
  assert(q007.metrics.every((metric) => metric.diagnostic_only === true), "agent subjective metric must remain diagnostic-only");
  assert(q007.gates.length === 1 && q007.gates[0].gate_id === "OBJECTIVE_HARD_GATE" && q007.gates[0].eligible === false, "subjective report was promoted to an objective hard gate");

  const q016 = mappingById(core, CORE_MAPPING_IDS[4]);
  const catalog = q016.machine_events.find((event) => event.event_type === "SCENE_CATALOG_DECLARED");
  assertDeepEqual(catalog?.scene_node_ids, ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"], "eight representable scenes");
  assert(q016.machine_events.some((event) => event.event_type === "SCENE_NODE_ENTERED" && event.counted_when === "NATURAL_RUN_ENTRY"), "scene count must use natural entry only");
  assert(q016.machine_events.some((event) => event.event_type === "SCENE_NODE_SKIPPED" && event.counts_as_entered === false), "skipped scene must not count as entered");
  assert(q016.metrics.some((metric) => metric.metric_id === "representable_scene_count" && metric.expected_value === 8), "representable scene metric drifted");

  const terminationReasons = ["ending", "deadline", "evacuation", "no_progress", "budget", "integrity_failure", "human_cancel"];
  const q017 = mappingById(core, CORE_MAPPING_IDS[5]);
  assertDeepEqual(q017.machine_events[0]?.termination_reason_enum, terminationReasons, "termination reason enum");
  assertDeepEqual(q017.metrics[0]?.allowed_values, terminationReasons, "termination reason metric enum");

  const q018 = mappingById(core, CORE_MAPPING_IDS[6]);
  assert(q018.machine_events[0]?.evidence_status === "NARRATIVE_DEGRADED" && q018.machine_events[0]?.diagnostic_evidence_retained === true, "degraded evidence classification drifted");
  assert(q018.metrics.some((metric) => metric.metric_id === "game_gate_eligible" && metric.expected_value === false), "degraded evidence must not qualify Game Gate");
  assert(q018.gates.some((gate) => gate.gate_id === "GAME_GATE" && gate.result === "DISQUALIFIED" && gate.preserve_diagnostic_evidence === true), "degraded evidence Game Gate boundary drifted");

  const q019 = mappingById(core, CORE_MAPPING_IDS[7]);
  assert(q019.machine_events[0]?.source_lifecycle_status === "PROPOSAL" && q019.machine_events[0]?.execution_profile === "PLAYTESTABLE_DRAFT" && q019.machine_events[0]?.canonical === false, "draft lifecycle mapping drifted");
  assert(q019.metrics.some((metric) => metric.metric_id === "release_evidence_eligible" && metric.expected_value === false), "draft run must not qualify release evidence");
  assert(q019.gates[0]?.result === "DISQUALIFIED", "draft release gate must disqualify");

  const q020 = mappingById(core, CORE_MAPPING_IDS[8]);
  const thresholdEvent = q020.machine_events.find((event) => event.event_type === "AMBIGUITY_THRESHOLD_REACHED");
  const ambiguityGate = q020.gates.find((gate) => gate.gate_id === "TASK0_UNRESOLVED_AMBIGUITY_GATE");
  assert(thresholdEvent?.task_id === "Task0" && thresholdEvent.threshold === 2, "Task0 ambiguity threshold drifted");
  assert(ambiguityGate?.threshold === 2 && ambiguityGate.configuration_layer === "UNREGISTERED_GAME_MAPPING" && ambiguityGate.aipt_core_parameter === false, "Task0 ambiguity gate must be game-mapping configuration with threshold 2");
}

function checkSafetyGuide(safety) {
  assertExactKeys(safety, ["aipt_schema", "batch_id", "shard_id", "base_commit", "source_digest_rule", "mappings"], "safety human-guide shard");
  assert(safety.aipt_schema === "aipt.human-guide-map-shard.v1" && safety.batch_id === BATCH && safety.shard_id === "SAFETY_OBSERVER", "safety human-guide identity drifted");
  assert(safety.base_commit === SAFETY_SHARD_BASE && safety.source_digest_rule === "SHA256_EXACT_FILE_BYTES", "safety human-guide base/digest rule drifted");
  assertMappingShape(safety, "safety human-guide");
  assertDeepEqual(safety.mappings.map((mapping) => mapping.mapping_id), SAFETY_MAPPING_IDS, "safety mapping order");
  const psychologicalClaim = [...jsonStrings(safety)].some((text) => /PSYCHOLOGICAL[_ -]?SAFETY[_ -]?PASS|PSYCHOLOGICAL[_ -]?PASS|MENTAL[_ -]?STATE[_ -]?PASS/i.test(text));
  assert(!psychologicalClaim, "human map claims psychological-safety pass");

  const q006 = mappingById(safety, SAFETY_MAPPING_IDS[0]);
  assert(q006.classification === "SAFETY_PROTOCOL_CONFORMANCE" && q006.gates.length === 1 && q006.gates[0].proof_scope === "SAFETY_PROTOCOL_CONFORMANCE", "safety gate must prove only SAFETY_PROTOCOL_CONFORMANCE");

  const q007 = mappingById(safety, SAFETY_MAPPING_IDS[1]);
  assert(q007.classification === "SIMULATED_SUBJECTIVE_REPORT" && q007.machine_events[0]?.producer === "SIMULATED_AGENT", "safety subjective report classification drifted");
  assert(q007.machine_events[0]?.objective_truth_value === false && q007.metrics.every((metric) => metric.objective_gate === false) && q007.gates.length === 0, "subjective report was promoted to hard gate");

  const q008 = mappingById(safety, SAFETY_MAPPING_IDS[2]);
  assertDeepEqual(q008.machine_events[0]?.trigger_modes, ["AGENT_TRIGGERED", "DETERMINISTIC_INJECTION"], "dual safety trigger modes");
  assertDeepEqual(q008.metrics[0]?.required_values, ["AGENT_TRIGGERED", "DETERMINISTIC_INJECTION"], "dual safety trigger coverage");
  assert(q008.machine_events[0]?.explanation_required === false && Array.isArray(q008.machine_events[0]?.payload_fields) && q008.machine_events[0].payload_fields.length === 0, "safety stop must not require or carry explanation payload");

  const verified = mappingById(safety, SAFETY_MAPPING_IDS[4]);
  const session0 = mappingById(safety, SAFETY_MAPPING_IDS[5]);
  assertDeepEqual(verified.machine_events[0]?.required_binding, {
    path: "aipt/p0-b001/safety-profile.json",
    sha256: FROZEN_DIGESTS["aipt/p0-b001/safety-profile.json"],
    aipt_schema: "aipt.safety-profile.v1",
  }, "verified SafetyProfile binding");
  assert(verified.metrics[0]?.required_value === 1 && verified.gates[0]?.type === "HARD_FAIL_CLOSED", "verified SafetyProfile fail-closed gate drifted");
  assert(session0.machine_events[0]?.case_id === "SESSION0_PROTOCOL_CONFORMANCE" && session0.machine_events[0]?.source_path === "campaign/session0-redlines.md", "Session0 separate case drifted");
  assert(verified.mapping_id !== session0.mapping_id && verified.machine_events[0].event_id !== session0.machine_events[0].event_id, "SafetyProfile verification and Session0 case must remain separate");
}

function checkHumanGuideData(central, core, safety) {
  assertDeepEqual(central, EXPECTED_HUMAN_MAP, "central human-guide reference-only map");
  assert(!Object.hasOwn(central, "mappings") && central.aggregation.mode === "REFERENCE_ONLY" && central.aggregation.source_interpretation_added === false, "central human-guide map must remain reference-only");
  checkCoreGuide(core);
  checkSafetyGuide(safety);
}

function checkHumanGuide() {
  const central = loadJson(HUMAN_MAP_PATH);
  const core = loadJson(CORE_MAP_PATH);
  const safety = loadJson(SAFETY_MAP_PATH);
  assert(sha256(readBytes(CORE_MAP_PATH)) === EXPECTED_HUMAN_MAP.shards[0].sha256, "core human-guide shard hash mismatch");
  assert(sha256(readBytes(SAFETY_MAP_PATH)) === EXPECTED_HUMAN_MAP.shards[1].sha256, "safety human-guide shard hash mismatch");
  assert(sha256(readBytes(HUMAN_MAP_PATH)) === "3e0dcc3106afaa10307ed42894c2e761a14783070dcd540bc383a7679f31b867", "central human-guide map hash mismatch");
  for (const shard of central.shards) {
    assertSafeRelativePath(shard.path, "human-guide shard path");
    assert(sha256(readBytes(shard.path)) === shard.sha256, `human-guide shard ref mismatch: ${shard.path}`);
  }
  checkHumanGuideData(central, core, safety);
  return { central, core, safety };
}

function checkDigestRef(ref, label, expected = null) {
  assertExactKeys(ref, expected?.extraKeys ? ["path", "sha256", ...expected.extraKeys] : ["path", "sha256"], label);
  assertSafeRelativePath(ref.path, `${label} path`);
  if (expected?.path) assert(ref.path === expected.path, `${label} path drifted`);
  if (expected?.sha256) assert(ref.sha256 === expected.sha256, `${label} accepted digest drifted`);
  assert(sha256(readBytes(ref.path)) === ref.sha256, `${label} referenced bytes digest mismatch`);
}

function assertAdapterDataOnly(value, label = "game adapter") {
  const forbiddenKeys = new Set(["prompt", "persona_prompt", "behavior", "script", "source_code", "command", "endpoint", "handler", "function", "module", "imports", "server_config"]);
  if (Array.isArray(value)) return value.forEach((item, i) => assertAdapterDataOnly(item, `${label}[${i}]`));
  if (!value || typeof value !== "object") {
    if (typeof value === "string") {
      assert(!/(?:^|\s)(?:import|require)\s*\(|=>|https?:\/\//.test(value), `${label} contains executable or remote-call text`);
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assert(!forbiddenKeys.has(key.toLowerCase()), `${label} embeds forbidden prompt/behavior/executable field ${key}`);
    assertAdapterDataOnly(child, `${label}.${key}`);
  }
}

function checkGameAdapterObject(adapter, refs = {}) {
  assertExactKeys(adapter, ["aipt_schema", "batch_id", "identity", "compatibility_ref", "rule_authority", "identity_authority", "fixture", "mutants", "human_guide", "character_seat_mapping", "persona_binding", "ambiguity_policy", "lifecycle", "commit_pair", "delivery_boundaries"], "game adapter");
  assert(adapter.aipt_schema === "aipt.game-adapter.v1" && adapter.batch_id === BATCH, "game adapter identity drifted");
  assertDeepEqual(adapter.identity, { game: "UNREGISTERED", readiness: "PLAYTESTABLE_DRAFT", scope: "FIRST_ROSTER_TASK0" }, "game adapter exact identity/scope");
  checkDigestRef(adapter.compatibility_ref, "adapter compatibility ref", { path: COMPATIBILITY_PATH, sha256: "cfe8f112a5bbff6a95286953f2d9cfd5629ed1fe1f58d0a578ae17ee87a52d06" });

  assertExactKeys(adapter.rule_authority, ["rule_id_map", "machine_rules", "semantic_graph"], "adapter rule authority");
  checkDigestRef(adapter.rule_authority.rule_id_map, "adapter rule-id-map ref", { path: "aipt/p0-b002/rule-id-map.json", sha256: FROZEN_DIGESTS["aipt/p0-b002/rule-id-map.json"], extraKeys: ["rule_count", "invariant_count"] });
  assert(adapter.rule_authority.rule_id_map.rule_count === 40 && adapter.rule_authority.rule_id_map.invariant_count === 10, "adapter Rule/Invariant counts drifted");
  checkDigestRef(adapter.rule_authority.machine_rules, "adapter machine-rules ref", { path: "aipt/p0-b002/machine-rules.json", sha256: FROZEN_DIGESTS["aipt/p0-b002/machine-rules.json"], extraKeys: ["active_rule_count"] });
  assert(adapter.rule_authority.machine_rules.active_rule_count === 40, "adapter active Rule count drifted");
  checkDigestRef(adapter.rule_authority.semantic_graph, "adapter semantic-graph ref", { path: "aipt/p0-b002/semantic-graph.json", sha256: FROZEN_DIGESTS["aipt/p0-b002/semantic-graph.json"], extraKeys: ["concept_count", "invariant_ref_count"] });
  assert(adapter.rule_authority.semantic_graph.concept_count === 10 && adapter.rule_authority.semantic_graph.invariant_ref_count === 10, "adapter semantic graph counts drifted");

  const ruleMap = refs.ruleMap || loadJson(adapter.rule_authority.rule_id_map.path);
  const machineRules = refs.machineRules || loadJson(adapter.rule_authority.machine_rules.path);
  const graph = refs.graph || loadJson(adapter.rule_authority.semantic_graph.path);
  assertDeepEqual(ruleMap.allocations.filter((allocation) => allocation.kind === "RULE").map((allocation) => allocation.id), RULE_IDS, "adapter referenced 40 Rule IDs");
  assertDeepEqual(ruleMap.allocations.filter((allocation) => allocation.kind === "INVARIANT").map((allocation) => allocation.id), INVARIANT_IDS, "adapter referenced 10 Invariant IDs");
  assertDeepEqual(machineRules.rules.map((rule) => rule.rule_id), RULE_IDS, "adapter machine Rule IDs");
  assertDeepEqual(graph.rule_refs.map((ref) => ref.rule_id), RULE_IDS, "adapter graph Rule refs");
  assertDeepEqual(graph.invariant_refs.map((ref) => ref.invariant_id), INVARIANT_IDS, "adapter graph Invariant refs");

  assertExactKeys(adapter.identity_authority, ["stable_ids", "visibility", "safety_profile"], "adapter identity authority");
  checkDigestRef(adapter.identity_authority.stable_ids, "adapter stable-ids ref", { path: "aipt/p0-b001/stable-ids.json", sha256: FROZEN_DIGESTS["aipt/p0-b001/stable-ids.json"], extraKeys: ["character_ids"] });
  assertDeepEqual(adapter.identity_authority.stable_ids.character_ids, CHARACTER_IDS, "adapter Character IDs");
  checkDigestRef(adapter.identity_authority.visibility, "adapter visibility ref", { path: "aipt/p0-b001/visibility.json", sha256: FROZEN_DIGESTS["aipt/p0-b001/visibility.json"] });
  checkDigestRef(adapter.identity_authority.safety_profile, "adapter SafetyProfile ref", { path: "aipt/p0-b001/safety-profile.json", sha256: FROZEN_DIGESTS["aipt/p0-b001/safety-profile.json"] });
  const stableIds = refs.stableIds || loadJson(adapter.identity_authority.stable_ids.path);
  assertDeepEqual(stableIds.entities.filter((entity) => entity.kind === "CHARACTER").map((entity) => entity.stable_id), CHARACTER_IDS, "adapter referenced Character authority IDs");

  assertExactKeys(adapter.fixture, ["clean_manifest"], "adapter fixture");
  checkDigestRef(adapter.fixture.clean_manifest, "adapter clean manifest ref", { path: `${CLEAN_ROOT}/manifest.json`, sha256: "e52d53541afd15b86dcf79e1e89baa74b8f2c494e342bc02ee8863b0e9ce8faa" });
  assertExactKeys(adapter.mutants, ["id_map", "manifest", "count", "mutation_ids"], "adapter mutants");
  checkDigestRef(adapter.mutants.id_map, "adapter mutation-id-map ref", { path: MUTATION_MAP_PATH, sha256: "ea2dfaf379e9f99e6a3e2ae292d9cbf5787e45d9f7270e894728dbbb66cc50ae" });
  checkDigestRef(adapter.mutants.manifest, "adapter mutant manifest ref", { path: MUTANT_MANIFEST_PATH, sha256: "8904b4c884b046d1dd5637aaec4deb1c518db2297b9cae3af4375ddb11894841" });
  assert(adapter.mutants.count === 3 && JSON.stringify(adapter.mutants.mutation_ids) === JSON.stringify(MUTATION_IDS), "adapter exact Mutation refs drifted");
  const mutationMap = refs.mutationMap || loadJson(adapter.mutants.id_map.path);
  assertDeepEqual(mutationMap.mutations.map((mutation) => mutation.mutation_id), MUTATION_IDS, "adapter referenced Mutation authority IDs");

  assertExactKeys(adapter.human_guide, ["map"], "adapter human guide");
  checkDigestRef(adapter.human_guide.map, "adapter human-guide map ref", { path: HUMAN_MAP_PATH, sha256: "3e0dcc3106afaa10307ed42894c2e761a14783070dcd540bc383a7679f31b867" });
  assertDeepEqual(adapter.character_seat_mapping, CHARACTER_SEAT_MAPPING, "adapter exact Character/seat mapping");
  assertDeepEqual(adapter.persona_binding, { model: "PERSONA_SEPARATE_FROM_CHARACTER", concrete_persona_profiles: "DEFERRED_TO_AIPT_RUN_MANIFEST" }, "adapter exact Persona deferral");
  assertDeepEqual(adapter.ambiguity_policy, { task0_unresolved_blocking_threshold: 2, configuration_layer: "UNREGISTERED_GAME_MAPPING", aipt_core_parameter: false }, "adapter game-owned ambiguity policy");
  assertDeepEqual(adapter.lifecycle, { source_rules: "PROPOSAL", canonical: false, runtime_eligibility: "PLAYTESTABLE_DRAFT_ONLY", release_evidence_eligible: false }, "adapter lifecycle/release boundary");
  assertDeepEqual(adapter.commit_pair, { binding: "DEFERRED_TO_INT_AIPT_UNREGISTERED_001" }, "adapter integration pair deferral");
  assertDeepEqual(adapter.delivery_boundaries, { executable_code: false, aipt_schema_copied: false, sdk_vendored: false, model_prompt_embedded: false }, "adapter data-only delivery boundaries");
  assertAdapterDataOnly(adapter);
}

function checkGameAdapter() {
  const adapter = loadJson(ADAPTER_PATH);
  assert(sha256(readBytes(ADAPTER_PATH)) === "5ddef252e1b93a4b9348fb71e9490f106c02e9e0b8b11fa9a11a589bbc3effc5", "game adapter raw digest drifted");
  checkGameAdapterObject(adapter);
  return adapter;
}

const AIPT_REQUIRED_FILES = [
  "aipt/README.md",
  "aipt/input-manifest.json",
  "aipt/status.json",
  "aipt/p0-b000/identity.json",
  "aipt/p0-b000/licensing.json",
  "aipt/p0-b000/premades-v2.json",
  "aipt/p0-b001/safety-profile.json",
  "aipt/p0-b001/stable-ids.json",
  "aipt/p0-b001/visibility.json",
  "aipt/p0-b002/README.md",
  "aipt/p0-b002/machine-rules.json",
  "aipt/p0-b002/rule-id-map.json",
  "aipt/p0-b002/semantic-graph.json",
  `${CLEAN_ROOT}/action-intent.json`,
  `${CLEAN_ROOT}/event.json`,
  `${CLEAN_ROOT}/final-state.json`,
  `${CLEAN_ROOT}/manifest.json`,
  `${CLEAN_ROOT}/projection-seat-01.json`,
  `${CLEAN_ROOT}/projection-seat-02.json`,
  `${CLEAN_ROOT}/projection-seat-03.json`,
  `${CLEAN_ROOT}/projection-seat-04.json`,
  `${CLEAN_ROOT}/replay-assertion.json`,
  `${CLEAN_ROOT}/seats.json`,
  `${CLEAN_ROOT}/state.json`,
  `${CLEAN_ROOT}/transition.json`,
  overlayPath(MUTATION_IDS[0], "oracle"),
  overlayPath(MUTATION_IDS[0], "overlay"),
  overlayPath(MUTATION_IDS[1], "oracle"),
  overlayPath(MUTATION_IDS[1], "overlay"),
  overlayPath(MUTATION_IDS[2], "oracle"),
  overlayPath(MUTATION_IDS[2], "overlay"),
  MUTANT_MANIFEST_PATH,
  COMPATIBILITY_PATH,
  ADAPTER_PATH,
  HUMAN_MAP_PATH,
  CORE_MAP_PATH,
  SAFETY_MAP_PATH,
  MUTATION_MAP_PATH,
].sort();

const OPTIONAL_FINALIZATION_FILE = "aipt/p0-b003/README.md";
const SCRIPT_FILES = [
  "scripts/aipt/validate-p0-b000.mjs",
  "scripts/aipt/validate-p0-b001.mjs",
  "scripts/aipt/validate-p0-b002.mjs",
  "scripts/aipt/validate-p0-b003.mjs",
].sort();

function checkAiptSurfaceEntries(entries) {
  const nonRegular = entries.filter((entry) => entry.kind !== "file");
  assert(nonRegular.length === 0, `AIPT surface contains symlink/non-regular entries: ${JSON.stringify(nonRegular)}`);
  const actual = entries.map((entry) => entry.path).sort();
  assertUnique(actual, "AIPT surface paths");
  const futurePath = actual.find((rel) => /(?:^|\/)(?:p0-b004|m0-b007)(?:\/|$)/i.test(rel));
  assert(!futurePath, `future batch artifact injected: ${futurePath}`);
  const allowed = new Set([...AIPT_REQUIRED_FILES, OPTIONAL_FINALIZATION_FILE]);
  const missing = AIPT_REQUIRED_FILES.filter((rel) => !actual.includes(rel));
  const unexpected = actual.filter((rel) => !allowed.has(rel));
  assert(missing.length === 0 && unexpected.length === 0, `AIPT exact file allowlist mismatch; missing=${JSON.stringify(missing)} unexpected=${JSON.stringify(unexpected)}`);
}

function checkScriptSurfaceEntries(entries) {
  const nonRegular = entries.filter((entry) => entry.kind !== "file");
  assert(nonRegular.length === 0, `scripts/aipt contains symlink/non-regular entries: ${JSON.stringify(nonRegular)}`);
  assertDeepEqual(entries.map((entry) => entry.path).sort(), SCRIPT_FILES, "scripts/aipt exact B000-B003 validator inventory");
}

function buildSurfaceNeedles() {
  const promptMarker = ["CODEX", "MASTER", "PROMPT"].join("_");
  const packageMarker = ["EXTERNAL", "HARNESS", "AUTHORIZATION", "TEMPLATE"].join("_");
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
      re: new RegExp('"(' + ["pass" + "word", "passwd", "client_" + "secret", "api_" + "key", "access_" + "key", "secret_" + "key", "private_" + "key", "ssh_" + "key"].join("|") + ')"\\s*:\\s*"[^"]+"', "i"),
    },
    { label: "private absolute path", re: new RegExp("/(" + ["Users", "home", "root", "private", "var/folders"].join("|") + ")/") },
    { label: "Windows user path", re: new RegExp("[A-Za-z]:[\\\\/](" + ["Users", "Documents and Settings"].join("|") + ")") },
    { label: "private prompt marker", re: new RegExp(promptMarker), display: promptMarker },
    { label: "private package marker", re: new RegExp(packageMarker), display: packageMarker },
    { label: "participant classification token", re: new RegExp(PARTICIPANT_CLASS), b001Only: true },
    {
      label: "participant data flag",
      re: new RegExp('"(participant_' + ["answers", "names", "responses", "feedback", "mental_health_data"].join("|participant_") + ')"\\s*:\\s*true'),
    },
    {
      label: "participant payload value",
      re: new RegExp('"(participant_' + ["answers", "names", "responses", "feedback", "mental_health_data"].join("|participant_") + ')"\\s*:\\s*("|\\[|\\{)'),
    },
  ];
}

function checkSensitiveSurface() {
  const paths = [
    ...walkEntries("aipt").filter((entry) => entry.kind === "file").map((entry) => entry.path),
    ...walkEntries("LICENSES").filter((entry) => entry.kind === "file").map((entry) => entry.path),
    ...walkEntries("scripts/aipt").filter((entry) => entry.kind === "file").map((entry) => entry.path),
  ];
  const workflow = ".github/workflows/aipt-content-gate.yml";
  if (existsSync(absFor(workflow))) paths.push(workflow);
  for (const rel of paths.sort()) {
    const lines = readText(rel).split(/\r?\n/);
    for (const needle of buildSurfaceNeedles()) {
      if (needle.b001Only && rel.startsWith("aipt/p0-b001/")) continue;
      for (let i = 0; i < lines.length; i += 1) {
        assert(!needle.re.test(lines[i]), `possible ${needle.label} material in ${rel}:${i + 1}`);
      }
    }
  }
}

function checkB003DataOnly() {
  const forbiddenKeys = new Set(["script", "eval", "shell", "source_code", "command", "endpoint", "server", "handler", "function", "module", "import", "model_request", "request_body"]);
  const inspect = (value, label) => {
    if (Array.isArray(value)) return value.forEach((item, i) => inspect(item, `${label}[${i}]`));
    if (!value || typeof value !== "object") {
      if (typeof value === "string") assert(!/(?:^|\s)(?:import|require)\s*\(|=>|https?:\/\//.test(value), `${label} contains executable/network payload text`);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      assert(!forbiddenKeys.has(key.toLowerCase()), `${label} contains executable/runtime/server/model-call key ${key}`);
      inspect(child, `${label}.${key}`);
    }
  };
  for (const rel of AIPT_REQUIRED_FILES.filter((entry) => entry.startsWith("aipt/p0-b003/") && entry.endsWith(".json"))) {
    inspect(loadJson(rel), rel);
  }
}

function checkSurface() {
  checkAiptSurfaceEntries(walkEntries("aipt"));
  checkScriptSurfaceEntries(walkEntries("scripts/aipt"));
  checkSensitiveSurface();
  checkB003DataOnly();
}

function expectReject(name, fn, expectedText) {
  try {
    fn();
  } catch (error) {
    assert(error instanceof Error, `negative probe ${name} rejected without Error`);
    assert(error.message.includes(expectedText), `negative probe ${name} rejected for wrong reason: ${error.message}`);
    return name;
  }
  throw new Error(`negative probe did not reject: ${name}`);
}

function runNegativeProbes(context) {
  const { compatibility, bundle, applied, clean, human, adapter, aiptEntries } = context;
  const probes = [
    ["compatibility AIPT commit drift", () => {
      const value = deepClone(compatibility);
      value.aipt.current_read_only_commit = "0".repeat(40);
      checkCompatibilityObject(value);
    }, "compatibility contract"],
    ["schema copied true", () => {
      const value = deepClone(compatibility);
      value.contract.schema_copied = true;
      checkCompatibilityObject(value);
    }, "compatibility contract"],
    ["SDK vendored true", () => {
      const value = deepClone(compatibility);
      value.contract.sdk_vendored = true;
      checkCompatibilityObject(value);
    }, "compatibility contract"],
    ["fourth Mutation ID", () => {
      const value = deepClone(bundle.idMap);
      value.allocation_order.push("UNR-MUTATION-0004");
      value.mutations.push({ mutation_id: "UNR-MUTATION-0004", kind: "EXTRA", fixture_class: "NON_CANON_TEST_FIXTURE", canonical: false, test_only: true });
      checkMutationIdMapObject(value);
    }, "mutation allocation order"],
    ["Mutation reorder", () => {
      const value = deepClone(bundle.idMap);
      [value.allocation_order[0], value.allocation_order[1]] = [value.allocation_order[1], value.allocation_order[0]];
      checkMutationIdMapObject(value);
    }, "mutation allocation order"],
    ["mutant missing NON_CANON", () => {
      const value = deepClone(bundle.overlays[0]);
      value.markers = value.markers.filter((marker) => marker !== "NON_CANON");
      checkOverlayObject(value, MUTANT_SPECS[0], { verifyPostimage: false });
    }, "overlay markers"],
    ["overlay base mismatch", () => {
      const value = deepClone(bundle.overlays[0]);
      value.base_commit = "0".repeat(40);
      checkOverlayObject(value, MUTANT_SPECS[0], { verifyPostimage: false });
    }, "overlay base mismatch"],
    ["overlay target traversal", () => {
      const value = deepClone(bundle.overlays[0]);
      value.target.path = "aipt/p0-b001/../visibility.json";
      applyOverlay(value, { verifyPostimage: false });
    }, "traversal"],
    ["overlay prototype pollution", () => {
      const value = deepClone(bundle.overlays[0]);
      value.operations[0].path = "/__proto__/polluted";
      applyOverlay(value, { verifyPostimage: false });
    }, "forbidden segment"],
    ["overlay wrong preimage hash", () => {
      const value = deepClone(bundle.overlays[0]);
      value.target.preimage_sha256 = "0".repeat(64);
      applyOverlay(value, { verifyPostimage: false });
    }, "preimage hash mismatch"],
    ["overlay two semantic operations", () => {
      const value = deepClone(bundle.overlays[0]);
      value.operations.push(deepClone(value.operations[0]));
      applyOverlay(value, { verifyPostimage: false });
    }, "exactly one semantic operation"],
    ["clean hidden baseline already leaks", () => {
      const projections = deepClone(clean.projections);
      projections[1].fields.push(deepClone(clean.state.fields.find((field) => field.field_id === "owner-only-fixture-flag")));
      assertExactDetector(hiddenLeakDetectors(loadJson("aipt/p0-b001/visibility.json"), projections), null, "clean hidden baseline");
    }, "detector result"],
    ["hidden overlay does not leak", () => {
      const value = deepClone(bundle.overlays[0]);
      value.operations[0].value = ["GM", "CHARACTER:UNR-CHAR-0001"];
      const mutated = applyOverlay(value, { verifyPostimage: false });
      assertExactDetector(hiddenLeakDetectors(mutated, clean.projections), MUTANT_SPECS[0].detector, "M1 overlay");
    }, "detector result"],
    ["prose mutant wrong rule", () => {
      const value = deepClone(bundle.oracles[1]);
      value.minimal_evidence.rule_id = "UNR-RULE-0019";
      checkFrozenProseEvidence(value);
    }, "ambiguous or wrong rule"],
    ["prose overlay no contradiction", () => {
      const value = deepClone(bundle.overlays[1]);
      value.operations[0].value = -10;
      const mutated = applyOverlay(value, { verifyPostimage: false });
      assertExactDetector(proseDivergenceDetectors(mutated, bundle.oracles[1]), MUTANT_SPECS[1].detector, "M2 overlay");
    }, "detector result"],
    ["replay mutant schema-shape drift", () => {
      const value = deepClone(applied[2]);
      value.injected_shape_field = false;
      replayMismatchDetectors(value, clean.finalState, clean.replay);
    }, "replay schema shape"],
    ["clean replay mismatch", () => {
      const value = deepClone(clean.replay);
      value.final_state_hash = "0".repeat(64);
      assertExactDetector(replayMismatchDetectors(value, clean.finalState, value), null, "clean replay");
    }, "detector result"],
    ["oracle max runs greater than one", () => {
      const value = deepClone(bundle.oracles[0]);
      value.max_detection_runs = 2;
      checkOracleObject(value, MUTANT_SPECS[0]);
    }, "detection run must be exactly one"],
    ["oracle wrong detector", () => {
      const value = deepClone(bundle.oracles[1]);
      value.expected_detector = "WRONG_DETECTOR";
      checkOracleObject(value, MUTANT_SPECS[1]);
    }, "oracle detector mismatch"],
    ["manifest missing mutant", () => {
      const value = deepClone(bundle.manifest);
      value.mutants.pop();
      checkMutantManifestObject(value, { verifyFiles: false });
    }, "exactly three mutants"],
    ["human map merges wall and model latency", () => {
      const value = deepClone(human.core);
      mappingById(value, CORE_MAPPING_IDS[0]).machine_events[1].timing_domain = "WALL_CLOCK";
      checkCoreGuide(value);
    }, "four distinct timing domains"],
    ["human map psychological-safety pass claim", () => {
      const value = deepClone(human.safety);
      mappingById(value, SAFETY_MAPPING_IDS[0]).classification = "PSYCHOLOGICAL_SAFETY_PASS";
      checkSafetyGuide(value);
    }, "psychological-safety pass"],
    ["subjective report promoted to hard gate", () => {
      const value = deepClone(human.safety);
      mappingById(value, SAFETY_MAPPING_IDS[1]).gates.push({ gate_id: "SUBJECTIVE-HARD", type: "HARD" });
      checkSafetyGuide(value);
    }, "promoted to hard gate"],
    ["ambiguity threshold drift", () => {
      const value = deepClone(human.core);
      mappingById(value, CORE_MAPPING_IDS[8]).gates[0].threshold = 3;
      checkCoreGuide(value);
    }, "ambiguity gate"],
    ["missing one of eight scenes", () => {
      const value = deepClone(human.core);
      mappingById(value, CORE_MAPPING_IDS[4]).machine_events[0].scene_node_ids.pop();
      checkCoreGuide(value);
    }, "eight representable scenes"],
    ["adapter embeds Persona prompt", () => {
      const value = deepClone(adapter);
      value.persona_binding.persona_prompt = "embedded";
      checkGameAdapterObject(value);
    }, "Persona deferral"],
    ["adapter claims CANON", () => {
      const value = deepClone(adapter);
      value.lifecycle.canonical = true;
      checkGameAdapterObject(value);
    }, "lifecycle/release boundary"],
    ["release evidence true", () => {
      const value = deepClone(adapter);
      value.lifecycle.release_evidence_eligible = true;
      checkGameAdapterObject(value);
    }, "lifecycle/release boundary"],
    ["AIPT schema copy injected", () => {
      const value = deepClone(adapter);
      value.delivery_boundaries.aipt_schema_copied = true;
      checkGameAdapterObject(value);
    }, "delivery boundaries"],
    ["future B007 artifact injected", () => {
      const value = deepClone(aiptEntries);
      value.push({ path: "aipt/m0-" + "b007/future.json", kind: "file" });
      checkAiptSurfaceEntries(value);
    }, "future batch artifact"],
  ];

  const rejectedNames = probes.map(([name, fn, expected]) => expectReject(name, fn, expected));
  assert(rejectedNames.length === 30, `negative probe count drifted: ${rejectedNames.length}`);
  return rejectedNames;
}

function main() {
  assert(process.versions.node === "24.19.0", `Node runtime must be exactly 24.19.0, got ${process.versions.node}`);
  console.log("PASS runtime node=24.19.0 standard-library/read-only");

  checkHistoricalFreeze();
  console.log("PASS historical freeze files=70 source_inventory=59 machine_digests=3");

  const compatibility = loadJson(COMPATIBILITY_PATH);
  checkCompatibilityObject(compatibility);
  checkCompatibility();
  console.log("PASS compatibility exact pins/dependencies=0/integration-pair=deferred");

  const clean = checkCleanFixture();
  console.log("PASS clean fixture inventory=12 seats=4 deterministic/replay/visibility=coherent");

  const bundle = loadMutationBundle();
  const applied = checkMutationContracts(bundle);
  checkMutantDetectors(clean, bundle, applied);
  console.log("PASS mutations count=3 overlays=memory-only detectors=exact max_runs=1");

  const human = checkHumanGuide();
  console.log("PASS human-guide shards=2 reference-only/contracts=verified");

  const adapter = checkGameAdapter();
  console.log("PASS game-adapter rules=40 invariants=10 mutations=3 characters=4 data-only");

  const aiptEntries = walkEntries("aipt");
  checkSurface();
  console.log("PASS surface AIPT/scripts allowlists/sensitive/non-regular/future=closed");

  const rejectedNames = runNegativeProbes({ compatibility, bundle, applied, clean, human, adapter, aiptEntries });
  console.log(`PASS negative probes rejected=${rejectedNames.length}/${rejectedNames.length} names=${rejectedNames.join(" | ")}`);
  console.log("PASS UNREGISTERED-AIPT-P0-B003 strict validation complete");
}

try {
  main();
} catch (error) {
  console.error(`FAIL UNREGISTERED-AIPT-P0-B003 ${error.message}`);
  process.exitCode = 1;
}
