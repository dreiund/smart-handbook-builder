import {
  BOOK_URL,
  answerQuestion,
  completeStep,
  createInitialState,
  revealFlow,
  startUpload,
} from './flowState.js?v=2';

const params = new URLSearchParams(window.location.search);
const initialDocument = params.get('document') || '企业知识手册素材包.pdf';
const flowMode = params.get('mode') === 'supplement' ? 'supplement' : 'initial';
let state = revealFlow(startUpload(createInitialState(), initialDocument, { mode: flowMode }));
let processTimer = null;
let consoleLines = ['[upload] 示例文档进入后台'];

const elements = {
  statusLabel: document.querySelector('#statusLabel'),
  replayFlow: document.querySelector('#replayFlow'),
  flowTitle: document.querySelector('#flowTitle'),
  flowIntro: document.querySelector('#flowIntro'),
  flowBoardCopy: document.querySelector('#flowBoardCopy'),
  documentName: document.querySelector('#documentName'),
  uploadStatus: document.querySelector('#uploadStatus'),
  stepList: document.querySelector('#stepList'),
  consoleLines: document.querySelector('#consoleLines'),
  databaseStatus: document.querySelector('#databaseStatus'),
  openDatabase: document.querySelector('#openDatabase'),
  databaseDialog: document.querySelector('#databaseDialog'),
  closeDatabase: document.querySelector('#closeDatabase'),
  databaseGroups: document.querySelector('#databaseGroups'),
  manualStatus: document.querySelector('#manualStatus'),
  openManual: document.querySelector('#openManual'),
  questionInput: document.querySelector('#questionInput'),
  askQuestion: document.querySelector('#askQuestion'),
  answerBox: document.querySelector('#answerBox'),
  sourceList: document.querySelector('#sourceList'),
};

function clearProcessingTimer() {
  if (processTimer) {
    clearTimeout(processTimer);
    processTimer = null;
  }
}

function appendConsole(line) {
  consoleLines = [...consoleLines.slice(-8), line];
}

function renderSteps() {
  elements.stepList.innerHTML = state.steps
    .map((step, index) => {
      const statusClass =
        step.status === 'complete' ? 'is-complete' : step.status === 'active' ? 'is-active' : '';
      return `
        <div class="step-card ${statusClass}" data-kind="${step.kind}">
          <span class="step-index">${String(index + 1).padStart(2, '0')}</span>
          <strong>${step.label}</strong>
          <p>${step.description}</p>
        </div>
      `;
    })
    .join('');
}

function renderConsole() {
  elements.consoleLines.innerHTML = consoleLines.map((line) => `<p>${line}</p>`).join('');
}

function groupDatabaseChunks() {
  return state.database.chunks.reduce((groups, chunk) => {
    const next = { ...groups };
    next[chunk.type] = [...(next[chunk.type] || []), chunk];
    return next;
  }, {});
}

function renderDatabase() {
  elements.databaseStatus.textContent = state.actions.canOpenDatabase
    ? `已写入 ${state.database.items} 条知识，可按类型查看分类数据。`
    : '数据到达 `写入数据库` 后可打开分类数据。';
  elements.openDatabase.disabled = !state.actions.canOpenDatabase;

  const groups = groupDatabaseChunks();
  elements.databaseGroups.innerHTML = Object.entries(groups)
    .map(
      ([type, chunks]) => `
        <section class="database-group">
          <h3>${type}</h3>
          ${chunks
            .map(
              (chunk) => `
                <div class="chunk-item">
                  <span>${chunk.title}</span>
                  <strong>${chunk.relation}</strong>
                </div>
              `,
            )
            .join('')}
        </section>
      `,
    )
    .join('');
}

function renderManual() {
  elements.manualStatus.textContent = state.actions.canOpenManual
    ? '电子手册已生成，可打开外部页面。'
    : '生成电子手册后可打开外部手册页面。';
  elements.openManual.disabled = !state.actions.canOpenManual;
  elements.openManual.dataset.targetUrl = BOOK_URL;
}

function renderQa() {
  elements.answerBox.textContent = state.qa.answer || '请先完成电子手册构建。';
  elements.sourceList.innerHTML = state.qa.sources
    .map((source) => `<div class="source-item">引用来源：${source}</div>`)
    .join('');
}

function render() {
  elements.statusLabel.textContent = state.statusLabel;
  elements.flowTitle.textContent = state.flowMode === 'supplement' ? '补充材料更新数据库' : '完整数据流动';
  elements.flowIntro.textContent = state.flowMode === 'supplement'
    ? '补充材料已进入后台。这个界面展示补充文件如何重新经过处理链路，并在写入数据库后更新分类数据。'
    : '文档已进入后台。这个界面只展示流程变化：当数据到达数据库和电子手册节点时，会出现对应操作按钮。';
  elements.flowBoardCopy.textContent = state.flowMode === 'supplement'
    ? '补充材料会按同一条链路处理。到达第 6 步时可打开数据库查看补充文件分类。'
    : '步骤会按顺序点亮。到达第 6 步时可打开数据库；到达第 11 步时可打开电子手册网址。';
  elements.documentName.textContent = state.documentName;
  elements.uploadStatus.textContent = state.uploaded
    ? `${state.documentName} 已传向后台`
    : '等待上传文档进入后台';
  renderSteps();
  renderConsole();
  renderDatabase();
  renderManual();
  renderQa();
}

function markStepActive(stepIndex) {
  state = {
    ...state,
    activeStep: stepIndex,
    statusLabel: state.steps[stepIndex].label,
    steps: state.steps.map((step, index) => {
      if (index < stepIndex) {
        return { ...step, status: 'complete' };
      }
      if (index === stepIndex) {
        return { ...step, status: 'active' };
      }
      return { ...step, status: 'pending' };
    }),
  };
}

function runPipeline(stepIndex = 0) {
  if (stepIndex >= state.steps.length) {
    appendConsole('[qa] 多模态系统已接入，可开始提问');
    render();
    return;
  }

  markStepActive(stepIndex);
  appendConsole(`[step ${String(stepIndex + 1).padStart(2, '0')}] ${state.steps[stepIndex].label} ...`);
  render();

  processTimer = setTimeout(() => {
    state = completeStep(state, stepIndex);
    appendConsole(`[done] ${state.steps[stepIndex].label}`);
    if (state.actions.canOpenDatabase && stepIndex === 5) {
      appendConsole('[action] 打开数据库按钮已出现');
    }
    if (state.actions.canOpenManual && stepIndex === 10) {
      appendConsole('[action] 打开电子手册按钮已出现');
    }
    render();
    runPipeline(stepIndex + 1);
  }, stepIndex < 6 ? 520 : 420);
}

function startFlow() {
  clearProcessingTimer();
  state = revealFlow(startUpload(createInitialState(), initialDocument, { mode: flowMode }));
  consoleLines = [
    state.flowMode === 'supplement'
      ? '[upload] 补充材料进入后台，准备更新数据库'
      : '[upload] 示例文档进入后台',
  ];
  render();
  processTimer = setTimeout(() => runPipeline(0), 260);
}

function askCurrentQuestion() {
  const question = elements.questionInput.value.trim() || '电子手册里有什么内容？';
  state = answerQuestion(state, question);
  render();
}

elements.replayFlow.addEventListener('click', startFlow);
elements.openDatabase.addEventListener('click', () => {
  if (!state.actions.canOpenDatabase) return;
  elements.databaseDialog.showModal();
});
elements.closeDatabase.addEventListener('click', () => {
  elements.databaseDialog.close();
});
elements.openManual.addEventListener('click', () => {
  if (!state.actions.canOpenManual) return;
  window.open(BOOK_URL, '_blank', 'noopener,noreferrer');
});
elements.askQuestion.addEventListener('click', askCurrentQuestion);
elements.questionInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    askCurrentQuestion();
  }
});
render();
if (params.get('autoplay') !== '0') {
  startFlow();
}
