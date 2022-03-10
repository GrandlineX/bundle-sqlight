import * as Path from 'path';

import  { createFolderIfNotExist, setupDevKernel, TestKernel }  from "@grandlinex/core";

const appName = 'TestKernel';
const appCode = 'tkernel';
const testEnv = Path.join(__dirname, '..');
const testPathData = Path.join(__dirname, '..', 'data');
const testPath = Path.join(__dirname, '..', 'data', 'config');

createFolderIfNotExist(testPathData);
createFolderIfNotExist(testPath);

const kernel = new TestKernel(appName, appCode, testPath, testEnv);
setupDevKernel(kernel);
kernel.start();
