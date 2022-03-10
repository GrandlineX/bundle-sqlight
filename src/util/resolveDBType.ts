import { DataType } from '@grandlinex/core';

export default function resolveDBType(dType: DataType) {
  switch (dType) {
    case 'int':
      return 'INTEGER';
    case 'double':
    case 'float':
      return 'REAL';
    case 'blob':
      return 'BLOB';
    case 'string':
    case 'uuid':
    case 'text':
      return 'TEXT';
    case 'boolean':
      return 'INTEGER';
    case 'date':
      return 'TIMESTAMP';
    case 'json':
      return 'TEXT';
    default:
      throw Error('TypeNotSupported');
  }
}
