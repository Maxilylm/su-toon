// TOON (Token-Oriented Object Notation) converter

function indent(level: number): string {
  return '  '.repeat(level);
}

function needsQuotes(s: string): boolean {
  if (s === '') return true;
  if (s === 'true' || s === 'false' || s === 'null') return true;
  if (!isNaN(Number(s)) && s.trim() !== '') return true;
  return /[:|[\]{},\n\r]/.test(s);
}

function formatValue(val: unknown): string {
  if (val === null) return 'null';
  if (typeof val === 'boolean' || typeof val === 'number') return String(val);
  if (typeof val === 'string') {
    return needsQuotes(val) ? `"${val.replace(/"/g, '\\"')}"` : val;
  }
  return String(val);
}

function isUniformObjectArray(arr: unknown[]): string[] | null {
  if (arr.length === 0) return null;
  if (!arr.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))) {
    return null;
  }
  const keys = Object.keys(arr[0] as Record<string, unknown>);
  if (keys.length === 0) return null;
  for (const item of arr) {
    const itemKeys = Object.keys(item as Record<string, unknown>);
    if (itemKeys.length !== keys.length || !keys.every(k => itemKeys.includes(k))) {
      return null;
    }
  }
  return keys;
}

function isPrimitive(val: unknown): boolean {
  return val === null || typeof val !== 'object';
}

function isSimpleArray(arr: unknown[]): boolean {
  return arr.every(isPrimitive);
}

function jsonToToonLines(value: unknown, level: number): string[] {
  const lines: string[] = [];
  const pfx = indent(level);

  if (value === null || typeof value !== 'object') {
    lines.push(pfx + formatValue(value));
    return lines;
  }

  if (Array.isArray(value)) {
    const uniformKeys = isUniformObjectArray(value);
    if (uniformKeys) {
      lines.push(`${pfx}[${value.length}] {${uniformKeys.join(', ')}}`);
      for (const item of value) {
        const obj = item as Record<string, unknown>;
        const vals = uniformKeys.map(k => {
          const v = obj[k];
          if (typeof v === 'object' && v !== null) {
            // nested complex value — inline as JSON
            return JSON.stringify(v);
          }
          return formatValue(v);
        });
        lines.push(pfx + '  ' + vals.join(' | '));
      }
    } else if (isSimpleArray(value)) {
      lines.push(`${pfx}[${value.length}]`);
      for (const item of value) {
        lines.push(pfx + '  ' + formatValue(item));
      }
    } else {
      lines.push(`${pfx}[${value.length}]`);
      for (const item of value) {
        const sub = jsonToToonLines(item, level + 1);
        lines.push(...sub);
      }
    }
    return lines;
  }

  // Object
  const obj = value as Record<string, unknown>;
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || typeof val !== 'object') {
      lines.push(`${pfx}${key}: ${formatValue(val)}`);
    } else if (Array.isArray(val)) {
      const uniformKeys = isUniformObjectArray(val);
      if (uniformKeys) {
        lines.push(`${pfx}${key} [${val.length}] {${uniformKeys.join(', ')}}`);
        for (const item of val) {
          const row = item as Record<string, unknown>;
          const vals = uniformKeys.map(k => {
            const v = row[k];
            if (typeof v === 'object' && v !== null) return JSON.stringify(v);
            return formatValue(v);
          });
          lines.push(pfx + '  ' + vals.join(' | '));
        }
      } else if (isSimpleArray(val)) {
        lines.push(`${pfx}${key} [${val.length}]`);
        for (const item of val) {
          lines.push(pfx + '  ' + formatValue(item));
        }
      } else {
        lines.push(`${pfx}${key} [${val.length}]`);
        for (const item of val) {
          const sub = jsonToToonLines(item, level + 1);
          lines.push(...sub);
        }
      }
    } else {
      lines.push(`${pfx}${key}:`);
      const sub = jsonToToonLines(val, level + 1);
      lines.push(...sub);
    }
  }

  return lines;
}

export function jsonToToon(json: string): string {
  const parsed = JSON.parse(json);
  return jsonToToonLines(parsed, 0).join('\n');
}

// --- TOON to JSON parser ---

interface ToonLine {
  indent: number;
  raw: string;
  content: string;
}

function parseToonLines(text: string): ToonLine[] {
  return text.split('\n').map(raw => {
    const trimmed = raw.replace(/\t/g, '  ');
    const content = trimmed.trimStart();
    const indent = trimmed.length - content.length;
    return { indent, raw, content };
  }).filter(l => l.content.length > 0);
}

function parseValue(s: string): unknown {
  s = s.trim();
  if (s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).replace(/\\"/g, '"');
  }
  const num = Number(s);
  if (!isNaN(num) && s !== '') return num;
  // Try parsing as inline JSON
  if (s.startsWith('{') || s.startsWith('[')) {
    try { return JSON.parse(s); } catch { /* fall through */ }
  }
  return s;
}

function parseToonBlock(lines: ToonLine[], start: number, _baseIndent: number): [unknown, number] {
  if (start >= lines.length) return [null, start];

  const line = lines[start];

  // Tabular array: key [N] {fields} or [N] {fields}
  const tabularMatch = line.content.match(/^(?:(\w[\w\s]*?)\s+)?\[(\d+)\]\s*\{([^}]+)\}$/);
  if (tabularMatch) {
    const count = parseInt(tabularMatch[2]);
    const fields = tabularMatch[3].split(',').map(f => f.trim());
    const arr: Record<string, unknown>[] = [];
    let i = start + 1;
    for (let r = 0; r < count && i < lines.length; r++, i++) {
      const rowLine = lines[i];
      if (rowLine.indent <= line.indent) break;
      const vals = rowLine.content.split('|').map(v => v.trim());
      const obj: Record<string, unknown> = {};
      fields.forEach((f, idx) => {
        obj[f] = idx < vals.length ? parseValue(vals[idx]) : null;
      });
      arr.push(obj);
    }
    if (tabularMatch[1]) {
      return [{ key: tabularMatch[1], value: arr }, i];
    }
    return [arr, i];
  }

  // Simple array: key [N] or [N]
  const simpleArrMatch = line.content.match(/^(?:(\w[\w\s]*?)\s+)?\[(\d+)\]$/);
  if (simpleArrMatch) {
    const count = parseInt(simpleArrMatch[2]);
    const arr: unknown[] = [];
    let i = start + 1;
    for (let r = 0; r < count && i < lines.length; r++) {
      if (lines[i].indent <= line.indent) break;
      // Could be a complex nested item
      if (lines[i].content.includes(':') || lines[i].content.match(/\[\d+\]/)) {
        const [val, next] = parseToonObject(lines, i, lines[i].indent);
        arr.push(val);
        i = next;
      } else {
        arr.push(parseValue(lines[i].content));
        i++;
      }
    }
    if (simpleArrMatch[1]) {
      return [{ key: simpleArrMatch[1], value: arr }, i];
    }
    return [arr, i];
  }

  // Key: value or key: (nested object)
  const kvMatch = line.content.match(/^(\w[\w\s]*?):\s*(.*)$/);
  if (kvMatch) {
    const key = kvMatch[1].trim();
    const rest = kvMatch[2].trim();
    if (rest) {
      return [{ key, value: parseValue(rest) }, start + 1];
    }
    // Nested object
    const [val, next] = parseToonObject(lines, start + 1, line.indent + 2);
    return [{ key, value: val }, next];
  }

  // Plain value
  return [parseValue(line.content), start + 1];
}

function parseToonObject(lines: ToonLine[], start: number, baseIndent: number): [unknown, number] {
  const obj: Record<string, unknown> = {};
  let i = start;

  while (i < lines.length && lines[i].indent >= baseIndent) {
    const line = lines[i];

    // Tabular array with key
    const tabMatch = line.content.match(/^(\w[\w\s]*?)\s+\[(\d+)\]\s*\{([^}]+)\}$/);
    if (tabMatch) {
      const [result, next] = parseToonBlock(lines, i, baseIndent);
      const r = result as { key: string; value: unknown };
      obj[r.key] = r.value;
      i = next;
      continue;
    }

    // Simple array with key
    const arrMatch = line.content.match(/^(\w[\w\s]*?)\s+\[(\d+)\]$/);
    if (arrMatch) {
      const [result, next] = parseToonBlock(lines, i, baseIndent);
      const r = result as { key: string; value: unknown };
      obj[r.key] = r.value;
      i = next;
      continue;
    }

    // Key: value
    const kvMatch = line.content.match(/^(\w[\w\s]*?):\s*(.*)$/);
    if (kvMatch) {
      const [result, next] = parseToonBlock(lines, i, baseIndent);
      const r = result as { key: string; value: unknown };
      obj[r.key] = r.value;
      i = next;
      continue;
    }

    break;
  }

  return [obj, i];
}

export function toonToJson(toon: string): string {
  const lines = parseToonLines(toon);
  if (lines.length === 0) return '{}';

  // Check if top level is a single array
  const firstLine = lines[0];
  if (firstLine.content.match(/^\[(\d+)\]/)) {
    const [result] = parseToonBlock(lines, 0, 0);
    return JSON.stringify(result, null, 2);
  }

  const [result] = parseToonObject(lines, 0, 0);
  return JSON.stringify(result, null, 2);
}

export function countTokens(text: string): number {
  // Approximate: ~4 chars per token
  return Math.ceil(text.length / 4);
}
