import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export class ContentError extends Error {
  constructor(code) { super(code); this.code = code; }
}
export function requireContent(condition, code = 'INVALID_CONTENT') {
  if (!condition) throw new ContentError(code);
}
export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const clone = (value) => JSON.parse(JSON.stringify(value));
export const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
export function exactKeys(value, keys, code = 'INVALID_FIELDS') {
  requireContent(object(value) && Object.keys(value).sort().join('\0') === [...keys].sort().join('\0'), code);
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value)) {
    requireContent(Object.keys(value).every((key) => key.isWellFormed()), 'INVALID_UNICODE');
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  requireContent(value === null || typeof value === 'boolean' ||
    typeof value === 'string' && value.isWellFormed() || Number.isSafeInteger(value) && !Object.is(value, -0), 'INVALID_JSON_VALUE');
  return JSON.stringify(value);
}
export function deepFreeze(value) {
  if (value && typeof value === 'object') { for (const v of Object.values(value)) deepFreeze(v); Object.freeze(value); }
  return value;
}

// Bounded strict integer-JSON reader. Duplicate keys, casing aliases, trailing
// bytes, invalid UTF-8, lone surrogates and lossy numbers cannot supply content.
export function parseStrict(input, maxBytes = 2 * 1024 * 1024) {
  const bytes = typeof input === 'string' ? Buffer.from(input) : input;
  requireContent(bytes instanceof Uint8Array && bytes.length <= maxBytes, 'JSON_LIMIT');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new ContentError('INVALID_UTF8'); }
  let i = 0, nodes = 0;
  const space = () => { while (i < text.length && /[\t\r\n ]/u.test(text[i])) i++; };
  function string() {
    requireContent(text[i] === '"', 'INVALID_JSON');
    const start = i++;
    while (i < text.length) {
      const c = text[i++];
      if (c === '\\') { requireContent(i < text.length, 'INVALID_JSON'); i++; }
      else if (c === '"') {
        let value;
        try { value = JSON.parse(text.slice(start, i)); } catch { throw new ContentError('INVALID_JSON'); }
        requireContent(value.isWellFormed(), 'INVALID_UNICODE');
        return value;
      }
    }
    throw new ContentError('INVALID_JSON');
  }
  function value(depth) {
    requireContent(depth <= 32 && ++nodes <= 100000, 'JSON_LIMIT'); space();
    if (text[i] === '"') return string();
    if (text[i] === '{') {
      i++; space(); const result = Object.create(null), seen = new Set();
      if (text[i] === '}') { i++; return result; }
      while (true) {
        space(); const key = string(); requireContent(!seen.has(key), 'DUPLICATE_JSON_KEY'); seen.add(key);
        space(); requireContent(text[i++] === ':', 'INVALID_JSON'); result[key] = value(depth + 1); space();
        const end = text[i++]; if (end === '}') return result; requireContent(end === ',', 'INVALID_JSON');
      }
    }
    if (text[i] === '[') {
      i++; space(); const result = []; if (text[i] === ']') { i++; return result; }
      while (true) {
        result.push(value(depth + 1)); space(); const end = text[i++];
        if (end === ']') return result; requireContent(end === ',', 'INVALID_JSON');
      }
    }
    for (const [token, result] of [['null', null], ['true', true], ['false', false]]) {
      if (text.startsWith(token, i)) { i += token.length; return result; }
    }
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(text.slice(i));
    requireContent(match !== null, 'INVALID_JSON'); i += match[0].length;
    requireContent(/^-?(?:0|[1-9]\d*)$/u.test(match[0]), 'NON_INTEGER_JSON_NUMBER');
    const number = Number(match[0]); requireContent(Number.isSafeInteger(number) && !Object.is(number, -0), 'LOSSY_JSON_NUMBER');
    return number;
  }
  const result = value(0); space(); requireContent(i === text.length, 'TRAILING_JSON'); return result;
}

export function validPath(name) {
  return typeof name === 'string' && name.length <= 512 && /^[A-Za-z0-9_@+.-]+(?:\/[A-Za-z0-9_@+.-]+)*$/u.test(name) &&
    name.split('/').every((part) => part !== '.' && part !== '..');
}
export function readHeld(root, name, maxBytes = 2 * 1024 * 1024) {
  requireContent(validPath(name), 'UNSAFE_PATH');
  let current = path.resolve(root);
  requireContent(fs.lstatSync(current).isDirectory() && !fs.lstatSync(current).isSymbolicLink(), 'UNSAFE_ROOT');
  const parts = name.split('/');
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part); const st = fs.lstatSync(current);
    requireContent(st.isDirectory() && !st.isSymbolicLink(), 'SYMLINK_PATH');
  }
  const full = path.join(current, parts.at(-1));
  const named = fs.lstatSync(full);
  requireContent(named.isFile() && !named.isSymbolicLink(), 'NON_REGULAR_SOURCE');
  const fd = fs.openSync(full, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const before = fs.fstatSync(fd);
    requireContent(before.isFile() && before.size > 0 && before.size <= maxBytes, 'FILE_LIMIT');
    const bytes = fs.readFileSync(fd); const after = fs.fstatSync(fd), actual = fs.lstatSync(full);
    requireContent(bytes.length === before.size && before.ino === after.ino && before.dev === after.dev &&
      before.size === after.size && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs &&
      actual.isFile() && actual.ino === before.ino && actual.dev === before.dev, 'SOURCE_CHANGED');
    return bytes;
  } finally { fs.closeSync(fd); }
}
