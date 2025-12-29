const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../packages/workflow-ast/src');
const analysisFile = path.join(__dirname, 'node-types-analysis.json');

// 读取分析结果
const analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf-8'));

// 定义新的文件夹结构映射
const typeFolderMap = {
  'llm': 'llm',
  'crawler': 'crawler',
  'basic': 'basic',
  'control': 'control',
  'sentiment': 'sentiment',
  'analysis': 'analysis',
  'scheduler': 'scheduler'
};

// 迁移日志
const migrationLog = {
  moved: [],
  errors: [],
  summary: {}
};

console.log('=== 开始重组文件夹结构 ===\n');

// 第一步：创建新的文件夹结构
console.log('步骤 1: 创建新的文件夹结构...');
Object.values(typeFolderMap).forEach(folder => {
  const folderPath = path.join(srcDir, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`  ✓ 创建文件夹: ${folder}/`);
  }
});

// 第二步：移动节点文件
console.log('\n步骤 2: 移动节点文件...');
analysis.nodeInfo.forEach(node => {
  const oldPath = path.join(srcDir, node.file);
  const newFolder = typeFolderMap[node.type];
  const newPath = path.join(srcDir, newFolder, node.fileName);

  try {
    // 检查源文件是否存在
    if (!fs.existsSync(oldPath)) {
      migrationLog.errors.push({
        file: node.fileName,
        error: '源文件不存在',
        oldPath: node.file
      });
      console.log(`  ✗ 源文件不存在: ${node.file}`);
      return;
    }

    // 如果目标文件已存在，跳过
    if (fs.existsSync(newPath)) {
      console.log(`  → 跳过 (已存在): ${node.fileName} -> ${newFolder}/`);
      migrationLog.moved.push({
        file: node.fileName,
        from: node.file,
        to: `${newFolder}/${node.fileName}`,
        status: 'skipped'
      });
      return;
    }

    // 复制文件（先复制后删除，确保安全）
    fs.copyFileSync(oldPath, newPath);
    fs.unlinkSync(oldPath);

    console.log(`  ✓ ${node.fileName} -> ${newFolder}/`);
    migrationLog.moved.push({
      file: node.fileName,
      from: node.file,
      to: `${newFolder}/${node.fileName}`,
      status: 'success'
    });
  } catch (error) {
    migrationLog.errors.push({
      file: node.fileName,
      error: error.message,
      oldPath: node.file
    });
    console.log(`  ✗ 移动失败: ${node.fileName} - ${error.message}`);
  }
});

// 第三步：生成新的 index.ts
console.log('\n步骤 3: 生成新的 index.ts...');

const exportStatements = [];
Object.entries(typeFolderMap).forEach(([type, folder]) => {
  const nodes = analysis.nodeInfo.filter(n => n.type === type);
  if (nodes.length > 0) {
    exportStatements.push(`// ${type.toUpperCase()} 节点 (${nodes.length}个)`);
    nodes.forEach(node => {
      const className = node.fileName.replace('.ts', '');
      exportStatements.push(`export { ${className} } from './${folder}/${className}';`);
    });
    exportStatements.push('');
  }
});

const indexContent = `/**
 * @sker/workflow-ast - 工作流节点定义
 *
 * 按 @Node 装饰器的 type 字段组织：
 * - llm: 大模型节点 (26个)
 * - crawler: 爬虫/数据采集节点 (16个)
 * - basic: 基础节点 (8个)
 * - sentiment: 舆情分析节点 (5个)
 * - control: 控制流节点 (2个)
 * - analysis: 分析节点 (1个)
 * - scheduler: 调度节点 (1个)
 */

${exportStatements.join('\n')}

// Meta 节点（保持原有导出）
export { LlmInferenceAst } from './meta/LlmInferenceAst';
export { MediaGenerateAst } from './meta/MediaGenerateAst';
export { TransformAst } from './meta/TransformAst';
export { RouteAst } from './meta/RouteAst';
export { AggregateAst } from './meta/AggregateAst';
export { HttpRequestAst } from './meta/HttpRequestAst';
`;

fs.writeFileSync(path.join(srcDir, 'index.ts'), indexContent);
console.log('  ✓ 生成 index.ts');

// 第四步：清理空文件夹
console.log('\n步骤 4: 清理空文件夹...');
function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // 递归清理子文件夹
  entries.forEach(entry => {
    if (entry.isDirectory()) {
      const fullPath = path.join(dir, entry.name);
      removeEmptyDirs(fullPath);
    }
  });

  // 检查当前文件夹是否为空
  const remainingEntries = fs.readdirSync(dir);
  if (remainingEntries.length === 0 && dir !== srcDir) {
    fs.rmdirSync(dir);
    const relativePath = path.relative(srcDir, dir);
    console.log(`  ✓ 删除空文件夹: ${relativePath}`);
  }
}

// 清理旧的文件夹结构
['01-data-sources', '02-data-processing', '03-ai-capabilities', '04-personas', '05-workflow-control', '06-ui-components'].forEach(folder => {
  const folderPath = path.join(srcDir, folder);
  removeEmptyDirs(folderPath);
});

// 生成迁移报告
migrationLog.summary = {
  total: analysis.nodeInfo.length,
  success: migrationLog.moved.filter(m => m.status === 'success').length,
  skipped: migrationLog.moved.filter(m => m.status === 'skipped').length,
  errors: migrationLog.errors.length
};

fs.writeFileSync(
  path.join(__dirname, 'migration-log.json'),
  JSON.stringify(migrationLog, null, 2)
);

console.log('\n=== 重组完成 ===');
console.log(`总节点数: ${migrationLog.summary.total}`);
console.log(`成功移动: ${migrationLog.summary.success}`);
console.log(`跳过 (已存在): ${migrationLog.summary.skipped}`);
console.log(`失败: ${migrationLog.summary.errors}`);

if (migrationLog.errors.length > 0) {
  console.log('\n错误详情:');
  migrationLog.errors.forEach(err => {
    console.log(`  - ${err.file}: ${err.error}`);
  });
}

console.log('\n迁移日志已保存到: scripts/migration-log.json');
