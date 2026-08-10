import { Member, MemberHistoryItem } from '../types';
import { normalizeToDateStr } from './dateUtils';

/**
 * Builds a complete chronological history timeline for a member, merging stored history_logs 
 * with automatic milestone entries (vstup, vybuttya, pokayannya, vodnogo) if they are not already present.
 */
export function getSynthesizedHistoryLogs(member: Member): MemberHistoryItem[] {
  if (!member) return [];
  const existing: MemberHistoryItem[] = Array.isArray(member.history_logs) ? [...member.history_logs] : [];

  const autoLogs: MemberHistoryItem[] = [];

  // 1. Покаяння
  if (member.d_pokayannya && member.d_pokayannya !== '—') {
    const dateStr = normalizeToDateStr(member.d_pokayannya);
    autoLogs.push({
      id: `auto_pok_${member.id}`,
      date: dateStr,
      type: 'other',
      title: 'Покаяння',
      details: ''
    });
  }

  // 2. Водне хрещення
  if (member.d_vodnogo && member.d_vodnogo !== '—') {
    const dateStr = normalizeToDateStr(member.d_vodnogo);
    autoLogs.push({
      id: `auto_vod_${member.id}`,
      date: dateStr,
      type: 'other',
      title: 'Водне хрещення',
      details: ''
    });
  }

  // 3. Прийняття в члени (Вступ)
  if (member.d_vstupu && member.d_vstupu !== '—') {
    const dateStr = normalizeToDateStr(member.d_vstupu);
    const source = member.insha_gromada ? ` (${member.insha_gromada})` : '';
    autoLogs.push({
      id: `auto_vst_${member.id}`,
      date: dateStr,
      type: 'vstup',
      title: `Прийняття в члени церкви${source}`,
      details: member.prymitka || ''
    });
  }

  // 4. Вибуття (if currently departed or previously recorded date)
  if ((Number(member.id_vybuttya) > 0 || (member.d_vybuttya && member.d_vybuttya !== '—')) && member.s_vybuv_ukr) {
    const dateStr = normalizeToDateStr(member.d_vybuttya || '');
    const reason = member.s_vybuv_ukr ? ` (${member.s_vybuv_ukr})` : '';
    autoLogs.push({
      id: `auto_vyb_${member.id}`,
      date: dateStr,
      type: 'vybuttya',
      title: `Вибуття з церкви${reason}`,
      details: member.vybutty_prymitka || ''
    });
  }

  // Merge auto logs that don't already exist in `existing`
  autoLogs.forEach(autoItem => {
    const exists = existing.some(item => {
      if (item.type === autoItem.type && item.date === autoItem.date && item.date) return true;
      if (item.title && autoItem.title && item.title.toLowerCase().trim() === autoItem.title.toLowerCase().trim()) return true;
      return false;
    });
    if (!exists) {
      existing.push(autoItem);
    }
  });

  // Sort chronological (newest first)
  return existing.sort((a, b) => {
    const dateA = parseDateToComparable(a.date);
    const dateB = parseDateToComparable(b.date);
    return dateB.localeCompare(dateA);
  });
}

function parseDateToComparable(dateStr?: string): string {
  if (!dateStr) return '0000-00-00';
  const trimmed = dateStr.trim();
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const d = dotMatch[1].padStart(2, '0');
    const m = dotMatch[2].padStart(2, '0');
    const y = dotMatch[3];
    return `${y}-${m}-${d}`;
  }
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return trimmed;
}
