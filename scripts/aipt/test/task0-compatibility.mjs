// Run separately against an exact accepted AIPT checkout; no dependency
// install, network, provider, production handler or public source adoption.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from '../build-task0-package.mjs';
import {canonical,clone,parseStrict,requireContent,sha256} from '../task0-json.mjs';
import {initialState,loadPrototype} from '../task0-prototype.mjs';
import {proposalFor,protocolRequestFor,protocolStateFor,protocolProjectionFor,WIRE_SEATS} from '../task0-aipt-bridge.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
requireContent(process.argv.length===3 && path.isAbsolute(process.argv[2]),'AIPT_CHECKOUT_REQUIRED');
const aipt=process.argv[2], accepted='5f3f6353d744f6674de7cb610a8d8e9b9220c02a';
const git=(args)=>{const r=spawnSync('git',args,{cwd:aipt,encoding:'utf8'});requireContent(r.status===0,'AIPT_SOURCE_CHECK');return r.stdout.trim();};
assert.equal(git(['rev-parse','HEAD']),accepted);git(['diff','--exit-code',accepted,'--','packages/adapter-sdk/src','schemas/run-core/v1']);
assert.equal(process.version,'v24.19.0');
const sdk=await import(pathToFileURL(path.join(aipt,'packages/adapter-sdk/src/index.ts')));
const bound=build(root),pkg=loadPrototype(root,bound.canonical_manifest_sha256),state=initialState(pkg);
const originalSchema=parseStrict(fs.readFileSync(path.join(aipt,'schemas/run-core/v1/aipt-action-proposal.schema.json')));
// The frozen SDK accepts local #/... pointers. Relocate only the root into a
// named definition; original constraints and every local $ref stay intact.
const schema={$defs:{...originalSchema.$defs,task0_action:Object.fromEntries(Object.entries(originalSchema).filter(([k])=>!['$schema','$id','$defs'].includes(k)))}};
let requests=0,projections=0,rejections=0;
for(const [seat,kind,params] of [['PLAYER_1','PLAN',{}],['PLAYER_2','ELECTRONIC_RECON',{}],['PLAYER_1','EQUIP',{items:['supplies'],specialty:'隐匿'}]]){
  const actor=pkg.characters.characters.find((c)=>c.seat_id===seat).character_id;
  const frame={actor_id:actor,action_type:'PLAYER_INTENT',payload:{kind,parameters:params,cost_choice:kind==='ELECTRONIC_RECON'?'exposure':'pressure',text:'NON_CANON contract fixture'}};
  const proposal=proposalFor(pkg,state,{seat,run_id:'fixture-run',action_id:`fixture-${requests}`,expected_sequence:1},frame);
  const checked=sdk.validateSchemaInstance(schema,proposal,'#/$defs/task0_action');assert.equal(checked.valid,true,canonical(checked.issues));
  const request=protocolRequestFor({id:`request-${requests}`,fixture_id:'unregistered-task0-v2',seat_id:WIRE_SEATS[seat]},proposal);
  const encoded=sdk.encodeRequest(request);assert.equal(sdk.encodeRequest(sdk.decodeRequest(encoded)),encoded);assert.equal(sdk.canonicalJsonString(request),canonical(request));requests++;
  const malformed=clone(proposal);malformed.rng_requests=[{stream_id:'UNR-T0-ROLL',count:0}];assert.equal(sdk.validateSchemaInstance(schema,malformed,'#/$defs/task0_action').valid,false);rejections++;
}
const full=protocolStateFor(pkg,state,'unregistered-task0-v2'),known=Object.values(WIRE_SEATS);
const shape=sdk.validateStateShape(full);assert.equal(shape.valid,true,canonical(shape.issues));
for(const seat of Object.keys(WIRE_SEATS)){const p=protocolProjectionFor(full,seat),v=sdk.validateProjectionSemantics(full,p,known);assert.equal(v.valid,true,canonical(v.issues));projections++;
  if(seat!=='GM'){const mutant=clone(p);mutant.fields.push(clone(full.fields.find((f)=>f.field_id==='task0-gm')));const denied=sdk.validateProjectionSemantics(full,mutant,known);assert.equal(denied.valid,false);assert.ok(denied.issues.some((i)=>i.code==='AIPT_VISIBILITY_UNAUTHORIZED_FIELD'));rejections++;}}
const selected=git(['ls-files','packages/adapter-sdk/src','schemas/run-core/v1/aipt-action-proposal.schema.json']);
const inputs=selected.split('\n').map((name)=>({path:name,sha256:sha256(fs.readFileSync(path.join(aipt,name)))}));
console.log(canonical({schema:'unregistered.task0-aipt-compatibility-check/v1',result:'PASS_CONTRACTS_ONLY',aipt_commit:accepted,
  source_package_sha256:bound.canonical_manifest_sha256,protocol_requests:requests,role_projections:projections,negative_rejections:rejections,
  aipt_inputs:inputs,production_handler_installed:false,source_adopted:false,real_gameplay_executions:0,model_calls:0}));
