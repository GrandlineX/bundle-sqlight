import CoreKernel, {
  camelToSnakeCase,
  Column,
  CoreClient,
  CoreCryptoClient, CoreDBCon,
  CoreEntity,
  CoreKernelModule, Entity,
  ICoreCClient, ICoreKernelModule,
  OfflineService,
  CoreDBUpdate, EProperties
} from "@grandlinex/core";
import SQLCon from "../src/";

type TCoreKernel=CoreKernel<ICoreCClient>;

class TestBaseMod extends CoreKernelModule<TCoreKernel,TestDB,null,null,null> {
  beforeServiceStart(): Promise<void> {
    return Promise.resolve( undefined );
  }

  final(): Promise<void> {
    return Promise.resolve( undefined );
  }

  initModule(): Promise<void> {
    this.setDb(new TestDB(this))
    return Promise.resolve( undefined );
  }

  startup(): Promise<void> {
    return Promise.resolve( undefined );
  }

}
class TestKernel extends CoreKernel<ICoreCClient> {
  constructor(appName:string, appCode:string,testPath:string) {
    super( { appName, appCode, pathOverride:testPath });
    this.setBaseModule(new TestBaseMod("testbase2",this));
    this.setCryptoClient(new CoreCryptoClient(CoreCryptoClient.fromPW("testpw")))
    this.addModule(new TestModuel(this));
   }
}



class TestClient extends CoreClient{

}

 
class TestDB extends SQLCon{
  constructor(module:ICoreKernelModule<any, any, any, any, any>) {
    super(module,"0");
  }
  initNewDB(): Promise<void> {
    return Promise.resolve( undefined );
  }
}



class TestDBUpdate extends CoreDBUpdate<any,any>{
  constructor(db:CoreDBCon<any,any>) {
    super("0","1",db);
  }
  async performe(): Promise<boolean> {
    const db=this.getDb();

    await db.setConfig("dbversion","1")
    return true;
  }

}
 @Entity("ExampleEntity")
 class ExampleEntity extends CoreEntity {
   @Column()
   title: string;
   @Column({
     canBeNull:true,
     dataType:"int"
   })
  age: number|null;
   @Column({
     canBeNull:true,
     dataType:"string"
   })
  description: string|null;


  constructor(props?:EProperties<ExampleEntity>) {
    super();
    this.title = props?.title||"";
    this.description = props?.description||null;
    this.age = props?.age||-1;
  }
}
@Entity("TestEntity")
class TestEntity extends CoreEntity{
  @Column()
  name:string
  @Column({
    canBeNull:true,
    dataType:"string"
  })
  address:string|null
  @Column()
  age:number
  @Column({
    canBeNull:true,
    dataType:"date"
  })
  time:Date|null

  @Column({
    canBeNull:true,
    dataType:"blob"
  })
  raw: Buffer|null;

  @Column({
    canBeNull:true,
    dataType:"json"
  })
  json: any|null;


  constructor( param?:EProperties<TestEntity> ) {
    super();
    this.name = param?.name||"";
    this.address = param?.address||null;
    this.age = param?.age||-1;
    this.time = param?.time||null;
    this.raw=param?.raw||null;
    this.json=param?.json||null
  }
}
@Entity("TestEntityLinked")
class TestEntityLinked extends TestEntity{

  @Column({
    dataType:"int",
    unique:true,
    foreignKey:{
      key:"e_id",
      relation:camelToSnakeCase('TestEntity')
    }
  })
  link:number|null
  @Column({
    dataType:"boolean"
  })
  flag:boolean
  @Column({
    dataType:"float"
  })
  floating:number
  constructor( param?:EProperties<TestEntityLinked> ) {
    super(param);
    this.link = param?.link||null;
    this.flag = !!param?.flag;
    this.floating = param?.floating||0.0;
  }
}
class TestModuel extends CoreKernelModule<TCoreKernel,TestDB,TestClient,null,null>{
  constructor(kernel:TCoreKernel) {
    super("testModule",kernel);
    this.addService(new OfflineService(this))
  }
  async initModule(): Promise<void> {
    this.setClient(new TestClient("testc",this))
    this.log("FirstTHIS")
    const db=new TestDB(this)
    db.registerEntity(new TestEntity())
    db.registerEntity(new TestEntityLinked())
    db.registerEntity(new ExampleEntity())
    this.setDb(db)
    db.setUpdateChain(new TestDBUpdate(this.getDb() as CoreDBCon<any,any>))
  }

  startup(): Promise<void> {
    return Promise.resolve( undefined );
  }

  beforeServiceStart(): Promise<void> {
    return Promise.resolve( undefined );
  }

  final(): Promise<void> {
    return Promise.resolve( undefined );
  }

}

export {
  TCoreKernel,
  TestBaseMod,
  TestKernel,
  TestEntityLinked,
  TestClient,
  TestDBUpdate,
  TestEntity,
  TestModuel,
  ExampleEntity
 }
