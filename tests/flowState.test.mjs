import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOK_URL,
  createInitialState,
  revealFlow,
  startUpload,
  completeStep,
  answerQuestion,
  addSupplement,
  resetFlow,
} from '../flowState.js';

test('initial state keeps the pipeline hidden behind the upload layer', () => {
  const state = createInitialState();

  assert.equal(state.uploaded, false);
  assert.equal(state.flowVisible, false);
  assert.equal(state.activeStep, -1);
  assert.equal(state.database.items, 0);
  assert.equal(state.manual.ready, false);
  assert.equal(state.qa.ready, false);
});

test('upload and reveal expose the full simulated pipeline', () => {
  const uploaded = startUpload(createInitialState(), '企业知识手册素材包.pdf');
  const revealed = revealFlow(uploaded);

  assert.equal(revealed.uploaded, true);
  assert.equal(revealed.flowMode, 'initial');
  assert.equal(revealed.flowVisible, true);
  assert.equal(revealed.documentName, '企业知识手册素材包.pdf');
  assert.equal(revealed.steps.length, 12);
  assert.equal(revealed.steps[0].label, '格式分类');
  assert.equal(revealed.steps[4].label, '资料分块');
  assert.equal(revealed.steps[5].label, '写入数据库');
  assert.equal(revealed.steps.at(-1).label, '多模态提问');
});

test('supplement upload mode updates database with supplement file category', () => {
  let state = revealFlow(
    startUpload(createInitialState(), '新增制度补充.docx', { mode: 'supplement' }),
  );

  for (let index = 0; index <= 5; index += 1) {
    state = completeStep(state, index);
  }

  assert.equal(state.flowMode, 'supplement');
  assert.equal(state.statusLabel, '补充材料已写入数据库');
  assert.equal(state.database.synced, true);
  assert.equal(state.database.items, 33);
  assert.equal(state.database.chunks.at(-1).type, '补充文件');
  assert.equal(state.database.chunks.at(-1).title, '新增制度补充.docx');
  assert.equal(state.actions.canOpenDatabase, true);
});

test('database action appears only after data reaches write database step', () => {
  let state = revealFlow(startUpload(createInitialState(), '企业知识手册素材包.pdf'));

  for (let index = 0; index < 5; index += 1) {
    state = completeStep(state, index);
  }

  assert.equal(state.database.synced, false);
  assert.equal(state.actions.canOpenDatabase, false);

  state = completeStep(state, 5);

  assert.equal(state.database.synced, true);
  assert.equal(state.database.items, 32);
  assert.equal(state.actions.canOpenDatabase, true);
});

test('manual action appears after electronic manual generation and exposes configured URL', () => {
  let state = revealFlow(startUpload(createInitialState(), '企业知识手册素材包.pdf'));

  for (let index = 0; index <= 10; index += 1) {
    state = completeStep(state, index);
  }

  assert.equal(state.manual.ready, true);
  assert.equal(state.qa.ready, false);
  assert.equal(state.actions.canOpenManual, true);
  assert.equal(state.manual.url, BOOK_URL);
});

test('completing all steps keeps database, manual, and multimodal readiness populated', () => {
  let state = revealFlow(startUpload(createInitialState(), '企业知识手册素材包.pdf'));

  for (let index = 0; index < state.steps.length; index += 1) {
    state = completeStep(state, index);
  }

  assert.equal(state.activeStep, 11);
  assert.equal(state.steps.every((step) => step.status === 'complete'), true);
  assert.equal(state.database.items, 32);
  assert.equal(state.manual.ready, true);
  assert.equal(state.qa.ready, true);
  assert.equal(state.manual.sections.length, 4);
});

test('question answering requires the manual to be ready', () => {
  const blocked = answerQuestion(createInitialState(), '制度怎么查？');

  assert.equal(blocked.qa.lastQuestion, '制度怎么查？');
  assert.match(blocked.qa.answer, /请先完成电子手册构建/);
});

test('supplement adds one queued item and marks the manual as syncing', () => {
  let state = revealFlow(startUpload(createInitialState(), '企业知识手册素材包.pdf'));
  for (let index = 0; index < state.steps.length; index += 1) {
    state = completeStep(state, index);
  }

  const supplemented = addSupplement(state, '新增售后流程知识.docx');

  assert.equal(supplemented.supplements.length, 1);
  assert.equal(supplemented.supplements[0].fileName, '新增售后流程知识.docx');
  assert.equal(supplemented.database.items, 33);
  assert.equal(supplemented.database.chunks.at(-1).type, '补充文件');
  assert.equal(supplemented.database.chunks.at(-1).title, '新增售后流程知识.docx');
  assert.equal(supplemented.manual.syncing, true);
  assert.equal(supplemented.statusLabel, '补充知识同步中');
});

test('reset returns to the upload-first layered view', () => {
  const state = resetFlow(addSupplement(revealFlow(startUpload(createInitialState())), '新增知识'));

  assert.deepEqual(state, createInitialState());
});
