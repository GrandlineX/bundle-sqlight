import {
    CoreModule,
    JestLib,
    setupDevKernel,
    TestContext,
    TestKernel,
} from '@grandlinex/core';
import { SQLCon } from '../index.js';

const appName = 'TestKernel';
const appCode = 'tkernel';
const [kernel] = TestContext.getEntity(
    {
      kernel:new TestKernel(appName, appCode,__dirname),
      cleanUp:true
    }
);

setupDevKernel(kernel, (mod) => {
  return {
    db: new SQLCon(mod, '0'),
  };
});

kernel.setBaseModule(new CoreModule(kernel,(mod)=> new SQLCon(mod,"0")))

JestLib.jestStart();
JestLib.jestCore();
JestLib.jestDb();
JestLib.jestEnd();
JestLib.jestOrm();

