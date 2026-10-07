// NON_CANON local reference process for contract fixtures. No production
// transport, credentials, model or seed; accepted source is an external input.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {canonical,exactKeys,parseStrict,requireContent} from './task0-json.mjs';
import {loadPrototype,initialState,validateState,applyAction,complete,requiredCoreDrawCount} from './task0-prototype.mjs';
const input=parseStrict(fs.readFileSync(0));
const root=fileURLToPath(new URL('../../',import.meta.url));
requireContent(process.argv.length===2,'ARGUMENTS');
const pkg=loadPrototype(root,input.manifest_digest);
let output;
if(input.operation==='INITIAL'){exactKeys(input,['operation','manifest_digest']);output=initialState(pkg);}
else if(input.operation==='COUNT'){exactKeys(input,['operation','manifest_digest','state','action']);output={count:requiredCoreDrawCount(pkg,input.state,input.action)};}
else if(input.operation==='INVARIANT'){exactKeys(input,['operation','manifest_digest','state']);validateState(pkg,input.state);output={valid:true,complete:complete(pkg,input.state)};}
else if(input.operation==='APPLY'){exactKeys(input,['operation','manifest_digest','state','action','draws']);output=applyAction(pkg,input.state,input.action,input.draws).state;}
else requireContent(false,'OPERATION');
process.stdout.write(canonical(output)+'\n');
