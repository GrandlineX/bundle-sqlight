
 import * as Path from 'path';

import {TestEntity, TestEntityLinked, TestKernel} from './DebugClasses';
 import {
  CoreDBCon,
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
   let wrapper:undefined|CoreEntityWrapper<TestEntity>=undefined;
   let wrapper2:undefined|CoreEntityWrapper<TestEntityLinked>=undefined;

   let entity:TestEntity = new TestEntity({
     name:"Bob",
     age:30,
     address:"home",
     time:new Date(),
     raw:null,
     json:{some:"value"}
   });
   let entity2:TestEntity = new TestEntity({
     name:"Alice",
     age:29,
     address:null,
     time:null,
     raw:null,
     json:[{some:"value"},{some:"array"}]
   });
   let entity3:TestEntityLinked = new TestEntityLinked({
     name:"Alice",
     age:29,
     address:null,
     time:null,
     link:null,
     raw:Buffer.from("message"),
     json:null,
     flag:true,
     floating:0.9
   });

   test('get wrapper class', async () => {
     const mod=kernel.getChildModule("testModule") as ICoreKernelModule<any, any, any, any, any>;
     const db = mod.getDb() as CoreDBCon<any,any>;
     wrapper=db.getEntityWrapper<TestEntity>("TestEntity")
     wrapper2=db.getEntityWrapper<TestEntityLinked>("TestEntityLinked")
     expect(wrapper).not.toBeUndefined()
     if (wrapper){
       expect((await wrapper.getObjList()).length).toBe(0)
     }
   });
   test('create new', async () => {
     expect(wrapper).not.toBeUndefined()
     if (wrapper){
       entity= await wrapper.createObject(entity) || entity;
       expect(entity?.e_id).not.toBeNull()
       expect((await wrapper.getObjList()).length).toBe(1)
     }
   });
   test('create new 2', async () => {
     expect(wrapper).not.toBeUndefined()
     if (wrapper){
       entity2=await wrapper.createObject(entity2)||entity2;
       expect(entity2?.e_id).not.toBeNull()
       expect((await wrapper.getObjList()).length).toBe(2)
     }
   });
   test('create new 3', async () => {
     expect(wrapper2).not.toBeUndefined()
     if (wrapper2){
       entity3.link=entity.e_id
       entity3=await wrapper2.createObject(entity3)||entity3;
       expect(entity2?.e_id).not.toBeNull()
       expect((await wrapper2.getObjList()).length).toBe(1)
     }
   });
   test('get by id', async () => {
     expect(wrapper).not.toBeUndefined()
     expect(entity.e_id).not.toBeNull()
     if (wrapper ){
       expect((await wrapper.getObjById(entity.e_id as number))).not.toBeNull()
     }
   });

   test('listing search id', async () => {
     expect(wrapper).not.toBeUndefined()
     if (wrapper){
       expect((await wrapper.getObjList({
         e_id: entity.e_id,
       }))).toHaveLength(1);
     }
   });
   test('listing search fk id', async () => {
     expect(wrapper2).not.toBeUndefined()
     if (wrapper2){
       expect((await wrapper2.getObjList({
         link: entity.e_id,
       }))).toHaveLength(1);
     }
   });
   test('listing search bob', async () => {
     expect(wrapper).not.toBeUndefined()
     if (wrapper){
       expect((await wrapper.getObjList({
         name:"Bob"
       }))).toHaveLength(1);
     }
   });
   test('listing search bob', async () => {
     expect(wrapper).not.toBeUndefined()
     if (wrapper){
       expect((await wrapper.getObjList({
         name:"Bob"
       }))).toHaveLength(1);
     }
   });
   test('listing search bob check date', async () => {
     expect(wrapper).not.toBeUndefined()

     if (wrapper){
       const bonb=await wrapper.getObjList({
         name:"Bob"
       })
       expect(bonb).toHaveLength(1);
       expect(bonb[0].time).not.toBeNull();
     }
   });
   test('find entity by id', async () => {
     expect(wrapper).not.toBeUndefined()
     if (wrapper){
       expect((await wrapper.findObj({
         e_id: entity.e_id,
       }))).not.toBeNull();
     }
   });

   test('update', async () => {
     expect(wrapper).not.toBeUndefined()
     expect(entity.e_id).not.toBeNull()
     if (wrapper){
       expect(entity.name).toBe("Bob")

       await wrapper.updateObject(entity.e_id,{
         name:"Bobi"
       });
       const update = await wrapper.getObjById(entity.e_id);
       expect(update).not.toBeNull()
       expect(update?.name).toBe("Bobi")
       expect((await wrapper.getObjList()).length).toBe(2)
     }
   });
   test('delete', async () => {
     expect(wrapper).not.toBeUndefined()
     expect(wrapper2).not.toBeUndefined()

     if (wrapper2){
       expect((await wrapper2.getObjList()).length).toBe(1)
       expect((await wrapper2.delete(entity3.e_id as number))).toBeTruthy();
       expect((await wrapper2.getObjList()).length).toBe(0)
     }
     if (wrapper){
       expect((await wrapper.delete(entity.e_id as number))).toBeTruthy();
       expect((await wrapper.getObjList()).length).toBe(1)
       expect((await wrapper.delete(entity2.e_id as number))).toBeTruthy();
       expect((await wrapper.getObjList()).length).toBe(0)
     }
   });
 })
 describe('Bulk Entity', () => {
   let wrapper:undefined|CoreEntityWrapper<TestEntity>=undefined;
   let idList:number[]=[]
   let max=100;
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
     expect(wrapper).not.toBeNull()
     if (wrapper){
       for (let i = 0; i < max; i++) {
         let entity:TestEntity = new TestEntity({
           name:"Bob",
           age:i,
           address:"home",
           time:new Date(),
           raw:null,
           json:{some:"value",index:i}
         });
         entity= await wrapper.createObject(entity) || entity;
         expect(entity.e_id).not.toBeNull()
         idList.push(entity.e_id as number)
         expect((await wrapper.getObjList()).length).toBe(i+1)
       }
     }else {
       expect(false).toBeTruthy()
     }

   });
   test('listing search id limit 0', async () => {
     expect(wrapper).not.toBeUndefined()
     if (wrapper){
       expect((await wrapper.getObjList(undefined,0))).toHaveLength(0);
     }
   });
   test('listing search id limit 1', async () => {
     expect(wrapper).not.toBeUndefined()
     if (wrapper){
       expect((await wrapper.getObjList(undefined,1))).toHaveLength(1);
     }
   });
   test('listing search id limit 2', async () => {
     expect(wrapper).not.toBeUndefined()
     if (wrapper){
       expect((await wrapper.getObjList(undefined,2))).toHaveLength(2);
     }
   });

   test('listing search id limit ASC DESC', async () => {
     expect(wrapper).not.toBeUndefined()
     if (wrapper){
       const a=await wrapper.getObjList(undefined,2,[{key:"e_id",order:"ASC"}])
       const b= await wrapper.getObjList(undefined,2,[{key:"e_id",order:"DESC"}])
       expect(a.length).toBe(2)
       expect(b.length).toBe(2)
       expect(a[0].e_id !== b[0].e_id).toBeTruthy()

     }
   });
   test('delete', async () => {
     expect(wrapper).not.toBeUndefined()
     if (wrapper){
       for (const el of idList) {
         expect((await wrapper.delete(el))).toBeTruthy();
       }
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

