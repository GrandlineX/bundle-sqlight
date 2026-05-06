import {
  ColumnProps,
  CoreEntity,
  EntityConfig,
  isQInterfaceSearchAdvanced,
  isQInterfaceSearchAdvancedArr,
  QInterfaceSearch,
  QInterfaceSearchAdvanced,
} from '@grandlinex/core';
import { convertSpecialFields } from './converter.js';

function aFilter<E extends CoreEntity>(
  key: string,
  s: QInterfaceSearchAdvanced<QInterfaceSearch<E>, keyof E>,
  meta: ColumnProps,
  param: any[],
): string {
  switch (s.mode) {
    case 'equals':
      convertSpecialFields(meta, s.value, param);
      if (s.value === null) return `${key} IS ?`;
      return `${key} = ?`;
    case 'not':
      convertSpecialFields(meta, s.value, param);
      if (s.value === null) return `${key} IS NOT ?`;
      return `${key} != ?`;
    case 'like':
      convertSpecialFields(meta, s.value, param);
      return `lower(${key}) like '%' || lower(?) || '%'`;
    case 'startsWith':
      convertSpecialFields(meta, s.value, param);
      return `lower(${key}) like lower(?) || '%'`;
    case 'endsWith':
      convertSpecialFields(meta, s.value, param);
      return `lower(${key}) like '%' || lower(?)`;
    case 'smallerThan':
      convertSpecialFields(meta, s.value, param);
      return `${key} < ?`;
    case 'greaterThan':
      convertSpecialFields(meta, s.value, param);
      return `${key} > ?`;
    case 'in':
      s.value.forEach((v) => convertSpecialFields(meta, v, param));
      return `${key} IN (${s.value.map(() => '?').join(',')})`;
    case 'notIn':
      s.value.forEach((v) => convertSpecialFields(meta, v, param));
      return `${key} NOT IN (${s.value.map(() => '?').join(',')})`;
    case 'between':
      convertSpecialFields(meta, s.value[0], param);
      convertSpecialFields(meta, s.value[1], param);
      return `${key} BETWEEN ? AND ?`;
    case 'isNull':
      return `${key} IS NULL`;
    case 'isNotNull':
      return `${key} IS NOT NULL`;
    default:
      throw new Error(`Unknown mode: ${(s as any).mode}`);
  }
}

export default function buildSearchQ<E extends CoreEntity>(
  config: EntityConfig<E>,
  search: QInterfaceSearch<E>,
  param: any[],
  searchQ: string,
) {
  let temp = searchQ;
  const keys: (keyof E)[] = Object.keys(search) as (keyof E)[];
  if (keys.length > 0) {
    const filter: string[] = [];
    for (const key of keys) {
      const s: QInterfaceSearch<E>[keyof E] = search[key];
      const meta = config.meta.get(key);
      if (!meta) {
        throw new Error('Missing meta');
      }

      if (isQInterfaceSearchAdvanced(s)) {
        filter.push(aFilter(String(key), s, meta, param));
      } else if (isQInterfaceSearchAdvancedArr(s)) {
        filter.push(...s.map((e) => aFilter(String(key), e, meta, param)));
      } else {
        if (search[key] === null) {
          filter.push(`${String(key)} IS ?`);
        } else {
          filter.push(`${String(key)} = ?`);
        }
        convertSpecialFields(meta, search[key], param);
      }
    }
    if (filter.length > 0) {
      temp = ` WHERE ${filter.join(' AND ')}`;
    }
  }
  return temp;
}
