/**
 * Normalizes various date string formats to the standard DD.MM.YYYY format.
 * Supported formats: DD.MM.YYYY, YYYY-MM-DD, DD.MM.YY
 */
export const normalizeToDateStr = (str: string): string => {
  if (!str || str === '—' || str === 'н/д') return str;
  const trimmed = str.trim();
  
  // 1. Try DD.MM.YYYY
  let match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    const y = match[3];
    return `${d}.${m}.${y}`;
  }

  // 2. Try YYYY-MM-DD
  match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const y = match[1];
    const m = match[2].padStart(2, '0');
    const d = match[3].padStart(2, '0');
    return `${d}.${m}.${y}`;
  }

  // 3. Try DD.MM.YY
  match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    const yy = parseInt(match[3], 10);
    const y = (yy < 50 ? 2000 : 1900) + yy;
    return `${d}.${m}.${y}`;
  }

  return trimmed;
};

/**
 * Parses a string containing multiple contact dates and returns an array of normalized DD.MM.YYYY strings.
 */
export const parseAndNormalizeContactDates = (dKontaktiv?: string): string[] => {
  if (!dKontaktiv) return [];
  // Split by slashes, commas, semicolons, or newlines
  let tokens = dKontaktiv.split(/[\/,;\n]+/);
  let finalTokens: string[] = [];
  
  tokens.forEach(t => {
    const trimmed = t.trim();
    if (!trimmed) return;
    
    // Check for multiple dates separated by spaces if they look like dates
    if (trimmed.includes(' ') && /\d{2}\.\d{2}\.\d{2}/.test(trimmed)) {
      const spaceParts = trimmed.split(/\s+/);
      spaceParts.forEach(sp => {
        const spt = sp.trim();
        if (spt) finalTokens.push(normalizeToDateStr(spt));
      });
    } else {
      finalTokens.push(normalizeToDateStr(trimmed));
    }
  });
  
  return finalTokens.filter(p => p && p !== '—' && p !== 'н/д');
};
