const sampleDocument = '企业知识手册素材包.pdf';

const uploadZone = document.querySelector('#uploadZone');
const supplementUploadZone = document.querySelector('#supplementUploadZone');
const supplementEntryTop = document.querySelector('#supplementEntryTop');
const revealFlow = document.querySelector('#revealFlow');
const documentName = document.querySelector('#documentName');
const supplementDocumentName = document.querySelector('#supplementDocumentName');
const uploadStatus = document.querySelector('#uploadStatus');
const resetDemo = document.querySelector('#resetDemo');

function goToFlow(mode = 'initial') {
  const isSupplement = mode === 'supplement';
  const fileName = isSupplement ? '新增制度补充.docx' : sampleDocument;
  const targetLabel = isSupplement ? supplementDocumentName : documentName;
  targetLabel.textContent = fileName;
  uploadStatus.textContent = `${fileName} 已传向后台，正在进入流程界面`;
  const params = new URLSearchParams({
    autoplay: '1',
    mode,
    document: fileName,
  });
  window.location.href = `./flow.html?${params.toString()}`;
}

uploadZone.addEventListener('click', () => goToFlow('initial'));
revealFlow.addEventListener('click', () => goToFlow('initial'));
supplementUploadZone.addEventListener('click', () => goToFlow('supplement'));
supplementEntryTop.addEventListener('click', () => goToFlow('supplement'));
resetDemo.addEventListener('click', () => {
  documentName.textContent = '上传原始文档';
  supplementDocumentName.textContent = '上传补充材料';
  uploadStatus.textContent = '等待上传文档进入后台';
});
