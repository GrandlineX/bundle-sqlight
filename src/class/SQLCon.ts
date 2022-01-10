import * as Path from 'path';
import { RunResult } from 'better-sqlite3';
import {
  ConfigType,
  CoreDBCon,
  CoreEntity,
  EntityConfig,
  EProperties,
  EUpDateProperties,
  getColumnMeta,
  ICoreKernelModule,
  IDataBase,
  RawQuery,
} from '@grandlinex/core';
import Database = require('better-sqlite3');
import { EOrderBy } from '@grandlinex/core/dist/classes/annotation';
import {
  buildSearchQ,
  mappingWithDataType,
  objToTable,
  rowToObj,
  tableToObj,
} from '../util';

type DbType = Database.Database;

export default class SQLCon
  extends CoreDBCon<DbType, RunResult>
  implements IDataBase<DbType, RunResult>
{
  db: DbType | null;

  private readonly path: string;

  protected constructor(
    module: ICoreKernelModule<any, any, any, any, any>,
    dbversion: string
  ) {
    super(dbversion, 'main', module);
    const store = module.getKernel().getConfigStore();
    const path = store.get('GLOBAL_PATH_DB');
    if (!path) {
      this.error('Cant get db path from store');
      throw new Error('Cant get db path from store');
    }
    this.path = Path.join(path, `${module.getName()}.db`);
    this.db = null;
  }

  async createEntity<E extends CoreEntity>(
    config: EntityConfig<E>,
    entity: EProperties<E>
  ): Promise<E> {
    const clone: E = { ...entity, e_id: -1 } as E;
    const [keys, values, params] = objToTable(clone, config);
    const query: RawQuery = {
      exec: `INSERT INTO ${this.schemaName}.${config.className}(${keys.join(
        ', '
      )})
                   VALUES (${values.join(', ')})`,
      param: params,
    };
    const res = await this.execScripts([query]);
    if (!res || !res[0]) {
      throw this.lError('Cant Create entity');
    }
    clone.e_id = res[0].lastInsertRowid as number;
    return clone;
  }

  async updateEntity<E extends CoreEntity>(
    config: EntityConfig<E>,
    e_id: number,
    entity: EUpDateProperties<E>
  ): Promise<boolean> {
    const [, values, params] = objToTable(entity, config, true);
    const result = await this.execScripts([
      {
        exec: `UPDATE ${this.schemaName}.${config.className}
                           SET ${values.join(', ')}
                           WHERE e_id = ${e_id};`,
        param: params,
      },
    ]);

    return result[0] !== null;
  }

  async getEntityById<E extends CoreEntity>(
    config: EntityConfig<E>,
    id: number
  ): Promise<E | null> {
    const query = this.db?.prepare(
      `SELECT *
             FROM ${this.schemaName}.${config.className}
             WHERE e_id = ${id};`
    );

    const res = query?.get();
    if (res) {
      return rowToObj<E>(config, res);
    }
    return null;
  }

  async findEntity<E extends CoreEntity>(
    config: EntityConfig<E>,
    search: { [P in keyof E]?: E[P] | undefined }
  ): Promise<E | null> {
    let searchQ = '';
    const param: any[] = [];

    searchQ = buildSearchQ<E>(config, search, param, searchQ);

    const query = this.db?.prepare(
      `SELECT *
             FROM ${this.schemaName}.${config.className} ${searchQ};`
    );

    const res = query?.get(param);
    if (res) {
      return rowToObj<E>(config, res);
    }
    return null;
  }

  async deleteEntityById(className: string, id: number): Promise<boolean> {
    const query = this.db?.prepare(
      `DELETE
             FROM ${this.schemaName}.${className}
             WHERE e_id = ${id};`
    );
    return query?.run().changes === 1;
  }

  async getEntityList<E extends CoreEntity>(
    config: EntityConfig<E>,
    limit?: number,
    search?: {
      [P in keyof E]?: E[P];
    },
    order?: EOrderBy<E>
  ): Promise<E[]> {
    if (limit === 0) {
      return [];
    }
    let searchQ = '';
    const orderBy: string[] = [];
    let orderByQ = '';
    const range = limit ? `LIMIT ${limit}` : '';
    const param: any[] = [];
    if (search) {
      searchQ = buildSearchQ<E>(config, search, param, searchQ);
    }
    if (order && order.length > 0) {
      order.forEach((val) => {
        orderBy.push(`${val.key} ${val.order}`);
      });
      orderByQ = `ORDER BY ${orderBy.join(',\n')}`;
    }
    const query = this.db?.prepare(
      `SELECT *
             FROM ${this.schemaName}.${config.className} 
             ${searchQ} 
             ${orderByQ} 
             ${range};`
    );

    const res = query?.all(param);
    if (res) {
      return tableToObj<E>(config, res);
    }
    return [];
  }

  async initEntity<E extends CoreEntity>(
    className: string,
    entity: E
  ): Promise<boolean> {
    await this.execScripts([
      {
        exec: `CREATE TABLE ${this.schemaName}.${className}
                (
                    ${this.transformEntityKeys<E>(entity)}
                );`,
        param: [],
      },
    ]);
    return true;
  }

  transformEntityKeys<E extends CoreEntity>(entity: E): string {
    const keys: (keyof E)[] = Object.keys(entity) as (keyof E)[];
    const out: string[] = [];

    keys.forEach((key) => {
      const meta = getColumnMeta(entity, key);
      if (key === 'e_id') {
        out.push(`e_id INTEGER PRIMARY KEY`);
      } else if (meta?.dataType) {
        mappingWithDataType(meta, out, key);
      } else {
        const type = typeof entity[key];
        switch (type) {
          case 'bigint':
          case 'number':
            out.push(`${key} INTEGER NOT NULL`);
            break;
          case 'string':
            out.push(`${key} TEXT NOT NULL`);
            break;
          default:
            throw Error('TypeNotSupported');
        }
      }
    });

    return out.join(',\n');
  }

  async removeConfig(key: string): Promise<void> {
    try {
      const query = await this.execScripts([
        {
          exec: `DELETE
                           FROM ${this.schemaName}.config
                           WHERE c_key = ?;`,
          param: [key],
        },
      ]);
      this.log(query);
      if (query.length !== 1) {
        this.error('invalid result');
      }
    } catch (e) {
      this.error(e);
    }
  }

  async initNewDB(): Promise<void> {
    this.debug('no init ');
  }

  async connect(): Promise<boolean> {
    try {
      this.db = new Database(this.path, {
        verbose: this.debug,
      });
    } catch (e) {
      this.error(e);
      return false;
    }
    try {
      const query = this.db.prepare(
        `SELECT *
                 FROM ${this.schemaName}.config;`
      );
      const result = query.all();
      const version = result.find((el) => {
        return el.c_key === 'dbversion';
      });
      return !!version;
    } catch (e) {
      this.warn(e);
      this.log('Create new Database');

      await this.execScripts([
        {
          exec: `CREATE TABLE ${this.schemaName}.config
                           (
                               c_key   text not null,
                               c_value text,
                               PRIMARY KEY (c_key)
                           );`,
          param: [],
        },
        {
          exec: `INSERT INTO ${this.schemaName}.config (c_key, c_value)
                           VALUES ('dbversion', '${this.dbVersion}');`,
          param: [],
        },
      ]);
      this.setNew(true);
      return true;
    }
  }

  getRawDBObject(): DbType | null {
    return this.db;
  }

  async configExist(key: string): Promise<boolean> {
    const query = this.db?.prepare(
      `SELECT *
             FROM ${this.schemaName}.config
             WHERE c_key = '${key}'`
    );
    const exist = query?.get();
    return !!exist && exist.c_key !== undefined && exist.c_value !== undefined;
  }

  async setConfig(key: string, value: string): Promise<boolean> {
    const query = this.db?.prepare(
      `REPLACE INTO
            ${this.schemaName}
            .
            config
            (
            c_key,
            c_value
            )
            VALUES ('${key}', '${value}');`
    );
    if (query === undefined) {
      return false;
    }
    query.run();
    return true;
  }

  async getConfig(key: string): Promise<ConfigType> {
    const query = this.db?.prepare(
      `SELECT *
             FROM ${this.schemaName}.config
             WHERE c_key = '${key}'`
    );
    return query?.get();
  }

  async execScripts(list: RawQuery[]): Promise<RunResult[]> {
    const result: any[] = [];
    list.forEach((el) => {
      const prep = this.db?.prepare(el.exec);

      const res = prep?.run(el.param);
      if (res) {
        result.push(res);
      }
    });
    return result;
  }

  async disconnect(): Promise<boolean> {
    return true;
  }
}
