import { EntityConfig } from '@grandlinex/core';
import { convertSpecialFields } from './converter.js';

export default function buildSearchQ<E>(
  config: EntityConfig<E>,
  search: { [P in keyof E]?: E[P] },
  param: any[],
  searchQ: string,
) {
  let temp = searchQ;
  const keys: (keyof E)[] = Object.keys(search) as (keyof E)[];
  if (keys.length > 0) {
    const filter: string[] = [];
    for (const key of keys) {
      if (search[key] !== undefined) {
        const meta = config.meta.get(key);
        if (!meta) {
          throw new Error('Missing meta');
        }
        filter.push(`${String(key)} = ?`);
        convertSpecialFields(meta, search, key, param);
      }
    }
    if (filter.length > 0) {
      temp = ` WHERE ${filter.join(' AND ')}`;
    }
  }
  return temp;
}
