import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shuffleOptions, remapAnswer, remapAnalysis } from '../src/pages/Practice/options.ts';

const labels = { D: 'A', C: 'B', A: 'C', B: 'D' };

test('shuffling preserves option keys and numbers display labels in order', () => {
  const options = { A: 'Glue Studio', B: 'EMR', C: 'DataBrew', D: 'Athena', E: 'Lambda' };
  const shuffled = shuffleOptions(options);
  assert.deepEqual(shuffled.map(({ key }) => key).sort(), Object.keys(options));
  assert.deepEqual(shuffled.map(({ label }) => label), ['A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(Object.keys(options), ['A', 'B', 'C', 'D', 'E']);
});

test('single and multiple answers use the current display labels', () => {
  assert.equal(remapAnswer('C', labels), 'B');
  assert.equal(remapAnswer(' A, C ', labels), 'B,C');
  assert.equal(remapAnswer('A,B', labels), 'C,D');
});

test('analysis headings match the displayed answer without changing service names', () => {
  assert.equal(
    remapAnalysis('C: Glue DataBrew transforms data from Amazon S3 with AWS Glue.', labels),
    'B: Glue DataBrew transforms data from Amazon S3 with AWS Glue.',
  );
  assert.equal(
    remapAnalysis('A,B: S3 events notify SQS, and Lambda processes messages.', labels),
    'C,D: S3 events notify SQS, and Lambda processes messages.',
  );
});

test('Chinese and English option references are mapped once even when labels swap', () => {
  assert.equal(
    remapAnalysis('选项A和C正确, B项不正确.\nD: 另一选项.', labels),
    '选项C和B正确, D项不正确.\nA: 另一选项.',
  );
  assert.equal(
    remapAnalysis('Options A and C are correct. The answer is A. B is incorrect.', labels),
    'Options C and B are correct. The answer is C. D is incorrect.',
  );
  assert.equal(remapAnalysis('正确答案:AC', labels), '正确答案:CB');
  assert.equal(
    remapAnalysis('A: correct; B: incorrect; C: correct.', labels),
    'C: correct; D: incorrect; B: correct.',
  );
});

test('English articles, acronyms, identifiers and unknown references stay unchanged', () => {
  const analysis = 'A company uses AWS Glue DataBrew, S3, EC2 and a Class A network. Option Z is unavailable.';
  assert.equal(remapAnalysis(analysis, labels), analysis);
  assert.equal(remapAnalysis('A: Use S3.', {}), 'A: Use S3.');
  assert.equal(remapAnalysis('', labels), '');
});
