import { ColumnProps, CoreEntity } from '@grandlinex/core';
import resolveDBType from './resolveDBType.js';

export default function mappingWithDataType<E extends CoreEntity>(
  meta: ColumnProps,
  out: string[],
  key: keyof E,
): void {
  if (!meta.dataType) {
    throw new Error('DataType not set');
  }
  if (meta.dataType === 'serial') {
    out.push(`${String(key)} INTEGER AUTOINCREMENT NOT NUL`);
  } else {
    let canBeNull = `${meta.canBeNull ? '' : ' NOT NULL'}`;
    if (meta.primaryKey) {
      canBeNull = ' NOT NULL PRIMARY KEY';
    }
    const unique = `${meta.unique ? ' UNIQUE' : ''}`;
    let foreignKey: string;
    if (meta.foreignKey && !meta.foreignKey.schema) {
      foreignKey = ` REFERENCES ${meta.foreignKey.relation}(${meta.foreignKey.key})`;
    } else {
      foreignKey = '';
    }

    const dbType = resolveDBType(meta.dataType);
    out.push(`${String(key)} ${dbType}${foreignKey}${canBeNull}${unique}`);
  }
}
