import {
    CoreModule, JestLib,
    setupDevKernel,
    TestContext,
    TestKernel,
    XUtil,
} from '@grandlinex/core';
import { SQLCon } from '../src';

const appName = 'TestKernel';
const appCode = 'tkernel';
const [testPath] =XUtil.setupEnvironment([__dirname,'..'],['data','config'])
const [kernel] = TestContext.getEntity(
    {
      kernel:new TestKernel(appName, appCode, testPath, __dirname),
      cleanUpPath:testPath
    }
);

setupDevKernel(kernel, (mod) => {
  return {
    db: new SQLCon(mod, '0'),
    // db: new InMemDB(mod),
  };
});

kernel.setBaseModule(new CoreModule(kernel,(mod)=> new SQLCon(mod,"0")))

JestLib.jestStart();
JestLib.jestCore();
JestLib.jestDb();
JestLib.jestEnd();
JestLib.jestOrm();

