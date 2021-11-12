
 import * as Path from 'path';

import { TestEntity, TestKernel } from './DebugClasses';
 import {
  CoreDBCon,
  CoreEntity,
  CoreEntityWrapper,
  createFolderIfNotExist,
  ICoreKernelModule, removeFolderIfExist, sleep
} from "@grandlinex/core";



const appName = 'TestKernel';
const appCode = 'tkernel';
const msiPath = Path.join(__dirname, '..', 'data');
const testPath = Path.join(__dirname, '..', 'data', 'config');


 createFolderIfNotExist(msiPath);
 createFolderIfNotExist(testPath);


 let kernel = new TestKernel(appName,appCode,testPath);

const testText = 'hello_world';

describe('Clean start', () => {
   test('preload', async () => {
    expect(kernel.getState()).toBe('init');
  });
  test('start kernel', async () => {
    const result = await kernel.start();
    expect(result).toBe(true);
    expect(kernel.getModCount()).toBe(1);
    expect(kernel.getState()).toBe('running');
  });})


describe('Database', () => {
  test('get version', async () => {
    expect(kernel.getState()).toBe('running');
    const db = kernel.getDb();
    expect(db).not.toBeNull()
    const conf = await db?.getConfig('dbversion');
    expect(conf?.c_value).not.toBeNull();
  });

  test('config test', async () => {
    expect(kernel.getState()).toBe('running');
    const db = kernel.getDb();
    expect(db).not.toBeNull()
    if (db){
      const conf = await db.setConfig(testText, testText);
      expect(conf).toBeTruthy();
      const res = await db.getConfig(testText);
      expect(res?.c_value).toBe(testText);
      await db.removeConfig(testText);
      const res2 = await db.getConfig(testText);
      expect(res2).toBeUndefined();

      expect(await db?.setConfig("test","test")).toBeTruthy();
      await db?.removeConfig("test")
      expect(await db?.configExist("test")).toBeFalsy()
    }
  });
})
describe('TestDatabase', () => {
  test('get version', async () => {
    const db = kernel.getChildModule("testModule")?.getDb();
    const conf = await db?.getConfig('dbversion');
    expect(conf?.c_value).not.toBeNull();
  });
})

describe('Entity', () => {
  let e_id=1;
  let wrapper:undefined|CoreEntityWrapper<any>=undefined;
  let entity:CoreEntity|null=null

  test('get wrapper class', async () => {
    const mod=kernel.getChildModule("testModule") as ICoreKernelModule<any, any, any, any, any>;
    const db = mod.getDb() as CoreDBCon<any,any>;
    wrapper=db.getEntityWrapper<TestEntity>("TestEntity")
    expect(wrapper).not.toBeUndefined()
    if (wrapper){
      expect((await wrapper.getObjList()).length).toBe(0)
    }
  });
  test('create new', async () => {
    expect(wrapper).not.toBeUndefined()
    if (wrapper){
      entity=new TestEntity("Bob",30);
      entity.e_id=e_id;
      expect((await wrapper.createObject(entity))).not.toBeNull()
      expect((await wrapper.getObjList()).length).toBe(e_id)
    }
  });
  test('update', async () => {
    expect(wrapper).not.toBeUndefined()
    if (wrapper){
      expect((await wrapper.updateObject(entity))).not.toBeNull()
      expect((await wrapper.getObjList()).length).toBe(1)
    }
  });
  test('get by id', async () => {
    expect(wrapper).not.toBeUndefined()
    if (wrapper){
      expect((await wrapper.getObjById(1))).not.toBeNull()
    }
  });
  test('delete', async () => {
    expect(wrapper).not.toBeUndefined()
    if (wrapper){
      expect((await wrapper.delete(1))).toBeTruthy();
      expect((await wrapper.getObjList()).length).toBe(0)
    }
  });
})

describe("ShutDown",()=>{

  test('exit kernel', async () => {
    const result = await kernel.stop();

    await sleep(1000);

    expect(kernel.getState()).toBe('exited');

    expect(result).toBeTruthy();
  });

  test('cleanup', async () => {

    expect(removeFolderIfExist(testPath)).not.toBeFalsy()
  });
})

