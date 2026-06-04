export const BOOK_URL =
  'https://web.mxrcorp.cn/mxrszpt-web/index.html#/book?guid=A1ACBE4FA7864770AE50D1D17B409338&lan=zh';

const PIPELINE_STEPS = [
  {
    label: '格式分类',
    description: '识别 PDF、Word、图片、表格、Markdown 等入口类型',
    kind: 'ingest',
  },
  {
    label: 'PaddleOCR介入',
    description: '对图片和扫描件执行文字识别',
    kind: 'extract',
  },
  {
    label: '得到Markdown',
    description: '统一转写为可分块的结构化 Markdown',
    kind: 'extract',
  },
  {
    label: 'Embeddings接入模型',
    description: '生成语义向量，准备进入知识库',
    kind: 'model',
  },
  {
    label: '资料分块',
    description: '按制度、流程、图片说明、表格等类型切分资料',
    kind: 'manual',
  },
  {
    label: '写入数据库',
    description: '保存文档、向量、元数据和处理记录',
    kind: 'database',
  },
  {
    label: '检测关联度',
    description: '比较块之间的语义距离和引用关系',
    kind: 'manual',
  },
  {
    label: '高关联内容聚合',
    description: '把高关联内容放到同一章节候选组',
    kind: 'manual',
  },
  {
    label: '重排序',
    description: '按阅读路径和重要度重排章节',
    kind: 'manual',
  },
  {
    label: '设计版面',
    description: '生成封面、目录、章节和引用版式',
    kind: 'manual',
  },
  {
    label: '生成电子手册',
    description: '输出可检索、可提问的电子手册',
    kind: 'manual',
  },
  {
    label: '多模态提问',
    description: '基于电子手册内容回答文字、图片和表格问题',
    kind: 'qa',
  },
];

const DATABASE_CHUNKS = [
  { type: '制度', title: '售后响应制度', relation: '96%' },
  { type: '流程', title: '客户工单升级路径', relation: '93%' },
  { type: '图片说明', title: '设备面板标识图解', relation: '88%' },
  { type: '表格', title: '服务等级对照表', relation: '85%' },
];

const MANUAL_SECTIONS = [
  { title: '第一章：服务制度总览', score: '96%', blocks: 8 },
  { title: '第二章：工单处理流程', score: '93%', blocks: 10 },
  { title: '第三章：设备图示与说明', score: '88%', blocks: 7 },
  { title: '第四章：服务等级与表格索引', score: '85%', blocks: 7 },
];

function createSteps() {
  return PIPELINE_STEPS.map((step, index) => ({
    ...step,
    id: `step-${index + 1}`,
    status: 'pending',
  }));
}

export function createInitialState() {
  return {
    uploaded: false,
    flowVisible: false,
    flowMode: 'initial',
    documentName: '',
    activeStep: -1,
    statusLabel: '知识库待同步',
    steps: createSteps(),
    database: {
      items: 0,
      chunks: [],
      synced: false,
    },
    manual: {
      ready: false,
      syncing: false,
      url: BOOK_URL,
      sections: [],
    },
    qa: {
      ready: false,
      lastQuestion: '',
      answer: '',
      sources: [],
    },
    actions: {
      canOpenDatabase: false,
      canOpenManual: false,
    },
    supplements: [],
  };
}

export function startUpload(
  state = createInitialState(),
  documentName = '企业知识手册素材包.pdf',
  options = {},
) {
  const flowMode = options.mode === 'supplement' ? 'supplement' : 'initial';
  return {
    ...state,
    uploaded: true,
    flowMode,
    documentName,
    statusLabel: flowMode === 'supplement' ? '补充材料已上传' : '文档已上传',
  };
}

export function revealFlow(state) {
  const uploadedState = state.uploaded ? state : startUpload(state);
  return {
    ...uploadedState,
    flowVisible: true,
    statusLabel: '流程已展开',
  };
}

export function completeStep(state, stepIndex) {
  const boundedIndex = Math.max(0, Math.min(stepIndex, state.steps.length - 1));
  const steps = state.steps.map((step, index) => {
    if (index <= boundedIndex) {
      return { ...step, status: 'complete' };
    }
    if (index === boundedIndex + 1) {
      return { ...step, status: 'active' };
    }
    return { ...step, status: 'pending' };
  });
  const allComplete = boundedIndex === steps.length - 1;
  const databaseReady = boundedIndex >= 5;
  const manualReady = boundedIndex >= 10;
  const qaReady = allComplete;
  const isSupplementMode = state.flowMode === 'supplement';
  const databaseChunks = isSupplementMode
    ? [
        ...DATABASE_CHUNKS,
        { type: '补充文件', title: state.documentName, relation: '91%' },
      ]
    : DATABASE_CHUNKS;

  return {
    ...state,
    activeStep: boundedIndex,
    statusLabel: databaseReady && isSupplementMode && !allComplete
      ? '补充材料已写入数据库'
      : allComplete
        ? '电子手册已生成'
        : steps[boundedIndex].label,
    steps,
    database: databaseReady
      ? {
          items: databaseChunks.length === DATABASE_CHUNKS.length ? 32 : 33,
          chunks: databaseChunks,
          synced: true,
        }
      : state.database,
    manual: manualReady
      ? {
          ready: true,
          syncing: false,
          url: BOOK_URL,
          sections: MANUAL_SECTIONS,
        }
      : state.manual,
    qa: qaReady
      ? {
          ...state.qa,
          ready: true,
          sources: ['第一章：服务制度总览', '第二章：工单处理流程'],
        }
      : state.qa,
    actions: {
      canOpenDatabase: databaseReady,
      canOpenManual: manualReady,
    },
  };
}

export function answerQuestion(state, question) {
  if (!state.qa.ready) {
    return {
      ...state,
      qa: {
        ...state.qa,
        lastQuestion: question,
        answer: '请先完成电子手册构建，再进行多模态提问。',
      },
    };
  }

  return {
    ...state,
    qa: {
      ...state.qa,
      lastQuestion: question,
      answer:
        '根据已生成的电子手册，售后问题应先进入客户工单升级路径，再按服务等级对照表判断响应时限；涉及设备图片时可引用设备面板标识图解辅助定位。',
      sources: ['第二章：工单处理流程', '第四章：服务等级与表格索引'],
    },
  };
}

export function addSupplement(state, title) {
  const supplement = {
    title,
    fileName: title,
    status: state.manual.ready ? 'syncing' : 'queued',
  };

  return {
    ...state,
    statusLabel: state.manual.ready ? '补充知识同步中' : '请先完成首次构建',
    database: {
      ...state.database,
      items: state.database.items + (state.manual.ready ? 1 : 0),
      chunks: state.manual.ready
        ? [
            ...state.database.chunks,
            { type: '补充文件', title, relation: '91%' },
          ]
        : state.database.chunks,
    },
    manual: {
      ...state.manual,
      syncing: state.manual.ready,
    },
    supplements: [...state.supplements, supplement],
  };
}

export function resetFlow() {
  return createInitialState();
}
