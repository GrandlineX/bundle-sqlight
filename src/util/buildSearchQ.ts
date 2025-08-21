import {
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
): string {
  switch (s.mode) {
    case 'equals':
      if (s.value === null) {
        return `${key} IS ?`;
      }
      return `${key} = ?`;
    case 'not':
      if (s.value === null) {
        return `${key} IS NOT ?`;
      }
      return `${key} != ?`;
    case 'like':
      return `${key} like '%' || ? || '%'`;
    case 'smallerThan':
      return `${key} < ?`;
    case 'greaterThan':
      return `${key} > ?`;
    default:
      throw new Error(`Unknown mode: ${s.mode}`);
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
        filter.push(aFilter(String(key), s));
        convertSpecialFields(meta, s.value, param);
      } else if (isQInterfaceSearchAdvancedArr(s)) {
        filter.push(
          ...s.map((e) => {
            const ax = aFilter(String(key), e);
            convertSpecialFields(meta, e.value, param);
            return ax;
          }),
        );
      } else {
        if (search[key] === null) {
          filter.push(`${String(key)} is ?`);
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
