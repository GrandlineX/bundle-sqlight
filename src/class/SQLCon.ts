import * as Path from 'path';
import { RunResult } from 'better-sqlite3';
import {
  ConfigType,
  CoreDBCon,
  CoreEntity,
  ICoreKernelModule,
  IDataBase,
} from '@grandlinex/core';
import { RawQuery } from '@grandlinex/core/dist/lib';
import Database = require('better-sqlite3');

type DbType = Database.Database;

export default abstract class SQLCon
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

  async createEntity<E extends CoreEntity>(entity: E): Promise<E | null> {
    const clone: any = entity;
    const keys = Object.keys(entity) as (keyof E)[];
    const param: any[] = [];
    const vals: string[] = [];
    keys.forEach((key) => {
      const cur = clone[key];
      if (cur instanceof Date) {
        param.push(cur.toString());
      } else {
        param.push(clone[key]);
      }
      vals.push('?');
    });
    const res = await this.execScripts([
      {
        exec: `INSERT INTO ${this.schemaName}.${
          entity.constructor.name
        }(${keys.join(', ')})
                       VALUES (${vals.join(', ')})`,
        param,
      },
    ]);
    if (!res || !res[0]) {
      return null;
    }
    clone.e_id = res[0].lastInsertRowid;
    return clone;
  }

  async updateEntity<E extends CoreEntity>(entity: E): Promise<E | null> {
    if (entity.e_id) {
      await this.deleteEntityById(entity.constructor.name, entity.e_id);
      await this.createEntity(entity);
      return entity;
    }
    return null;
  }

  getEntityById<E extends CoreEntity>(
    className: string,
    id: number
  ): Promise<E | null> {
    const query = this.db?.prepare(
      `SELECT *
             FROM ${this.schemaName}.${className}
             WHERE e_id = ${id};`
    );
    return query?.get() || null;
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
    className: string,
    search: {
      [P in keyof E]: E[P];
    }
  ): Promise<E[]> {
    let searchQ = '';
    const param: any[] = [];
    if (search) {
      const keys: (keyof E)[] = Object.keys(search) as (keyof E)[];
      if (keys.length > 0) {
        const filter: string[] = [];
        for (const key of keys) {
          if (search[key] !== undefined) {
            filter.push(`${key} = ?`);
            param.push(search[key]);
          }
        }
        if (filter.length > 0) {
          searchQ = ` WHERE ${filter.join(' AND ')}`;
        }
      }
    }
    const query = this.db?.prepare(
      `SELECT *
             FROM ${this.schemaName}.${className} ${searchQ};`
    );
    return query?.all(param) || [];
  }

  async initEntity<E extends CoreEntity>(entity: E): Promise<boolean> {
    await this.execScripts([
      {
        exec: `CREATE TABLE ${this.schemaName}.${entity.constructor.name}
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
      if (key === 'e_id') {
        out.push(`e_id INTEGER PRIMARY KEY`);
      } else {
        const type = typeof entity[key];
        const dat = entity[key] as any;
        switch (type) {
          case 'bigint':
          case 'number':
            out.push(`${key} INTEGER`);
            break;
          case 'string':
            out.push(`${key} TEXT`);
            break;
          case 'object':
            if (dat instanceof Date) {
              out.push(`${key} TIMESTAMP`);
            }
            break;
          default:
            break;
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

  abstract initNewDB(): Promise<void>;

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
