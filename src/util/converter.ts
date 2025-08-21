import {
  ColumnProps,
  CoreEntity,
  EntityConfig,
  EUpDateProperties,
} from '@grandlinex/core';

export function convertSpecialFields(
  meta: ColumnProps,
  value: any,
  params: any[],
) {
  switch (meta.dataType) {
    case 'date':
      if (value !== null) {
        params.push((value as Date).toISOString());
      } else {
        params.push(null);
      }
      break;
    case 'json':
      params.push(JSON.stringify(value));
      break;
    case 'boolean':
      params.push(value ? 1 : 0);
      break;
    default:
      params.push(value);
      break;
  }
}

export function objToTable<E extends CoreEntity>(
  entity: E | EUpDateProperties<E>,
  config: EntityConfig<E>,
  update?: boolean,
): [(keyof E)[], string[], unknown[]] {
  const clone: any = entity;
  const keysOriginal = Object.keys(entity) as (keyof E)[];
  const keys: (keyof E)[] = [];
  const params: any[] = [];
  const values: string[] = [];

  keysOriginal.forEach((key) => {
    const meta = config.meta.get(key);
    if (!meta) {
      throw new Error('No col meta');
    }
    if (meta.primaryKey && update) {
      return;
    }
    convertSpecialFields(meta, clone[key], params);
    if (update) {
      values.push(`${String(key)}=?`);
    } else {
      values.push(`?`);
    }

    keys.push(key);
  });

  if (values.length === params.length && params.length === keys.length) {
    return [keys, values, params];
  }
  throw new Error('Invalid output length');
}

export function rowToObj<E extends CoreEntity>(
  config: EntityConfig<E>,
  row: any,
): E {
  const clone: any = row;
  config.meta.forEach((value, key) => {
    switch (value.dataType) {
      case 'json':
        clone[key] = clone[key] !== null ? JSON.parse(clone[key]) : null;
        break;
      case 'date':
        clone[key] = clone[key] !== null ? new Date(clone[key]) : null;
        break;
      default:
        break;
    }
  });
  return clone;
}

export function tableToObj<E extends CoreEntity>(
  config: EntityConfig<E>,
  table: any[],
): E[] {
  return table.map((row) => {
    return rowToObj(config, row);
  });
}
