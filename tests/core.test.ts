import * as Path from 'path';
import {
  createFolderIfNotExist,
  InMemDB,
  setupDevKernel,
  TestKernel,
} from '@grandlinex/core';
import { SQLCon } from '../src';

const appName = 'TestKernel';
const appCode = 'tkernel';
const msiPath = Path.join(__dirname, '..', 'data');
const testPath = Path.join(__dirname, '..', 'data', 'config');

createFolderIfNotExist(msiPath);
createFolderIfNotExist(testPath);

const kernel = TestKernel.getEntity(
  new TestKernel(appName, appCode, testPath, __dirname)
);

setupDevKernel(kernel, (mod) => {
  return {
    db: new SQLCon(mod, '0'),
    // db: new InMemDB(mod),
  };
});

require('@grandlinex/core/dist/dev/lib/start');
require('@grandlinex/core/dist/dev/lib/core');
require('@grandlinex/core/dist/dev/lib/dbcon');
require('@grandlinex/core/dist/dev/lib/end');
require('@grandlinex/core/dist/dev/lib/orm');
