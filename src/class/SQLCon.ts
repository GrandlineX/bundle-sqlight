import Path from 'path';
import {
  ConfigType,
  CoreDBCon,
  CoreEntity,
  EntityConfig,
  EProperties,
  EUpDateProperties,
  getColumnMeta,
  ICoreCache,
  ICoreClient,
  ICoreKernel,
  ICoreKernelModule,
  ICorePresenter,
  IDataBase,
  IEntity,
  QueryInterface,
  RawQuery,
  QInterfaceSearch,
} from '@grandlinex/core';
import Database, { RunResult } from 'better-sqlite3';
import {
  buildSearchQ,
  mappingWithDataType,
  objToTable,
  rowToObj,
  tableToObj,
} from '../util/index.js';

export type DbType = Database.Database;

export default class SQLCon<
    K extends ICoreKernel<any> = ICoreKernel<any>,
    T extends IDataBase<any, any> | null = any,
    P extends ICoreClient | null = any,
    C extends ICoreCache | null = any,
    X extends ICorePresenter<any> | null = any,
  >
  extends CoreDBCon<DbType, RunResult, K, T, P, C, X>
  implements IDataBase<DbType, RunResult, K, T, P, C, X>
{
  db: DbType | null;

  printLog: boolean;

  private readonly path: string;

  constructor(
    module: ICoreKernelModule<any, any, any, any, any>,
    dbversion: string,
    printLog = false,
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
    this.printLog = printLog;
  }

  async createEntity<E extends CoreEntity>(
    config: EntityConfig<E>,
    entity: EProperties<E>,
  ): Promise<E> {
    const [keys, values, params] = objToTable(entity, config);
    const query: RawQuery = {
      exec: `INSERT INTO ${this.schemaName}.${config.className}(${keys.join(
        ', ',
      )})
                   VALUES (${values.join(', ')})`,
      param: params,
    };
    const res = await this.execScripts([query]);
    if (!res || !res[0]) {
      throw this.lError('Cant Create entity');
    }
    return entity as E;
  }

  async updateEntity<E extends CoreEntity>(
    config: EntityConfig<E>,
    e_id: string,
    entity: EUpDateProperties<E>,
  ): Promise<boolean> {
    const [, values, params] = objToTable(entity, config, true);
    const result = await this.execScripts([
      {
        exec: `UPDATE ${this.schemaName}.${config.className}
                           SET ${values.join(', ')}
                           WHERE e_id = ?;`,
        param: [...params, e_id],
      },
    ]);

    return result[0] !== null;
  }

  async updateBulkEntity<E extends IEntity>(
    config: EntityConfig<E>,
    e_id: string[],
    entity: EUpDateProperties<E>,
  ): Promise<boolean> {
    if (e_id.length === 0) {
      return false;
    }
    const [, values, params] = objToTable(entity, config, true);
    const result = await this.execScripts([
      {
        exec: `UPDATE ${this.schemaName}.${config.className}
                           SET ${values.join(', ')}
                           WHERE e_id in (${e_id.map(() => '?').join(',')});`,
        param: [...params, ...e_id],
      },
    ]);

    return result[0] !== null;
  }

  async getEntityById<E extends CoreEntity>(
    config: EntityConfig<E>,
    id: string,
  ): Promise<E | null> {
    const query = this.db?.prepare(
      `SELECT *
             FROM ${this.schemaName}.${config.className}
             WHERE e_id = ?;`,
    );

    const res = query?.get([id]);
    if (res) {
      return rowToObj<E>(config, res);
    }
    return null;
  }

  async getEntityBulkById<E extends CoreEntity>(
    config: EntityConfig<E>,
    e_id: string[],
  ): Promise<E[]> {
    if (e_id.length === 0) {
      return [];
    }
    const query = this.db?.prepare(
      `SELECT *
             FROM ${this.schemaName}.${config.className}
             WHERE e_id in (${e_id.map(() => '?').join(',')});`,
    );

    const res = query?.all(e_id);
    if (res) {
      return tableToObj<E>(config, res);
    }
    return [];
  }

  async findEntity<E extends CoreEntity>(
    config: EntityConfig<E>,
    search: QInterfaceSearch<E>,
  ): Promise<E | null> {
    let searchQ = '';
    const param: any[] = [];

    searchQ = buildSearchQ<E>(config, search, param, searchQ);

    const query = this.db?.prepare(
      `SELECT *
             FROM ${this.schemaName}.${config.className} ${searchQ};`,
    );

    const res = query?.get(param);
    if (res) {
      return rowToObj<E>(config, res);
    }
    return null;
  }

  async deleteEntityById(className: string, id: string): Promise<boolean> {
    const query = this.db?.prepare(
      `DELETE
             FROM ${this.schemaName}.${className}
             WHERE e_id = ?;`,
    );
    return query?.run([id]).changes === 1;
  }

  async deleteEntityBulkById(
    className: string,
    e_id: string[],
  ): Promise<boolean> {
    if (e_id.length === 0) {
      return false;
    }
    const query = this.db?.prepare(
      `DELETE
             FROM ${this.schemaName}.${className}
             WHERE e_id in (${e_id.map(() => '?').join(',')});`,
    );
    return (query?.run([...e_id]).changes ?? 0) > 1;
  }

  async getEntityList<E extends CoreEntity>(
    q: QueryInterface<E>,
  ): Promise<E[]> {
    const { limit, search, config, order, offset } = q;
    if (limit === 0) {
      return [];
    }
    let searchQ = '';
    const orderBy: string[] = [];
    let orderByQ = '';
    const off = offset !== undefined ? ` OFFSET ${offset}` : '';
    const range = limit ? `LIMIT ${limit}${off}` : '';
    const param: any[] = [];
    if (search) {
      searchQ = buildSearchQ<E>(config, search, param, searchQ);
    }
    if (order && order.length > 0) {
      order.forEach((val) => {
        orderBy.push(`${String(val.key)} ${val.order}`);
      });
      orderByQ = `ORDER BY ${orderBy.join(',\n')}`;
    }

    const query = this.db?.prepare(`SELECT *
             FROM ${this.schemaName}.${config.className}
             ${searchQ}
             ${orderByQ}
             ${range};`);

    const res = query?.all(param);
    if (res) {
      return tableToObj<E>(config, res);
    }
    return [];
  }

  async initEntity<E extends CoreEntity>(
    className: string,
    entity: E,
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
        out.push(`e_id TEXT PRIMARY KEY`);
      } else if (meta?.dataType) {
        mappingWithDataType(meta, out, key);
      } else {
        const type = typeof entity[key];
        switch (type) {
          case 'bigint':
          case 'number':
            out.push(`${String(key)} INTEGER NOT NULL`);
            break;
          case 'string':
            out.push(`${String(key)} TEXT NOT NULL`);
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
        verbose: (message, additionalArgs) => {
          if (this.printLog) {
            this.verbose(message, additionalArgs);
          }
        },
      });
    } catch (e) {
      this.error(e);
      return false;
    }
    try {
      const query = this.db.prepare(
        `SELECT *
                 FROM ${this.schemaName}.config;`,
      );
      const result = query.all() as any[];
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
             WHERE c_key = '${key}'`,
    );
    const exist = query?.get() as any;
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
            VALUES ('${key}', '${value}');`,
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
             WHERE c_key = '${key}'`,
    );
    return query?.get() as any;
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
    this.db?.close();
    return true;
  }
}
