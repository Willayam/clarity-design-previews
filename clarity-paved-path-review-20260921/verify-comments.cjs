const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const ts = require(require.resolve('typescript', { paths: [process.cwd()] }));
const files = execFileSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const printer = ts.createPrinter({ removeComments: true });
const options = { removeComments: true, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve };
for (const file of files) {
  assert(file.endsWith('.ts'), `Unexpected changed file: ${file}`);
  const before = execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8' });
  const after = fs.readFileSync(file, 'utf8');
  const parsed = [before, after].map(text => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true));
  assert.equal(printer.printFile(parsed[0]), printer.printFile(parsed[1]), `TypeScript syntax changed: ${file}`);
  assert.equal(ts.transpileModule(before, { compilerOptions: options, fileName: file }).outputText,
    ts.transpileModule(after, { compilerOptions: options, fileName: file }).outputText, `JavaScript changed: ${file}`);
  const directives = text => text.split('\n').filter(line => /\/\/\/|@ts-|eslint-|@__PURE__|istanbul|c8 ignore|sourceMappingURL|@license|@preserve/.test(line));
  assert.deepEqual(directives(before), directives(after), `Directive changed: ${file}`);
  process.stdout.write(`PASS ${file}: identical TypeScript, JavaScript, and directives\n`);
}
assert(files.length > 0, 'No changed files verified');
execFileSync('git', ['diff', '--check'], { stdio: 'inherit' });
