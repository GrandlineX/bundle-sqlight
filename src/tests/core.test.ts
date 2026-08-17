import {
    CoreModule,
} from '@grandlinex/core';
import {
    TestLib,
    setupDevKernel,
    TestContext,
    TestKernel,
} from '@grandlinex/core/dev';
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

TestLib.testStart();
TestLib.testCore();
TestLib.testDb();
TestLib.testEnd();
TestLib.testOrm();

