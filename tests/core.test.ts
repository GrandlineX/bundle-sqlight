import {
    CoreModule,
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

require('@grandlinex/core/dist/dev/lib/start');
require('@grandlinex/core/dist/dev/lib/store');
require('@grandlinex/core/dist/dev/lib/core');
require('@grandlinex/core/dist/dev/lib/dbcon');
require('@grandlinex/core/dist/dev/lib/end');
require('@grandlinex/core/dist/dev/lib/orm');
