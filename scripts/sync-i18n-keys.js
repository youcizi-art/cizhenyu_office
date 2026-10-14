/**
 * 将 en.json 中的新增翻译键同步到所有其他语言文件。
 * 已存在的翻译键不会被覆盖，缺失的键用英文值作为 fallback。
 */
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '../messages');
const enPath = path.join(dir, 'en.json');

// 读取文件并移除 BOM
function readJson(filePath) {
  let raw = fs.readFileSync(filePath, 'utf8');
  // 移除 UTF-8 BOM
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1);
  }
  return JSON.parse(raw);
}

const en = readJson(enPath);

// 需要确保所有语言文件都有的键
const keysToSync = [
  'OnlineDocuments', 'CollapseSidebar', 'ExpandSidebar',
  'DocumentCategories', 'ExpandCategories', 'CollapseCategories',
  'AllDocuments', 'Uncategorized', 'RootDirectory',
  'NoCategories', 'NewCategory', 'NewTopCategory', 'NewSubcategory',
  'DeleteCategory',
  'UploadDocument', 'RefreshDocuments', 'SearchPlaceholder',
  'LoadingR2Docs', 'NoMatchingDocs', 'NoDocsInCategory',
  'TryAnotherSearch', 'UploadToCategoryHint', 'UploadLocalDoc',
  'EditOnline', 'DownloadFile', 'ShareLink', 'Rename',
  'MoveCategory', 'DeletePermanently', 'Public', 'PublicShareEnabled',
  'CreateCategoryTitle', 'RenameCategoryTitle', 'CategoryNamePlaceholder',
  'RenameDocTitle', 'DocNamePlaceholder', 'MoveDocTitle',
  'PublicShareTitle', 'DocumentLabel', 'DirectDownloadLink', 'DirectDownloadDesc',
  'EnableShare', 'DisableShare', 'ExclusiveShareUrl',
  'Copy', 'Copied',
  'UploadModalTitle', 'ClickToSelectDoc', 'SupportedFormatsHint',
  'ClickToReselect', 'SaveToCategoryLabel', 'ConfirmUpload', 'Uploading',
  'Cancel', 'Save',
  'PrivateWorkspace', 'EnterAccessKeyDesc', 'AccessKey',
  'EnterAccessKeyPlaceholder', 'UnlockSystem', 'Verifying',
  'AccessKeyProtected', 'InvalidAccessKey', 'DocumentsPageTitle',
  'All',
  'ConvertToWordEdit', 'ConvertingPdfToWord', 'ConvertSuccess',
  'ConvertFailed', 'PreviewAndAnnotate'
];

// 为 zh-CN 单独维护的中文翻译（需要正确的值）
const zhCNOverrides = {
  All: '全部',
  InvalidAccessKey: '访问密钥无效，请重试',
  DocumentsPageTitle: '在线文档库 — CIZHENYU Office',
  ConvertToWordEdit: '转为 Word 编辑',
  ConvertingPdfToWord: '正在将 PDF 转换为可编辑 Word 文档...',
  ConvertSuccess: 'PDF 已成功转为 Word，正在进入编辑模式...',
  ConvertFailed: '转换失败，请重试',
  PreviewAndAnnotate: '预览与批注',
};

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
let count = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  const content = readJson(filePath);
  let modified = false;

  for (const key of keysToSync) {
    if (!(key in content)) {
      // 如果是 zh-CN 且有单独的覆盖翻译，用中文
      if (file === 'zh-CN.json' && zhCNOverrides[key]) {
        content[key] = zhCNOverrides[key];
      } else {
        content[key] = en[key];
      }
      modified = true;
    }
  }

  if (modified) {
    // 不带 BOM 写入，保持 UTF-8 编码
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    count++;
    console.log('Updated:', file);
  }
}

console.log('\nTotal files updated:', count);
