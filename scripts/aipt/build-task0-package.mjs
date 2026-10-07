// Local source preparation only. A newly generated digest grants no AIPT
// authority: the exact candidate commit/tree/digest need external acceptance.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, parseStrict, readHeld, requireContent, sha256 } from './task0-json.mjs';
import { BASE_COMMIT, BASE_TREE, PREFIX, loadPrototype } from './task0-prototype.mjs';

export const ADDITIONS = [
  ...['README.md','characters.json','character-private.json','gm-content.json','handouts.json',
    'parameters.json','action-contract.json','visibility.json','player-reference.md','gm-runbook.md',
    'readiness.json','adoption-proposal.md','ci-successor-proposal.yml'].map((name) => PREFIX+name),
  'scripts/aipt/task0-json.mjs', 'scripts/aipt/task0-prototype.mjs',
  'scripts/aipt/task0-aipt-bridge.mjs', 'scripts/aipt/build-task0-package.mjs',
  'scripts/aipt/task0-reference-cli.mjs',
  'scripts/aipt/validate-task0-v2.mjs', 'scripts/aipt/test/task0.test.mjs',
  'scripts/aipt/test/task0-compatibility.mjs',
].sort();

export function inventory(root) {
  const old = parseStrict(readHeld(root, 'aipt/input-manifest.json'));
  const sources = [...old.source_files,...old.registry_refs];
  requireContent(sources.length === 17, 'OLD_MANIFEST_COUNT');
  for (const item of sources) requireContent(sha256(readHeld(root,item.path)) === item.sha256, 'OLD_SOURCE_CHANGED');
  const historical = [...sources.map((item) => item.path), 'aipt/input-manifest.json',
    'aipt/p0-b001/visibility.json','aipt/p0-b001/safety-profile.json','aipt/p0-b002/machine-rules.json',
    'aipt/p0-b002/rule-id-map.json','aipt/p0-b002/semantic-graph.json',
    'aipt/p0-b003/game-adapter.json','aipt/p1-b000/runtime-adapter-input.json','aipt/p1-b000/playtest-package.json'];
  requireContent(sha256(readHeld(root,'aipt/p0-b002/machine-rules.json')) === '139d095fe54926e1599edf208b65f7a89061f1cda6d8b492f83b5e47c0693c78', 'RULE_SOURCE_CHANGED');
  const files = [...new Set([...historical,...ADDITIONS])].sort();
  return {schema:'unregistered.task0-prototype-package/v2', package_id:'UNREGISTERED-TASK0-PROTOTYPE-V2',
    lifecycle:'PROTOTYPE', canonical:false, source_baseline:{repository:'zyc14588/UNREGISTERED',commit:BASE_COMMIT,tree:BASE_TREE},
    containing_revision_binding:'EXTERNAL_ACCEPTED_COMMIT_TREE_AND_DIGEST_REQUIRED',
    entries:files.map((name) => {const bytes = readHeld(root,name);return {path:name,bytes:bytes.length,sha256:sha256(bytes)};})};
}

export function build(root, mode = 'check') {
  requireContent(['check','write'].includes(mode), 'BUILD_MODE');
  const proposed = inventory(root), bytes = canonical(proposed), digest = sha256(bytes);
  if (mode === 'write') fs.writeFileSync(path.join(root,PREFIX+'package-manifest.json'), JSON.stringify(proposed,null,2)+'\n');
  const actual = parseStrict(readHeld(root,PREFIX+'package-manifest.json'));
  requireContent(canonical(actual) === bytes, 'MANIFEST_OUT_OF_DATE'); loadPrototype(root,digest);
  return {schema:'unregistered.task0-local-package-check/v1', result:'PASS_SOURCE_BYTES_ONLY',
    lifecycle:'PROTOTYPE', canonical:false, canonical_manifest_sha256:digest, entries:proposed.entries.length,
    external_acceptance:false, aipt_source_rebound:false, real_gameplay_executions:0, model_calls:0};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  requireContent(process.argv.length <= 3, 'ARGUMENTS');
  const root = fileURLToPath(new URL('../../',import.meta.url));
  console.log(JSON.stringify(build(root,process.argv[2] === '--write' ? 'write' : process.argv.length === 2 ? 'check' : 'INVALID')));
}
