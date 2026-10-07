// Pure game-owned contract conversion. Trusted seat authorization, source
// acceptance, sequence, persistence and randomness stay in AIPT Run Core.
import { canonical, clone, deepFreeze, exactKeys, requireContent, sha256 } from './task0-json.mjs';
import { requiredCoreDrawCount, project } from './task0-prototype.mjs';
const ID = /^[A-Za-z0-9][A-Za-z0-9._:@+/-]{0,127}$/u;
const SEATS = Object.freeze({GM:'GM',PLAYER_1:'UNR-CHAR-0001',PLAYER_2:'UNR-CHAR-0002',PLAYER_3:'UNR-CHAR-0003',PLAYER_4:'UNR-CHAR-0004'});
export const WIRE_SEATS = Object.freeze({GM:'seat-gm',PLAYER_1:'seat-01',PLAYER_2:'seat-02',PLAYER_3:'seat-03',PLAYER_4:'seat-04'});
const WIRE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/u;

export function authenticateFrame(trustedSeat, frame) {
  requireContent(Object.hasOwn(SEATS,trustedSeat), 'UNTRUSTED_SEAT');
  exactKeys(frame,['actor_id','action_type','payload'],'ACTION_FIELDS');
  requireContent(frame.actor_id === SEATS[trustedSeat], 'FOREIGN_ACTOR');
  return deepFreeze(clone(frame));
}

export function proposalFor(pkg, state, trusted, frame) {
  exactKeys(trusted,['seat','run_id','action_id','expected_sequence'],'TRUSTED_BINDING');
  requireContent(ID.test(trusted.run_id) && ID.test(trusted.action_id) && Number.isSafeInteger(trusted.expected_sequence) &&
    trusted.expected_sequence >= 1 && trusted.expected_sequence < Number.MAX_SAFE_INTEGER, 'TRUSTED_BINDING');
  authenticateFrame(trusted.seat, frame);
  const count = requiredCoreDrawCount(pkg,state,frame);
  return deepFreeze({schema:'aipt.action-proposal/v1',action_id:trusted.action_id,run_id:trusted.run_id,
    actor_id:frame.actor_id,action_type:frame.action_type,expected_sequence:trusted.expected_sequence,
    source:{kind:'EXPLICIT_SOURCE',reference:'UNREGISTERED-TASK0-PROTOTYPE-V2'},payload:clone(frame.payload),
    rng_requests:count ? [{stream_id:'UNR-T0-ROLL',count}] : []});
}

export function protocolRequestFor(trusted, proposal) {
  exactKeys(trusted,['id','fixture_id','seat_id'],'PROTOCOL_BINDING');
  requireContent(WIRE_ID.test(trusted.fixture_id) && Object.values(WIRE_SEATS).includes(trusted.seat_id), 'PROTOCOL_BINDING');
  return deepFreeze({jsonrpc:'2.0',id:trusted.id,protocol_version:'1.0.0',schema_version:'1.0.0',
    fixture_id:trusted.fixture_id,method:'aipt.protocol.applyAction',params:{action:'task0-'+proposal.action_type.toLowerCase().replaceAll('_','-'),
      seat_id:trusted.seat_id,proposal:clone(proposal)}});
}

export function protocolStateFor(pkg, domain, fixtureId) {
  requireContent(WIRE_ID.test(fixtureId), 'PROTOCOL_BINDING');
  const known = Object.values(WIRE_SEATS), player = project(pkg, domain, SEATS.PLAYER_1);
  const common = {public_characters:player.public_characters,player_reference:player.player_reference,
    situation:player.situation,handouts:player.handouts,ledger:player.ledger,world_text_is_data:true};
  const fields = [{field_id:'task0-public',value:common,visibility:{label:'PUBLIC',authorized_seat_ids:known}},
    {field_id:'task0-gm',value:project(pkg,domain,'GM'),visibility:{label:'TABLE_HIDDEN_REMOTE_ALLOWED',authorized_seat_ids:[WIRE_SEATS.GM]}}];
  for (const [seat, principal] of Object.entries(SEATS).filter(([s]) => s !== 'GM')) {
    const own = project(pkg,domain,principal);
    fields.push({field_id:`task0-${WIRE_SEATS[seat]}`,value:{own_state:own.own_state,own_private:own.own_private},
      visibility:{label:'TABLE_HIDDEN_REMOTE_ALLOWED',authorized_seat_ids:[WIRE_SEATS.GM,WIRE_SEATS[seat]]}});
  }
  return deepFreeze({protocol_version:'1.0.0',schema_version:'1.0.0',fixture_id:fixtureId,state_id:'task0-state-'+sha256(canonical(domain)).slice(0,24),fields});
}
export function protocolProjectionFor(state, trustedSeat) {
  requireContent(Object.hasOwn(SEATS,trustedSeat), 'UNTRUSTED_SEAT');
  const wire = WIRE_SEATS[trustedSeat];
  return deepFreeze({protocol_version:'1.0.0',schema_version:'1.0.0',fixture_id:state.fixture_id,projection_id:'task0-projection-'+wire+'-'+state.state_id.slice(-16),seat_id:wire,
    fields:clone(state.fields.filter((field) => field.visibility.authorized_seat_ids.includes(wire)))});
}
