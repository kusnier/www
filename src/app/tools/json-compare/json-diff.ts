export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };
export interface Difference {
  path: string;
  kind: 'added' | 'removed' | 'changed';
  before?: Json;
  after?: Json;
}

export const MAX_INPUT = 200_000;
export const MAX_DIFFERENCES = 500;

export function parseJson(input: string): Json {
  checkInput(input, 'JSON');
  return validateData(JSON.parse(input));
}

export function checkInput(input: string, format: string) {
  if (!input.trim()) throw new Error('Bitte ' + format + ' einfügen.');
  if (input.length > MAX_INPUT) throw new Error('Maximal 200.000 Zeichen pro Seite.');
}

export function validateData(value: unknown): Json {
  let remaining = MAX_INPUT;
  function validate(item: unknown, depth: number) {
    remaining -= typeof item === 'string' ? Math.max(1, item.length) : 1;
    if (remaining < 0) throw new Error('Die Daten sind nach dem Auflösen von Referenzen zu groß.');
    if (depth > 100) throw new Error('Die Daten sind zu tief verschachtelt (maximal 100 Ebenen).');
    if (typeof item === 'number' && (!Number.isFinite(item) || (Number.isInteger(item) && !Number.isSafeInteger(item)))) {
      throw new Error('Eine Zahl liegt außerhalb des sicher darstellbaren Bereichs. IDs kannst du als Zeichenketten vergleichen.');
    }
    if (item !== null && typeof item === 'object') {
      for (const child of Object.values(item)) validate(child, depth + 1);
    }
  }
  validate(value, 0);
  return value as Json;
}

function isObject(value: Json): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function compareJson(before: Json, after: Json): { differences: Difference[]; truncated: boolean } {
  const differences: Difference[] = [];

  function walk(left: Json | undefined, right: Json | undefined, path: string) {
    if (left === right || differences.length > MAX_DIFFERENCES) return;
    if (left === undefined) differences.push({ kind: 'added', path, after: right });
    else if (right === undefined) differences.push({ kind: 'removed', path, before: left });
    else if (Array.isArray(left) && Array.isArray(right)) {
      for (let i = 0; i < Math.max(left.length, right.length) && differences.length <= MAX_DIFFERENCES; i++) {
        walk(left[i], right[i], path + '[' + i + ']');
      }
    } else if (isObject(left) && isObject(right)) {
      for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
        if (differences.length > MAX_DIFFERENCES) break;
        walk(Object.hasOwn(left, key) ? left[key] : undefined, Object.hasOwn(right, key) ? right[key] : undefined,
          path + '[' + JSON.stringify(key) + ']');
      }
    } else differences.push({ kind: 'changed', path, before: left, after: right });
  }

  walk(before, after, '$');
  return { differences: differences.slice(0, MAX_DIFFERENCES), truncated: differences.length > MAX_DIFFERENCES };
}
