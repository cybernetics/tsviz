/// <reference path="typings/node/node.d.ts" />

import { readFileSync, readdirSync } from "fs";
import * as ts from "typescript";
import * as analyser from "./ts-analyser"; 
import * as umBuilder from "./uml-builder";

const targetPath = process.argv[2];
const fileNames = readdirSync(targetPath);

const compilerOptions: ts.CompilerOptions = {
    noEmitOnError: true, 
    noImplicitAny: true,
    target: ts.ScriptTarget.ES5, 
    module: ts.ModuleKind.AMD
};

let compilerHost = ts.createCompilerHost(compilerOptions, /*setParentNodes */ true);
let program = ts.createProgram(fileNames, compilerOptions, compilerHost);

// analyse sources
var modules = program.getSourceFiles()
    .filter(f => f.fileName.indexOf("lib.d.ts") === -1)
    .map(sourceFile => analyser.collectInformation(program, sourceFile));

umBuilder.buildUml(modules, "test.png");