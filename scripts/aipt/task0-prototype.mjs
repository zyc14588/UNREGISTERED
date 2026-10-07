// Pure NON_CANON reference for the game-owned action handler. No provider,
// seed generator, queue, persistent ledger, agent or authoritative Run Core.
import { canonical, clone, deepFreeze, exactKeys, object, parseStrict, readHeld, requireContent, sha256, ContentError } from './task0-json.mjs';

export const PREFIX = 'aipt/task0-v2/';
export const BASE_COMMIT = 'fe0965977447caf8cd7b6e58252bc1b991b7cc6f';
export const BASE_TREE = '34597e79c586fb034256daa32d67640692ec589d';
const CHARS = ['UNR-CHAR-0001', 'UNR-CHAR-0002', 'UNR-CHAR-0003', 'UNR-CHAR-0004'];
const TIERS = ['CATASTROPHE', 'FAILURE', 'COSTLY', 'SUCCESS', 'CRITICAL'];
const REST_KINDS = ['SOOTHE', 'TREAT_WOUND', 'REPLENISH', 'ARCHIVE', 'CONTACT', 'DECLINE_REST'];
const TAKEDOWN_RETRY_PENALTY = 20;
const PARAM_KEYS = {
  OBSERVE: [], ELECTRONIC_RECON: [], SOCIAL_RECON: [], PLAN: [], WAIT: ['minutes'],
  EQUIP: ['items', 'specialty'], FOLLOW: ['leader_id'], ASSIST: ['character_id', 'skill'], MOVE: ['to', 'group'], AVOID: [],
  TAKEDOWN: ['npc_id'], DOOR_ELECTRONIC: [], DOOR_SOCIAL: [], LOCKPICK: [], LOCK_ELECTRONIC: [],
  SEARCH: [], FIRE: ['npc_id'], CHASE: ['skill'], WITHDRAW: [], DELIVER: [], SOOTHE: [],
  TREAT_WOUND: [], REPLENISH: ['item_id'], ARCHIVE: [], CONTACT: [], DECLINE_REST: [],
  GROW: ['skill'], SPEND_PLAN: ['item_id', 'detail'], DROP_TARGET: [], TAKE_TARGET: [], PUSH: [], OTHER: [],
};

export function loadPrototype(root, expectedManifestDigest) {
  requireContent(/^[0-9a-f]{64}$/u.test(expectedManifestDigest), 'EXTERNAL_DIGEST_REQUIRED');
  const manifest = parseStrict(readHeld(root, PREFIX + 'package-manifest.json'));
  exactKeys(manifest, ['schema','package_id','lifecycle','canonical','source_baseline','containing_revision_binding','entries'], 'MANIFEST_FIELDS');
  exactKeys(manifest.source_baseline, ['repository','commit','tree'], 'BASE_FIELDS');
  requireContent(sha256(canonical(manifest)) === expectedManifestDigest, 'MANIFEST_DIGEST');
  requireContent(manifest.schema === 'unregistered.task0-prototype-package/v2' && manifest.canonical === false &&
    manifest.lifecycle === 'PROTOTYPE' && manifest.package_id === 'UNREGISTERED-TASK0-PROTOTYPE-V2' && manifest.source_baseline.repository === 'zyc14588/UNREGISTERED' && manifest.source_baseline.commit === BASE_COMMIT && manifest.source_baseline.tree === BASE_TREE &&
    Array.isArray(manifest.entries) && manifest.entries.length >= 25 && manifest.entries.length <= 64, 'MANIFEST_IDENTITY');
  const entries = new Map(), held = new Map();
  for (const entry of manifest.entries) {
    exactKeys(entry, ['path', 'bytes', 'sha256']); requireContent(!entries.has(entry.path), 'DUPLICATE_SOURCE');
    const bytes = readHeld(root, entry.path);
    requireContent(bytes.length === entry.bytes && sha256(bytes) === entry.sha256, 'SOURCE_DIGEST');
    entries.set(entry.path, entry); held.set(entry.path, bytes);
  }
  const get = (name) => { requireContent(held.has(PREFIX + name), 'UNLISTED_SOURCE'); return parseStrict(held.get(PREFIX + name)); };
  const getText = (name) => {
    requireContent(held.has(name), 'UNLISTED_SOURCE');
    try { return new TextDecoder('utf-8',{fatal:true}).decode(held.get(name)); }
    catch { throw new ContentError('INVALID_SOURCE_UTF8'); }
  };
  const pkg = { manifest, parameters: get('parameters.json'), characters: get('characters.json'),
    private: get('character-private.json'), gm: get('gm-content.json'), contract: get('action-contract.json'), visibility: get('visibility.json'), handouts: get('handouts.json'),
    publicText: getText(PREFIX + 'player-reference.md'),
    gmText: getText(PREFIX + 'gm-runbook.md'),
    gmSafetyText: getText('campaign/session0-redlines.md') };
  requireContent(pkg.parameters.canonical === false && pkg.parameters.canon_confirmed === false &&
    pkg.parameters.lifecycle === 'PROTOTYPE' && pkg.parameters.base_rule_ids.length === 40 &&
    pkg.parameters.core.skill_attributes['抵抗污染'] === '意志', 'LIFECYCLE');
  requireContent(held.has('aipt/input-manifest.json') && held.has('aipt/p0-b002/machine-rules.json') && held.has('aipt/p0-b000/premades-v2.json'), 'MISSING_PREDECESSOR');
  for (const [name, digest] of [
    ['aipt/p0-b002/rule-id-map.json', '321550a1bb91066c263e5857c8095878d708af3f296430bc00011d70f5bb242c'],
    ['aipt/p0-b002/semantic-graph.json', '8c9ad9ade247ac6195019b7225725c70cd26b55270979d31c7b3701d02092562'],
  ]) requireContent(held.has(name) && sha256(held.get(name)) === digest, 'RULE_BINDING_METADATA');
  const original = parseStrict(held.get('aipt/input-manifest.json'));
  const oldSources = [...original.source_files,...original.registry_refs];
  requireContent(oldSources.length === 17 && oldSources.every((item) => held.has(item.path) && sha256(held.get(item.path)) === item.sha256), 'PREDECESSOR_SOURCE_BYTES');
  requireContent(sha256(held.get('aipt/p0-b002/machine-rules.json')) === '139d095fe54926e1599edf208b65f7a89061f1cda6d8b492f83b5e47c0693c78', 'RULE_SOURCE_CHANGED');
  const rules = parseStrict(held.get('aipt/p0-b002/machine-rules.json')).rules;
  requireContent(canonical(pkg.parameters.base_rule_ids) === canonical(rules.map((r) => r.rule_id)), 'RULE_IDS');
  requireContent(rules.find((r) => r.rule_id === 'UNR-RULE-0030').resolution.some((row) =>
    row.kind === 'tier_effects' && row.effects.some((effect) => effect.tier === 'failure_with_progress' &&
      effect.effect === 'melee_next_round_must_fire_or_retry_at_-20')), 'TAKEDOWN_FOLLOWUP_SOURCE');
  const mappings = rules.find((r) => r.rule_id === 'UNR-RULE-0002').resolution.find((r) => r.kind === 'untrained_mapping').skills;
  requireContent(canonical(pkg.parameters.core.skill_attributes) === canonical(Object.fromEntries(mappings.map((m) => [m.skill,m.attribute]))), 'UNTRAINED_MAPPING');
  const fixed = {die_sides:100,normal_draws:2,advantage_draws:3,modifier_min:-20,modifier_max:20,critical_divisor:5,cost_offset:15,cost_max:95,catastrophe_min:96,warning_pressure:7,warning_pollution:1,warning_alarm:2,pressure_cap:10,fatigue_cap:10,pollution_cap:10,untrained_divisor:2};
  requireContent(Object.entries(fixed).every(([k,v]) => pkg.parameters.core[k] === v), 'FIXED_CORE_PARAMETER');
  requireContent(canonical(pkg.characters.characters.map((c) => c.character_id)) === canonical(CHARS) &&
    canonical(Object.keys(pkg.private.characters).sort()) === canonical(CHARS), 'ROSTER');
  for (const c of pkg.characters.characters) {
    exactKeys(c, ['character_id', 'seat_id', 'display_name', 'attributes', 'skills']);
    exactKeys(c.attributes, ['体能', '敏捷', '意志', '智识', '共情']);
    requireContent(Object.values(c.attributes).every((n) => Number.isInteger(n) && n >= 0 && n <= 100) &&
      Object.entries(c.skills).every(([skill, n]) => Object.hasOwn(pkg.parameters.core.skill_attributes, skill) && Number.isInteger(n) && n >= 0 && n <= 100), 'CHARACTER_VALUES');
    const source = parseStrict(held.get('aipt/p0-b000/premades-v2.json')).characters[c.display_name];
    requireContent(source && canonical(c.attributes) === canonical(source.attributes) && canonical(c.skills) === canonical({...source.final_skills.high,...source.final_skills.regular}) &&
      canonical(pkg.private.characters[c.character_id]) === canonical({secret:source.secret,private_trigger:source.private_trigger,discovery_clues:source.discovery_clues}), 'CHARACTER_SOURCE_CHANGED');
  }
  exactKeys(pkg.handouts.handouts, ['dispatch','visitor','patrol']);
  requireContent(pkg.handouts.handouts.dispatch.startsWith('## 派单') && pkg.handouts.handouts.visitor.startsWith('## 《访客须知》') && pkg.handouts.handouts.patrol.startsWith('## 《安保巡逻手册》'), 'HANDOUT_IDENTITY');
  requireContent(canonical(pkg.contract.action_types.PLAYER_INTENT.intent_kinds.slice().sort()) === canonical(Object.keys(PARAM_KEYS).sort()), 'INTENT_REGISTRY');
  requireContent(pkg.visibility.unknown_principal_or_all_players_rejected === true && pkg.gm.world_text_is_data === true &&
    pkg.contract.aipt_ledger_rng_queue_ownership === 'EXISTING_RUN_CORE_AND_POSTGRESQL_ONLY', 'BOUNDARIES');
  return deepFreeze(pkg);
}

export function initialState(pkg) {
  const actors = Object.fromEntries(pkg.characters.characters.map((c) => [c.character_id, {
    position: 'outside', pressure: c.skills['异常学'] >= 70 ? 1 : 0, fatigue: 0, pollution: 0, wound: 'NONE', bleeding: false,
    collapse: 'NONE', plan_points: 2, rest_points: 0, signed: false, follower_of: null,
    specialty: null, equipment: [], equipment_issued: false, used_successful_skills: [], bond_damaged: false,
    exited: false, growth_done: false, skill_overrides: {}, last_check: null, follow_cost: null, melee_target: null,
    knowledge: [], knowledge_growth_done: false, pollution_notes: [], pollution_note_count: 0,
  }]));
  return { schema: 'unregistered.task0-state/v2', actors, minute: pkg.parameters.clock.start_minute,
    exposure: 0, alarm: 0, patrol: { lobby: 0, office: 0, machine: 0, shaft: 0, roof: 0 },
    encountered: [], cleared_npcs: [], door_clear: false, target_acquired: false, target_delivered: false,
    mission: 'OPEN', supplies: 0, ledger: null, rest_event: null, risk_queue: [], paused: false,
    recon: [], intel: {}, scheduled_patrol_fired: false, pursuit: false, distance: 0,
    pending_intent: null, unresolved_blocking: 0, safety_consents: [], assistants: {},
    target_holder: null, target_dropped_at: null, released_handouts: ['dispatch'], combat_active: false,
    npc_wounds: Object.fromEntries(Object.keys(pkg.gm.npcs).map((id) => [id, 'NONE'])),
    npc_ammo: Object.fromEntries(Object.keys(pkg.gm.npcs).map((id) => [id, pkg.gm.npcs[id].pistol === null ? 0 : pkg.parameters.combat_prototype.npc_ammo])) };
}

export function validateState(pkg, state) {
  exactKeys(state, Object.keys(initialState(pkg)), 'STATE_FIELDS');
  requireContent(state.schema === 'unregistered.task0-state/v2' && object(state.actors) &&
    canonical(Object.keys(state.actors).sort()) === canonical(CHARS), 'STATE_ROSTER');
  requireContent(Number.isInteger(state.minute) && state.minute >= 1200 && state.minute <= 2880 &&
    Number.isSafeInteger(state.exposure) && state.exposure >= 0 && state.exposure <= 1000 && Number.isInteger(state.alarm) && state.alarm >= 0 && state.alarm <= 3 &&
    Number.isInteger(state.supplies) && state.supplies >= 0 && state.supplies <= 4 &&
    ['OPEN', 'DELIVERED_ON_TIME', 'DELIVERED_LATE', 'WITHDREW_NOT_DELIVERED'].includes(state.mission), 'STATE_RANGE');
  for (const c of CHARS) {
    const s = state.actors[c]; exactKeys(s, Object.keys(initialState(pkg).actors[c]), 'CHARACTER_STATE_FIELDS');
    requireContent(pkg.parameters.mission.areas.includes(s.position) && ['NONE', 'LIGHT', 'HEAVY', 'LETHAL'].includes(s.wound) &&
      ['NONE', 'PENDING', 'ACTIVE'].includes(s.collapse) && [s.pressure, s.fatigue, s.pollution].every((x) => Number.isInteger(x) && x >= 0 && x <= 10) &&
      Number.isInteger(s.rest_points) && s.rest_points >= 0 && s.rest_points <= 2 &&
      Number.isInteger(s.plan_points) && s.plan_points >= 0 && s.plan_points <= 2 &&
      ['signed', 'bleeding', 'bond_damaged', 'exited', 'growth_done', 'knowledge_growth_done', 'equipment_issued'].every((key) => typeof s[key] === 'boolean') &&
      Array.isArray(s.equipment) && s.equipment.length <= 9 && s.equipment.every((id) => pkg.parameters.inventory.shop.some((item) => item.item_id === id)) &&
      s.equipment.every((id) => s.equipment.filter((x) => x === id).length <= 3) &&
      (s.specialty === null || Object.hasOwn(pkg.parameters.core.skill_attributes, s.specialty)) &&
      (s.follow_cost === null || ['time', 'pressure', 'resource', 'exposure'].includes(s.follow_cost)) &&
      (s.follower_of === null || CHARS.includes(s.follower_of) && s.follower_of !== c), 'CHARACTER_STATE_RANGE');
    requireContent(!s.exited || s.position === 'safehouse', 'EXIT_POSITION');
    requireContent(s.melee_target === null || typeof s.melee_target === 'string' &&
      Object.hasOwn(pkg.gm.npcs, s.melee_target) && !state.cleared_npcs.includes(s.melee_target) &&
      pkg.gm.npcs[s.melee_target].areas.includes(s.position) && !s.exited && state.combat_active, 'MELEE_STATE');
    requireContent(s.follower_of === null || !state.actors[s.follower_of].follower_of && s.follow_cost !== null, 'FOLLOW_GRAPH');
    requireContent(object(s.skill_overrides) && Object.entries(s.skill_overrides).every(([skill, value]) => Object.hasOwn(pkg.parameters.core.skill_attributes, skill) && Number.isInteger(value) && value >= 0 && value <= 100), 'SKILL_OVERRIDE');
    const uniqueSkills = s.used_successful_skills;
    requireContent(Array.isArray(uniqueSkills) && uniqueSkills.length <= 35 && new Set(uniqueSkills).size === uniqueSkills.length && uniqueSkills.every((skill) => Object.hasOwn(pkg.parameters.core.skill_attributes, skill)), 'USED_SKILLS');
    requireContent(Array.isArray(s.knowledge) && s.knowledge.length <= 16 && s.knowledge.every((row) => object(row) &&
      Object.keys(row).sort().join(',') === 'fact_id,minute,status,text,verdict' && typeof row.text === 'string' && Buffer.byteLength(row.text) <= 512 &&
      Number.isInteger(row.minute) && row.minute >= 1200 && row.minute <= state.minute && ['SEEN','VERIFIED','REFUTED'].includes(row.status) &&
      (Object.hasOwn(pkg.gm.knowledge_facts, row.fact_id) || /^T0-NOTE-[1-9][0-9]?$/u.test(row.fact_id)) &&
      (row.verdict === null || typeof row.verdict === 'boolean')) && new Set(s.knowledge.map((row) => row.fact_id)).size === s.knowledge.length, 'KNOWLEDGE_STATE');
    requireContent(Array.isArray(s.pollution_notes) && s.pollution_notes.length === s.pollution && s.pollution_notes.every((note, i) =>
      object(note) && Object.keys(note).sort().join(',') === 'note_id,number,source,text' && note.number === i+1 && note.source === 'REST_RISK' &&
      (note.text === null ? note.note_id === null : Object.hasOwn(pkg.gm.pollution_note_templates,note.note_id) && note.text === pkg.gm.pollution_note_templates[note.note_id])) &&
      Number.isInteger(s.pollution_note_count) && s.pollution_note_count === s.pollution_notes.filter((note) => note.text !== null).length, 'POLLUTION_SOURCE');
    if (s.last_check !== null) {
      exactKeys(s.last_check, ['kind','parameters','cost_choice','result','pushed'], 'LAST_CHECK');
      requireContent(Object.hasOwn(PARAM_KEYS, s.last_check.kind) && TIERS.includes(s.last_check.result) && typeof s.last_check.pushed === 'boolean' &&
        ['time','pressure','resource','exposure'].includes(s.last_check.cost_choice), 'LAST_CHECK');
      exactKeys(s.last_check.parameters, PARAM_KEYS[s.last_check.kind]);
    }
  }
  const unique = (a, allowed) => Array.isArray(a) && a.length <= allowed.length && new Set(a).size === a.length && a.every((id) => allowed.includes(id));
  requireContent(['door_clear','target_acquired','target_delivered','paused','scheduled_patrol_fired','pursuit','combat_active'].every((key) => typeof state[key] === 'boolean') &&
    Number.isInteger(state.distance) && state.distance >= 0 && state.distance <= 3 &&
    Number.isInteger(state.unresolved_blocking) && state.unresolved_blocking >= 0 && state.unresolved_blocking <= 2 && state.pending_intent === null, 'WORLD_FLAGS');
  exactKeys(state.patrol, ['lobby','office','machine','shaft','roof']);
  requireContent(Object.values(state.patrol).every((n) => Number.isInteger(n) && n >= 0 && n <= 4) &&
    unique(state.encountered, Object.keys(state.patrol)) && state.encountered.every((id) => state.patrol[id] === 4) &&
    unique(state.cleared_npcs, Object.keys(pkg.gm.npcs)) && unique(state.recon, ['OBSERVE','ELECTRONIC_RECON','SOCIAL_RECON']) &&
    unique(state.safety_consents, CHARS) && unique(state.released_handouts, ['dispatch','visitor','patrol']) && state.released_handouts.includes('dispatch') &&
    unique(state.risk_queue, CHARS), 'WORLD_COLLECTIONS');
  requireContent(object(state.intel) && Object.keys(state.intel).every((key) => state.recon.includes(key)) &&
    Object.values(state.intel).every((value) => ['PUBLIC','PUBLIC_SEMI','PUBLIC_SEMI_DARK'].includes(value)), 'INTEL_STATE');
  exactKeys(state.npc_wounds, Object.keys(pkg.gm.npcs)); exactKeys(state.npc_ammo, Object.keys(pkg.gm.npcs));
  requireContent(Object.values(state.npc_wounds).every((w) => ['NONE','LIGHT','HEAVY','LETHAL'].includes(w)) &&
    Object.values(state.npc_ammo).every((n) => Number.isInteger(n) && n >= 0 && n <= pkg.parameters.combat_prototype.npc_ammo), 'NPC_STATE');
  requireContent(object(state.assistants) && Object.entries(state.assistants).every(([id, d]) => CHARS.includes(id) && object(d) &&
    Object.keys(d).sort().join(',') === 'character_id,skill' && CHARS.includes(d.character_id) && d.character_id !== id && Object.hasOwn(pkg.parameters.core.skill_attributes, d.skill)), 'ASSIST_STATE');
  requireContent((state.target_holder === null || CHARS.includes(state.target_holder) && !state.actors[state.target_holder].exited) &&
    (state.target_dropped_at === null || pkg.parameters.mission.areas.includes(state.target_dropped_at)) &&
    !(state.target_holder && state.target_dropped_at) && (!state.target_delivered || state.target_acquired && state.target_holder === null && state.target_dropped_at === null), 'TARGET_STATE');
  if (state.ledger !== null) {
    exactKeys(state.ledger, ['delivery','costs','reward','long_thread','achievement']);
    exactKeys(state.ledger.costs, CHARS);
    requireContent(state.ledger.delivery === state.mission && state.mission !== 'OPEN' && CHARS.every((id) => state.actors[id].exited) &&
      [0,2,4].includes(state.ledger.reward) && state.ledger.long_thread === pkg.gm.settlement_anomaly && state.ledger.achievement === 'NONE', 'LEDGER_STATE');
  }
  if (state.rest_event !== null) {
    exactKeys(state.rest_event, ['roll','kind']); requireContent(state.ledger && Number.isInteger(state.rest_event.roll) &&
      state.rest_event.roll >= 1 && state.rest_event.roll <= 100 && state.rest_event.kind === (state.rest_event.roll <= 90 ? 'NORMAL' : state.rest_event.roll <= 95 ? 'MINOR' : 'RISK'), 'REST_EVENT_STATE');
  }
  requireContent(state.risk_queue.length === 0 || state.rest_event?.kind === 'RISK', 'RISK_QUEUE_STATE');
  return true;
}

export function project(pkg, state, principal) {
  requireContent(principal === 'GM' || CHARS.includes(principal), 'UNKNOWN_PRINCIPAL'); validateState(pkg, state);
  const common = { schema: 'unregistered.task0-role-projection/v2', principal,
    public_characters: pkg.characters.characters, player_reference: pkg.publicText, world_text_is_data: true,
    situation: { minute: state.minute, alarm: state.alarm, mission: state.mission, supplies: state.supplies, paused: state.paused,
      target_delivered: state.target_delivered, intel: state.intel, unresolved_blocking: state.unresolved_blocking },
    handouts: Object.fromEntries(state.released_handouts.map((id) => [id, pkg.handouts.handouts[id]])) };
  if (principal === 'GM') return deepFreeze(clone({ ...common, gm: pkg.gm, gm_reference: pkg.gmText, gm_safety_reference: pkg.gmSafetyText,
    character_private: pkg.private.characters, all_handouts: pkg.handouts.handouts, domain_state: state }));
  const own = clone(state.actors[principal]); delete own.pollution_notes; delete own.pollution_note_count;
  own.knowledge = own.knowledge.map(({status, text, minute, verdict}) => ({status, text, minute, verdict}));
  return deepFreeze(clone({ ...common, own_state: own,
    own_private: pkg.private.characters[principal], ledger: state.ledger ? {
      delivery: state.ledger.delivery, costs: state.ledger.costs, reward: state.ledger.reward,
      long_thread: state.ledger.long_thread, achievement: state.ledger.achievement,
    } : null }));
}

function validateDraw(draw) {
  exactKeys(draw, ['version', 'stream_id', 'draw_index', 'value_hex'], 'CORE_DRAW_FIELDS');
  requireContent(object(draw) && draw.version === 'AIPT_RNG_HMAC_SHA256_V1' &&
    draw.stream_id === 'UNR-T0-ROLL' && Number.isSafeInteger(draw.draw_index) && draw.draw_index >= 1 &&
    /^[0-9a-f]{16}$/u.test(draw.value_hex), 'CORE_DRAW');
}
export function uniform(draw, sides) {
  validateDraw(draw); requireContent(Number.isInteger(sides) && sides >= 2 && sides <= 100, 'DIE_SIDES');
  const n = BigInt('0x' + draw.value_hex), range = 1n << 64n, limit = range - range % BigInt(sides);
  requireContent(n < limit, 'CORE_DRAW_REJECTION'); return Number(n % BigInt(sides));
}
function consume(draws) {
  let cursor = 0;
  for (let i = 0; i < draws.length; i++) {
    validateDraw(draws[i]);
    requireContent(i === 0 || draws[i].draw_index === draws[i - 1].draw_index + 1, 'CORE_DRAW_ORDER');
  }
  return { d100(advantage = 0) {
    requireContent(cursor + (advantage ? 3 : 2) <= draws.length, 'CORE_DRAW_COUNT');
    const ones = uniform(draws[cursor++], 10), tens = uniform(draws[cursor++], 10);
    const roll = tens * 10 + ones || 100;
    if (advantage) { const other = uniform(draws[cursor++], 10) * 10 + ones || 100; return advantage > 0 ? Math.min(roll, other) : Math.max(roll, other); }
    return roll;
  }, die(sides) { requireContent(cursor < draws.length, 'CORE_DRAW_COUNT'); return uniform(draws[cursor++], sides) + 1; },
  done() { requireContent(cursor === draws.length, 'CORE_DRAW_COUNT'); } };
}
export function tier(target, roll, warning) {
  requireContent(Number.isInteger(target) && target >= 0 && target <= 100 && Number.isInteger(roll) && roll >= 1 && roll <= 100, 'CHECK_VALUES');
  return warning && roll >= 96 ? 'CATASTROPHE' : roll <= Math.floor(target / 5) ? 'CRITICAL' :
    roll <= target ? 'SUCCESS' : roll <= Math.min(target + 15, 95) ? 'COSTLY' : 'FAILURE';
}
function stat(pkg, id, skill) {
  const c = pkg.characters.characters.find((c) => c.character_id === id); requireContent(c && Object.hasOwn(pkg.parameters.core.skill_attributes, skill), 'SKILL');
  return c.skills[skill] ?? Math.floor(c.attributes[pkg.parameters.core.skill_attributes[skill]] / 2);
}
function check(pkg, state, id, skill, rng, modifier = 0, statePenalty = 0) {
  const c = state.actors[id], character = pkg.characters.characters.find((c) => c.character_id === id);
  const load = c.equipment.reduce((sum, item) => sum + pkg.parameters.inventory.shop.find((x) => x.item_id === item).load, 0);
  let bonus = modifier;
  const assistants = Object.entries(state.assistants).filter(([other, declaration]) => other !== id &&
    declaration.character_id === id && declaration.skill === skill && state.actors[other].position === c.position);
  bonus += Math.min(2, assistants.length) * 10;
  for (const [other] of assistants) delete state.assistants[other];
  for (const item of c.equipment) bonus += pkg.parameters.inventory.shop.find((x) => x.item_id === item).bonuses[skill] ?? 0;
  let penalty = Math.floor(c.fatigue / 2) * 10 + statePenalty;
  if (['体能', '敏捷'].includes(pkg.parameters.core.skill_attributes[skill])) penalty += c.wound === 'HEAVY' ? 20 : c.wound === 'LIGHT' ? 10 : 0;
  if (['隐匿', '攀爬', '潜入行动'].includes(skill)) penalty += Math.max(0, load - (3 + Math.floor(character.attributes['体能'] / 10))) * 10;
  const target = Math.max(0, Math.min(100, (c.skill_overrides[skill] ?? stat(pkg, id, skill)) + Math.max(-20, Math.min(20, bonus)) - penalty));
  const advantage = advantageFor(c, skill);
  const roll = rng.d100(advantage), result = tier(target, roll, c.pressure >= 7 || c.pollution >= 1 || state.alarm >= 2);
  if (!state.ledger && ['CRITICAL', 'SUCCESS', 'COSTLY'].includes(result) && !c.used_successful_skills.includes(skill)) c.used_successful_skills.push(skill);
  return { character_id: id, skill, target, roll, tier: result };
}
function pressure(c, delta) {
  const before = c.pressure; c.pressure = Math.max(0, Math.min(10, before + delta));
  if (before < 10 && c.pressure === 10) c.collapse = 'PENDING';
  if (c.pressure <= 7) c.collapse = 'NONE';
}
function patrolAdvance(state, region, points = 1) {
  if (!Object.hasOwn(state.patrol, region)) return;
  state.patrol[region] = Math.min(4, state.patrol[region] + points);
  if (state.patrol[region] === 4 && !state.encountered.includes(region)) state.encountered.push(region);
}
function startPursuit(state) {
  // A new pursuit starts at zero; the active pursuit keeps its earned distance.
  if (!state.pursuit) { state.pursuit = true; state.distance = 0; }
}
function expose(state, points = 1, region = null) {
  state.exposure += points;
  patrolAdvance(state, region, points);
  state.alarm = Math.max(state.alarm, state.exposure >= 8 ? 3 : state.exposure >= 5 ? 2 : state.exposure >= 2 ? 1 : 0);
  if (state.alarm === 3) startPursuit(state);
}
function clock(pkg, state, minutes) {
  const before = state.minute; state.minute += minutes;
  for (const [id, c] of Object.entries(state.actors)) {
    if (c.exited) continue;
    if (c.bleeding) c.fatigue = Math.min(10, c.fatigue + Math.floor(minutes / 10));
    c.fatigue = Math.min(10, c.fatigue + Math.floor((state.minute - 1200) / 240) - Math.floor((before - 1200) / 240));
    const actor = pkg.characters.characters.find((x) => x.character_id === id);
    const load = c.equipment.reduce((sum, item) => sum + pkg.parameters.inventory.shop.find((x) => x.item_id === item).load, 0);
    if (load > 3 + Math.floor(actor.attributes['体能'] / 10)) c.fatigue = Math.min(10, c.fatigue + Math.floor((state.minute - 1200) / 120) - Math.floor((before - 1200) / 120));
  }
  if (!state.scheduled_patrol_fired && before <= 1320 && state.minute >= 1320) {
    state.scheduled_patrol_fired = true;
    // World pressure advances in its own area, even if PCs skip the scene.
    state.patrol.office = 4; if (!state.encountered.includes('office')) state.encountered.push('office');
  }
  if (state.minute > pkg.parameters.clock.deadline_minute && state.mission === 'OPEN') { state.alarm = 3; startPursuit(state); }
}
function success(result) { return ['CRITICAL', 'SUCCESS', 'COSTLY'].includes(result.tier); }
function consequences(pkg, state, id, result, cost) {
  const c = state.actors[id];
  if (result.tier === 'COSTLY') {
    if (cost === 'time') clock(pkg, state, 10); else if (cost === 'pressure') pressure(c, 1);
    else if (cost === 'resource') { requireContent(c.equipment.includes('supplies'), 'COST_RESOURCE_EMPTY'); c.equipment.splice(c.equipment.indexOf('supplies'), 1); }
    else expose(state, 1, c.position);
  } else if (!success(result)) {
    expose(state, 1, c.position); pressure(c, 1);
    if (result.tier === 'CATASTROPHE') { if (c.wound === 'NONE') c.wound = 'LIGHT'; state.alarm = Math.min(3, state.alarm + 1); }
  }
}

function advantageFor(c, skill) {
  // One extra tens die at most; advantage and disadvantage cancel.
  return Number(c.specialty === skill) - Number(c.collapse === 'ACTIVE');
}
function addKnowledge(pkg, state, id, fact) {
  const c = state.actors[id];
  if (!c.knowledge.some((row) => row.fact_id === fact)) c.knowledge.push({fact_id: fact, status: 'SEEN',
    text: pkg.gm.knowledge_facts[fact].observation, minute: state.minute, verdict: null});
}

function clearNPC(state, npc) {
  if (!state.cleared_npcs.includes(npc)) state.cleared_npcs.push(npc);
  // Another character's own successful action can end this actual engagement.
  for (const c of Object.values(state.actors)) if (c.melee_target === npc) c.melee_target = null;
}
function requireMeleeIntent(state, id, kind, parameters) {
  const c = state.actors[id];
  if (c.melee_target !== null) {
    requireContent(['FIRE','TAKEDOWN'].includes(kind), 'MELEE_FOLLOWUP_REQUIRED');
    requireContent(parameters.npc_id === c.melee_target, 'MELEE_FOLLOWUP_TARGET');
  }
  if (kind === 'MOVE' && parameters.group === true) {
    const members = CHARS.filter((other) => other === id || state.actors[other].follower_of === id &&
      state.actors[other].position === c.position);
    requireContent(members.every((other) => state.actors[other].melee_target === null), 'MELEE_GROUP_MEMBER_ENGAGED');
  }
}

// A request count is derived from game-owned state, never from a provider's
// roll or count. Apply checks the same draw arity before returning any state.
export function requiredCoreDrawCount(pkg, state, action) {
  validateState(pkg, state); exactKeys(action, ['actor_id', 'action_type', 'payload'], 'ACTION_FIELDS');
  const t = action.action_type;
  requireContent(action.actor_id === 'GM' || CHARS.includes(action.actor_id), 'ACTOR');
  requireContent(Object.hasOwn(pkg.contract.action_types, t), 'ACTION_TYPE');
  requireContent(state.unresolved_blocking === 0 || ['SAFETY_PAUSE','SAFETY_CONSENT','SAFETY_RESUME'].includes(t), 'ADJUDICATION_REQUIRED');
  if (t !== 'SAFETY_PAUSE') requireContent(action.actor_id === 'GM' ? !['PLAYER_INTENT','SIGN_LEDGER','SAFETY_CONSENT'].includes(t) : ['PLAYER_INTENT','SIGN_LEDGER','SAFETY_CONSENT'].includes(t), 'ACTOR_ROLE');
  if (t === 'NPC_ATTACK' || t === 'ROLL_REST_EVENT') return 2;
  if (t === 'RESOLVE_REST_RISK') {
    exactKeys(action.payload, ['character_id']); const c = state.actors[action.payload.character_id];
    requireContent(c, 'ACTOR'); return advantageFor(c, '抵抗污染') ? 3 : 2;
  }
  if (t !== 'PLAYER_INTENT') return 0;
  requireContent(action.actor_id !== 'GM', 'ACTOR_ROLE');
  exactKeys(action.payload, ['kind', 'parameters', 'cost_choice', 'text']);
  let { kind, parameters } = action.payload; const c = state.actors[action.actor_id];
  requireContent(Object.hasOwn(PARAM_KEYS, kind), 'INTENT'); exactKeys(parameters, PARAM_KEYS[kind], 'INTENT_PARAMETERS');
  requireMeleeIntent(state, action.actor_id, kind, parameters);
  const pushed = kind === 'PUSH';
  if (pushed) { requireContent(c.last_check, 'PUSH_PRECONDITION'); ({kind, parameters} = c.last_check); if (kind === 'MOVE') parameters = {...parameters,group:false}; }
  const count = (id, skill) => advantageFor(state.actors[id], skill) ? 3 : 2;
  if (kind === 'SOOTHE' || kind === 'GROW') return 1;
  if (kind === 'MOVE') {
    requireContent(typeof parameters.group === 'boolean', 'MOVEMENT');
    const arrival = state.minute + (pushed ? 0 : pkg.parameters.clock.move_minutes);
    if (arrival >= pkg.parameters.clock.handoff_minute && arrival < pkg.parameters.clock.handoff_minute+pkg.parameters.clock.handoff_window_minutes) return 0;
    if (['outside', 'shaft', 'roof'].includes(parameters.to)) return 0;
    return (parameters.group ? CHARS.filter((id) => id === action.actor_id || state.actors[id].follower_of === action.actor_id && state.actors[id].position === c.position) : [action.actor_id]).reduce((n, id) => n + count(id, '隐匿'), 0);
  }
  if (['CHASE', 'TAKEDOWN', 'DOOR_SOCIAL'].includes(kind)) return count(action.actor_id, kind === 'CHASE' ? parameters.skill : pkg.parameters.mission.skills[kind]) + 2;
  if (['OBSERVE', 'ELECTRONIC_RECON', 'SOCIAL_RECON', 'AVOID', 'DOOR_ELECTRONIC', 'LOCKPICK', 'LOCK_ELECTRONIC', 'SEARCH', 'FIRE'].includes(kind)) return count(action.actor_id, pkg.parameters.mission.skills[kind]);
  return 0;
}

export function applyAction(pkg, previous, action, draws = []) {
  validateState(pkg, previous); exactKeys(action, ['actor_id', 'action_type', 'payload'], 'ACTION_FIELDS');
  requireContent(action.actor_id === 'GM' || CHARS.includes(action.actor_id), 'ACTOR');
  requireContent(Object.hasOwn(pkg.contract.action_types, action.action_type), 'ACTION_TYPE');
  requireContent(previous.unresolved_blocking === 0 || ['SAFETY_PAUSE','SAFETY_CONSENT','SAFETY_RESUME'].includes(action.action_type), 'ADJUDICATION_REQUIRED');
  requireContent(Array.isArray(draws) && draws.length <= 32 && Buffer.byteLength(canonical(action.payload)) <= 1024, 'ACTION_LIMIT');
  const state = clone(previous), rng = consume(draws), resolutions = [];
  const previousSuccessful = Object.fromEntries(CHARS.map((id) => [id,[...state.actors[id].used_successful_skills]]));
  requireContent(!state.paused || ['SAFETY_PAUSE', 'SAFETY_CONSENT', 'SAFETY_RESUME'].includes(action.action_type), 'SAFETY_PAUSED');
  const gm = action.actor_id === 'GM';
  if (action.action_type === 'SAFETY_PAUSE') { exactKeys(action.payload, []); state.paused = true; state.safety_consents = []; }
  else if (action.action_type === 'SAFETY_CONSENT') {
    requireContent(!gm && state.paused && !state.safety_consents.includes(action.actor_id), 'SAFETY_CONSENT_PRECONDITION');
    exactKeys(action.payload, []); state.safety_consents.push(action.actor_id); state.safety_consents.sort();
  }
  else if (action.action_type === 'SAFETY_RESUME') {
    requireContent(gm && state.paused, 'ACTOR_ROLE'); exactKeys(action.payload, []);
    requireContent(canonical(state.safety_consents) === canonical(CHARS), 'SAFETY_RECONSENT'); state.paused = false;
  } else if (action.action_type === 'RELEASE_HANDOUTS') {
    requireContent(gm, 'ACTOR_ROLE'); exactKeys(action.payload, ['handout_ids']);
    requireContent(Array.isArray(action.payload.handout_ids) && action.payload.handout_ids.length > 0 &&
      new Set(action.payload.handout_ids).size === action.payload.handout_ids.length &&
      action.payload.handout_ids.every((id) => ['dispatch', 'visitor', 'patrol'].includes(id)), 'HANDOUT_RELEASE');
    state.released_handouts = [...new Set([...state.released_handouts, ...action.payload.handout_ids])].sort();
  } else if (action.action_type === 'NPC_ATTACK') {
    requireContent(gm && state.combat_active && !state.ledger, 'NPC_ATTACK_PRECONDITION'); exactKeys(action.payload, ['npc_id', 'character_id']);
    const { npc_id: npc, character_id: target } = action.payload, n = pkg.gm.npcs[npc], c = state.actors[target];
    requireContent(n && n.pistol !== null && c && !c.exited && n.areas.includes(c.position) &&
      !state.cleared_npcs.includes(npc) && state.npc_ammo[npc] > 0, 'NPC_ATTACK_TARGET');
    const value = Math.max(0, n.pistol - (state.npc_wounds[npc] === 'HEAVY' ? 20 : state.npc_wounds[npc] === 'LIGHT' ? 10 : 0));
    const roll = rng.d100(), result = { npc_id: npc, target: value, roll, tier: tier(value, roll, state.alarm >= 2) }; resolutions.push(result);
    state.npc_ammo[npc]--; state.alarm = Math.min(3, state.alarm + 1);
    if (success(result)) { c.wound = pkg.parameters.combat_prototype.teaching_npc_attack_harm_cap === 2 ? 'HEAVY' : 'LIGHT'; c.bleeding = c.wound === 'HEAVY'; } else pressure(c, 1);
    if (state.alarm === 3) startPursuit(state);
  } else if (action.action_type === 'VERIFY_KNOWLEDGE') {
    requireContent(gm && !state.ledger, 'KNOWLEDGE_VERIFICATION_PHASE'); exactKeys(action.payload, ['character_id','fact_id']);
    const c = state.actors[action.payload.character_id], fact = pkg.gm.knowledge_facts[action.payload.fact_id];
    requireContent(c && fact, 'KNOWLEDGE_FACT'); const row = c.knowledge.find((x) => x.fact_id === action.payload.fact_id);
    requireContent(row && row.status === 'SEEN', 'KNOWLEDGE_NOT_OBSERVED'); row.status = fact.truth ? 'VERIFIED' : 'REFUTED'; row.verdict = fact.truth;
  } else if (action.action_type === 'ISSUE_POLLUTION_NOTE') {
    requireContent(gm, 'ACTOR_ROLE'); exactKeys(action.payload, ['character_id','note_id']); const c = state.actors[action.payload.character_id];
    requireContent(c && c.pollution_notes.some((note) => note.text === null) && Object.hasOwn(pkg.gm.pollution_note_templates,action.payload.note_id) && c.knowledge.length < 16, 'POLLUTION_NOTE_PRECONDITION');
    const note = c.pollution_notes.find((note) => note.text === null); note.note_id = action.payload.note_id; note.text = pkg.gm.pollution_note_templates[note.note_id]; c.pollution_note_count++;
    c.knowledge.push({fact_id: `T0-NOTE-${note.number}`, status: 'SEEN', text: note.text, minute: state.minute, verdict: null});
  } else if (action.action_type === 'SIGN_LEDGER') {
    requireContent(!gm && state.ledger && !state.actors[action.actor_id].signed, 'SIGN_PRECONDITION'); exactKeys(action.payload, []); state.actors[action.actor_id].signed = true;
  } else if (action.action_type === 'SETTLE_MISSION') {
    requireContent(gm && state.mission !== 'OPEN' && !state.ledger && CHARS.every((id) => state.actors[id].exited), 'SETTLEMENT_PRECONDITION'); exactKeys(action.payload, []);
    state.supplies = state.mission === 'DELIVERED_ON_TIME' ? pkg.parameters.reward.team_points_on_time : state.mission === 'DELIVERED_LATE' ? pkg.parameters.reward.team_points_late : pkg.parameters.reward.team_points_not_delivered;
    for (const c of Object.values(state.actors)) { c.rest_points = pkg.parameters.mission.rest_action_points; c.plan_points = 0; pressure(c, 1); }
    state.ledger = { delivery: state.mission,
      costs: Object.fromEntries(CHARS.map((id) => [id, { pressure: state.actors[id].pressure, fatigue: state.actors[id].fatigue,
        pollution: state.actors[id].pollution, wound: state.actors[id].wound }])), reward: state.supplies,
      long_thread: pkg.gm.settlement_anomaly, achievement: 'NONE' };
  } else if (action.action_type === 'ROLL_REST_EVENT') {
    requireContent(gm && state.ledger && !state.rest_event && Object.values(state.actors).every((c) => c.rest_points === 0), 'REST_EVENT_PRECONDITION'); exactKeys(action.payload, []);
    const roll = rng.d100(); state.rest_event = { roll, kind: roll <= 90 ? 'NORMAL' : roll <= 95 ? 'MINOR' : 'RISK' }; state.risk_queue = roll >= 96 ? [...CHARS] : [];
  } else if (action.action_type === 'RESOLVE_REST_RISK') {
    requireContent(gm && state.risk_queue.length > 0, 'REST_RISK_PRECONDITION'); exactKeys(action.payload, ['character_id']);
    requireContent(action.payload.character_id === state.risk_queue[0], 'REST_RISK_ORDER');
    const id = state.risk_queue.shift(), result = check(pkg, state, id, '抵抗污染', rng); resolutions.push(result);
    const effect = pkg.parameters.rest_risk.effects[result.tier], c = state.actors[id];
    const delta = Math.min(10 - c.pollution, effect.pollution); c.pollution += delta;
    for (let n = 0; n < delta; n++) c.pollution_notes.push({number: c.pollution_notes.length+1, source: 'REST_RISK', text: null, note_id: null});
    pressure(c, effect.pressure);
  } else {
    requireContent(!gm && action.action_type === 'PLAYER_INTENT', 'ACTOR_ROLE');
    exactKeys(action.payload, ['kind', 'parameters', 'cost_choice', 'text']); let { kind, parameters, cost_choice: cost, text } = action.payload;
    requireContent(Object.hasOwn(PARAM_KEYS, kind) && ['exposure', 'time', 'resource', 'pressure'].includes(cost) &&
      typeof text === 'string' && text.isWellFormed() && Buffer.byteLength(text) <= 320, 'INTENT'); exactKeys(parameters, PARAM_KEYS[kind], 'INTENT_PARAMETERS');
    requireContent(kind !== 'OTHER', 'ADJUDICATION_REQUIRED');
    const id = action.actor_id, c = state.actors[id]; let pushed = false;
    requireMeleeIntent(state, id, kind, parameters);
    if (kind === 'PUSH') {
      requireContent(c.last_check && !c.last_check.pushed && c.last_check.result === 'FAILURE' && c.collapse !== 'ACTIVE' && !state.ledger, 'PUSH_PRECONDITION');
      requireContent(requiredCoreDrawCount(pkg, previous, action) >= 2, 'PUSH_NO_CHECK');
      kind = c.last_check.kind; parameters = clone(c.last_check.parameters); cost = c.last_check.cost_choice; pushed = true;
      if (kind === 'MOVE') parameters.group = false; pressure(c, 1);
    }
    const resting = REST_KINDS.includes(kind);
    requireContent(resting ? state.ledger && c.rest_points > 0 : kind === 'GROW' ? state.ledger && !c.growth_done : !state.ledger && !c.exited, 'PHASE_PRECONDITION');
    requireContent(c.pollution < 10 && c.wound !== 'LETHAL', 'CHARACTER_UNAVAILABLE');
    requireContent(!['OBSERVE','ELECTRONIC_RECON','SOCIAL_RECON','TAKEDOWN'].includes(kind) || cost === 'exposure', 'RULE_COST_UNAVAILABLE');
    requireContent(kind !== 'FIRE' || ['exposure','resource'].includes(cost), 'RULE_COST_UNAVAILABLE');
    const risky = requiredCoreDrawCount(pkg, previous, action) >= 2;
    requireContent(!risky || cost !== 'resource' || (kind === 'FIRE' ? c.equipment.filter((item) => item === 'ammo').length >= 2 : c.equipment.includes('supplies')), 'COST_RESOURCE_EMPTY');
    if (kind === 'PLAN') { requireContent(c.position === 'outside', 'LOCATION'); }
    else if (kind === 'WAIT') { requireContent(Number.isInteger(parameters.minutes) && parameters.minutes >= 1 && parameters.minutes <= 30, 'WAIT_DURATION'); clock(pkg, state, parameters.minutes); }
    else if (kind === 'FOLLOW') {
      requireContent(parameters.leader_id === null || CHARS.includes(parameters.leader_id) && parameters.leader_id !== id && state.actors[parameters.leader_id].follower_of === null &&
        !state.actors[parameters.leader_id].exited && !CHARS.some((other) => state.actors[other].follower_of === id), 'FOLLOW_TARGET');
      requireContent(parameters.leader_id === null || state.actors[parameters.leader_id].position === c.position, 'FOLLOW_LOCATION'); c.follower_of = parameters.leader_id; c.follow_cost = parameters.leader_id === null ? null : cost;
    } else if (kind === 'EQUIP') {
      requireContent(!c.equipment_issued, 'EQUIPMENT_ALREADY_ISSUED');
      requireContent(c.position === 'outside', 'LOCATION'); requireContent(Array.isArray(parameters.items) && parameters.items.length <= 9 &&
        parameters.items.every((item) => pkg.parameters.inventory.shop.some((x) => x.item_id === item)), 'EQUIPMENT');
      for (const item of parameters.items) requireContent(parameters.items.filter((x) => x === item).length <= 3, 'EQUIPMENT_QUANTITY');
      requireContent(parameters.specialty === null || Object.hasOwn(pkg.parameters.core.skill_attributes, parameters.specialty) && stat(pkg, id, parameters.specialty) >= 55, 'SPECIALTY');
      requireContent(c.specialty === null || c.specialty === parameters.specialty, 'SPECIALTY_RESET'); c.equipment = [...parameters.items]; c.specialty = parameters.specialty; c.equipment_issued = true;
    } else if (kind === 'ASSIST') {
      requireContent(CHARS.includes(parameters.character_id) && parameters.character_id !== id &&
        Object.hasOwn(pkg.parameters.core.skill_attributes, parameters.skill) && stat(pkg, id, parameters.skill) >= 40 &&
        state.actors[parameters.character_id].position === c.position, 'ASSIST_PRECONDITION');
      state.assistants[id] = clone(parameters);
    } else if (['OBSERVE', 'ELECTRONIC_RECON', 'SOCIAL_RECON'].includes(kind)) {
      requireContent(['outside', 'lobby'].includes(c.position) && (pushed || !state.recon.includes(kind)), 'RECON_PRECONDITION');
      const result = check(pkg, state, id, pkg.parameters.mission.skills[kind], rng); resolutions.push(result);
      if (!pushed) { state.recon.push(kind); clock(pkg, state, 30); }
      state.intel[kind] = result.tier === 'CRITICAL' ? 'PUBLIC_SEMI_DARK' : result.tier === 'SUCCESS' ? 'PUBLIC_SEMI' : 'PUBLIC';
      state.released_handouts = ['dispatch', 'patrol', 'visitor'];
      if (result.tier === 'CRITICAL') addKnowledge(pkg, state, id, 'T0-K-PLAN-COMPLETE');
      if (result.tier === 'COSTLY') expose(state, 1, c.position === 'outside' ? 'lobby' : c.position);
      else if (!success(result)) patrolAdvance(state, c.position === 'outside' ? 'lobby' : c.position);
    } else if (kind === 'MOVE') {
      requireContent(typeof parameters.group === 'boolean' && pkg.parameters.mission.links.some((edge) => edge.includes(c.position) && edge.includes(parameters.to)) && parameters.to !== c.position, 'MOVEMENT');
      const arrival = state.minute + (pushed ? 0 : pkg.parameters.clock.move_minutes);
      const handoff = arrival >= pkg.parameters.clock.handoff_minute && arrival < pkg.parameters.clock.handoff_minute + pkg.parameters.clock.handoff_window_minutes;
      requireContent(parameters.to !== 'machine' || state.door_clear || handoff, 'DOOR_CLOSED');
      const members = parameters.group ? CHARS.filter((member) => member === id || state.actors[member].follower_of === id && state.actors[member].position === c.position) : [id];
      if (!pushed) clock(pkg, state, pkg.parameters.clock.move_minutes);
      for (const member of members) {
        const actor = state.actors[member]; requireContent(actor.pollution < 10 && actor.wound !== 'LETHAL', 'CHARACTER_UNAVAILABLE');
        const risk = !handoff && !['outside', 'shaft', 'roof'].includes(parameters.to);
        requireContent(!risk || (member === id ? cost : actor.follow_cost) !== 'resource' || actor.equipment.includes('supplies'), 'COST_RESOURCE_EMPTY');
        const result = risk ? check(pkg, state, member, '隐匿', rng) : { tier: 'SUCCESS' };
        if (risk) {
          resolutions.push(result); consequences(pkg, state, member, result, member === id ? cost : actor.follow_cost);
          if (member !== id) actor.last_check = {kind:'MOVE',parameters:{to:parameters.to,group:false},
            cost_choice:actor.follow_cost,result:result.tier,pushed:false};
        }
        if (success(result)) { actor.position = parameters.to; if (actor.collapse === 'PENDING') actor.collapse = 'ACTIVE'; }
      }
    } else if (kind === 'WITHDRAW') {
      requireContent(['outside', 'lobby', 'roof'].includes(c.position), 'WITHDRAW_LOCATION');
      requireContent(!state.pursuit || state.distance >= 3, 'PURSUIT_UNRESOLVED');
      if (state.target_holder === id) { state.target_holder = null; state.target_dropped_at = c.position; }
      c.position = 'safehouse'; c.exited = true; c.follower_of = null; c.follow_cost = null;
      if (CHARS.every((id) => state.actors[id].exited) && state.mission === 'OPEN') state.mission = 'WITHDREW_NOT_DELIVERED';
    } else if (kind === 'DELIVER') {
      requireContent(c.position === 'roof' && state.target_acquired && state.target_holder === id && !state.target_delivered && (!state.pursuit || state.distance >= 3), 'DELIVERY_PRECONDITION');
      state.target_delivered = true; state.target_holder = null; state.mission = state.minute <= 1440 ? 'DELIVERED_ON_TIME' : 'DELIVERED_LATE';
      c.position = 'safehouse'; c.exited = true; c.follower_of = null; c.follow_cost = null;
    } else if (kind === 'DROP_TARGET') {
      requireContent(state.target_holder === id && !state.target_delivered, 'TARGET_HOLDER'); state.target_holder = null; state.target_dropped_at = c.position;
    } else if (kind === 'TAKE_TARGET') {
      requireContent(state.target_acquired && !state.target_delivered && state.target_holder === null && state.target_dropped_at === c.position, 'TARGET_HOLDER'); state.target_holder = id; state.target_dropped_at = null;
    } else if (kind === 'SPEND_PLAN') {
      requireContent(c.plan_points > 0 && typeof parameters.detail === 'string' && parameters.detail.length > 0 && Buffer.byteLength(parameters.detail) <= 160 &&
        pkg.parameters.inventory.shop.some((x) => x.item_id === parameters.item_id) && c.equipment.length < 9 && c.equipment.filter((x) => x === parameters.item_id).length < 3, 'PLAN_DETAIL');
      c.equipment.push(parameters.item_id); c.plan_points--;
    } else if (kind === 'GROW') {
      requireContent(c.used_successful_skills.includes(parameters.skill) && Object.hasOwn(pkg.parameters.core.skill_attributes, parameters.skill), 'GROWTH_SKILL');
      const old = c.skill_overrides[parameters.skill] ?? stat(pkg, id, parameters.skill), delta = rng.die(3);
      c.skill_overrides[parameters.skill] = old >= 65 ? old : Math.min(65, old + delta); c.growth_done = true;
    } else if (kind === 'DECLINE_REST') { c.rest_points = 0; }
    else if (kind === 'SOOTHE') { pressure(c, -rng.die(3)); c.rest_points--; }
    else if (kind === 'TREAT_WOUND') {
      requireContent(c.wound !== 'LETHAL', 'REVERSAL_REQUIRED'); c.bleeding = false; c.rest_points--;
    } else if (kind === 'CONTACT') { requireContent(c.bond_damaged, 'BOND_NOT_DAMAGED'); c.bond_damaged = false; c.rest_points--; }
    else if (kind === 'ARCHIVE') {
      c.rest_points--;
      if (!c.knowledge_growth_done && c.knowledge.some((row) => ['VERIFIED','REFUTED'].includes(row.status))) {
        const value = c.skill_overrides['异常学'] ?? stat(pkg, id, '异常学'); c.skill_overrides['异常学'] = Math.min(80, value+2); c.knowledge_growth_done = true;
      }
    }
    else if (kind === 'REPLENISH') {
      const item = pkg.parameters.inventory.shop.find((x) => x.item_id === parameters.item_id); requireContent(item && state.supplies >= item.team_supply_cost && c.equipment.filter((x) => x === item.item_id).length < item.max_quantity && c.equipment.length < 9, 'SHOP_PRECONDITION');
      state.supplies -= item.team_supply_cost; c.equipment.push(item.item_id); c.rest_points--;
    } else if (kind === 'AVOID') {
      requireContent(state.encountered.includes(c.position), 'NO_ENCOUNTER'); const result = check(pkg, state, id, '隐匿', rng); resolutions.push(result); if (!pushed) clock(pkg, state, 10); consequences(pkg, state, id, result, cost);
      if (success(result)) { state.patrol[c.position] = 0; state.encountered = state.encountered.filter((a) => a !== c.position); }
    } else if (kind === 'CHASE') {
      requireContent(state.pursuit && ['反侦察', '驾驶'].includes(parameters.skill), 'NO_PURSUIT');
      const result = check(pkg, state, id, parameters.skill, rng, 0, state.alarm === 3 ? 20 : 0), npcTarget = pkg.gm.npcs[pkg.gm.pursuer_binding].observation;
      const defender = { target: npcTarget, roll: rng.d100() }; defender.tier = tier(npcTarget, defender.roll, state.alarm >= 2); resolutions.push(result, defender); if (!pushed) clock(pkg, state, 10);
      const bothFail = TIERS.indexOf(result.tier) <= 1 && TIERS.indexOf(defender.tier) <= 1;
      const win = !bothFail && (TIERS.indexOf(result.tier) > TIERS.indexOf(defender.tier) || result.tier === defender.tier && result.target > defender.target);
      if (win) { state.distance++; if (result.tier === 'COSTLY') consequences(pkg, state, id, result, cost); }
      else { if (!bothFail) state.distance = Math.max(0, state.distance - 1); expose(state, 1, c.position); }
      if (!win && !previousSuccessful[id].includes(result.skill)) c.used_successful_skills = c.used_successful_skills.filter((skill) => skill !== result.skill);
      if (state.distance >= 3) state.pursuit = false;
    } else if (['DOOR_ELECTRONIC', 'DOOR_SOCIAL', 'LOCKPICK', 'LOCK_ELECTRONIC', 'SEARCH', 'TAKEDOWN', 'FIRE'].includes(kind)) {
      requireContent((['TAKEDOWN','FIRE'].includes(kind) ? ['lobby','office','machine','shaft'] : ['office','machine']).includes(c.position), 'LOCATION');
      if (['DOOR_ELECTRONIC','DOOR_SOCIAL'].includes(kind)) requireContent(c.position === 'office' && !state.door_clear, 'DOOR_PRECONDITION');
      if (['LOCKPICK', 'LOCK_ELECTRONIC'].includes(kind)) requireContent(c.position === 'machine' && !state.target_acquired, 'TARGET_PRECONDITION');
      const result = check(pkg, state, id, pkg.parameters.mission.skills[kind], rng, 0,
        kind === 'TAKEDOWN' && c.melee_target !== null ? TAKEDOWN_RETRY_PENALTY : 0);
      resolutions.push(result); if (!pushed) clock(pkg, state, 10);
      let achieved = success(result);
      if (['DOOR_SOCIAL', 'TAKEDOWN'].includes(kind)) {
        const npc = kind === 'TAKEDOWN' ? parameters.npc_id : 'machine_guard'; requireContent(Object.hasOwn(pkg.gm.npcs, npc) && !state.cleared_npcs.includes(npc) &&
          (kind === 'DOOR_SOCIAL' ? c.position === 'office' : pkg.gm.npcs[npc].areas.includes(c.position)), 'NPC');
        // A legal retry fulfils the old B4 next-action obligation. Only a
        // fresh ordinary opposed loss below creates another; catastrophe
        // follows its separate wound/alarm branch without retaining the old one.
        if (kind === 'TAKEDOWN') c.melee_target = null;
        const target = pkg.gm.npcs[npc].observation, roll = rng.d100(), defended = { target, roll, tier: tier(target, roll, state.alarm >= 2) }; resolutions.push(defended);
        achieved = TIERS.indexOf(result.tier) > 1 && (TIERS.indexOf(result.tier) > TIERS.indexOf(defended.tier) || result.tier === defended.tier && result.target > target);
        if (achieved) clearNPC(state, npc);
        else if (kind === 'TAKEDOWN' && result.tier !== 'CATASTROPHE') {
          // B4 / UNR-RULE-0030: the next own primary action must address this
          // opponent by FIRE or a retry at -20; no automatic player choice.
          state.combat_active = true; c.melee_target = npc;
        }
      }
      if (kind === 'FIRE') {
        requireContent(c.equipment.includes('pistol') && c.equipment.includes('ammo') && Object.hasOwn(pkg.gm.npcs, parameters.npc_id) &&
          pkg.gm.npcs[parameters.npc_id].areas.includes(c.position) && !state.cleared_npcs.includes(parameters.npc_id), 'WEAPON');
        c.equipment.splice(c.equipment.indexOf('ammo'), 1); state.alarm = Math.min(3, state.alarm + 1); state.combat_active = true;
        // B4 requires this next own primary action, not perpetual combat until
        // the NPC is cleared. A valid shot fulfils this actor's obligation.
        c.melee_target = null;
        if (state.alarm === 3) startPursuit(state);
        if (achieved) {
          state.npc_wounds[parameters.npc_id] = result.tier === 'CRITICAL' ? 'LETHAL' : 'HEAVY';
          if (result.tier === 'CRITICAL') clearNPC(state, parameters.npc_id);
        }
      }
      if (kind === 'FIRE' && result.tier === 'COSTLY') {
        if (cost === 'resource') c.equipment.splice(c.equipment.indexOf('ammo'),1); else expose(state,1,c.position);
      } else consequences(pkg, state, id,
        kind === 'TAKEDOWN' && !achieved && success(result) ? {...result,tier:'FAILURE'} : result, cost);
      if (!achieved && !previousSuccessful[id].includes(result.skill)) c.used_successful_skills = c.used_successful_skills.filter((skill) => skill !== result.skill);
      if (achieved && ['DOOR_ELECTRONIC', 'DOOR_SOCIAL'].includes(kind)) { state.door_clear = true; clearNPC(state, 'machine_guard'); }
      if (achieved && ['LOCKPICK', 'LOCK_ELECTRONIC'].includes(kind)) { state.target_acquired = true; state.target_holder = id; }
      if (achieved && kind === 'SEARCH' && result.tier === 'CRITICAL') addKnowledge(pkg, state, id, 'T0-K-MONITOR-EMPTY');
      if (!achieved && c.position === 'machine' && !state.cleared_npcs.includes('machine_guard')) expose(state, 1, c.position);
    } else throw new ContentError('ADJUDICATION_REQUIRED');
    const primaryResult = resolutions.find((result) => result.character_id === id);
    if (primaryResult) {
      c.last_check = { kind, parameters: clone(parameters), cost_choice: cost, result: primaryResult.tier, pushed };
      if (pushed && !success(primaryResult)) expose(state, 1, c.position);
    }
  }
  rng.done(); requireContent(draws.length === requiredCoreDrawCount(pkg, previous, action), 'CORE_DRAW_COUNT');
  validateState(pkg, state); return deepFreeze({ state, resolutions });
}

export function complete(pkg, state) {
  validateState(pkg, state);
  return state.mission !== 'OPEN' && state.ledger !== null && Object.keys(state.ledger).length === 5 &&
    CHARS.every((id) => state.actors[id].signed && state.actors[id].rest_points === 0 && state.actors[id].melee_target === null) && state.rest_event !== null &&
    state.risk_queue.length === 0 && CHARS.every((id) => state.actors[id].pollution_notes.every((note) => note.text !== null)) && state.pending_intent === null && !state.paused && state.unresolved_blocking === 0;
}
