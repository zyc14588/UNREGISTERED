import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {build} from './build-task0-package.mjs';
import {canonical,requireContent,sha256} from './task0-json.mjs';
const root = fileURLToPath(new URL('../../',import.meta.url));
requireContent(process.argv.length === 2, 'ARGUMENTS');
requireContent(process.version === 'v24.19.0', 'PINNED_NODE_REQUIRED');
const result = build(root);
const tested = spawnSync(process.execPath,['--test','--test-isolation=none','--test-reporter=tap','scripts/aipt/test/task0.test.mjs'],{cwd:root,encoding:'utf8',maxBuffer:1024*1024});
process.stdout.write(tested.stdout ?? ''); process.stderr.write(tested.stderr ?? '');
requireContent(!tested.error, `REFERENCE_PROCESS_${tested.error?.code}`);
requireContent(tested.status === 0, 'REFERENCE_TESTS_FAILED');
console.log(canonical({...result,reference_tests:'PASS',test_log_sha256:sha256(tested.stdout),
  interface_compatibility:'SEPARATE_PINNED_AIPT_CHECK_REQUIRED',production_handler:'NOT_INSTALLED',
  owner_version_adoption:'PENDING',real_gameplay_executions:0,model_calls:0}));
