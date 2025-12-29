const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../packages/workflow-ast/src');
const nodeFiles = [];

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!['meta', 'types', 'templates'].includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith('.ts') &&
               !entry.name.endsWith('.test.ts') &&
               entry.name !== 'index.ts') {
      nodeFiles.push(fullPath);
    }
  }
}

scanDirectory(srcDir);

const nodeInfo = [];
const typeStats = {};
const noTypeNodes = [];

for (const filePath of nodeFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(srcDir, filePath);
  const fileName = path.basename(filePath);

  // 提取 @Node 装饰器中的 type
  const nodeMatch = content.match(/@Node\s*\(\s*\{[^}]*type:\s*['"]([^'"]+)['"]/);

  if (nodeMatch) {
    const type = nodeMatch[1];
    nodeInfo.push({ file: relativePath, fileName, type });
    typeStats[type] = (typeStats[type] || 0) + 1;
  } else {
    noTypeNodes.push({ file: relativePath, fileName });
  }
}

console.log('=== 节点 Type 分布统计 ===\n');
Object.entries(typeStats)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`${type}: ${count} 个节点`);
  });

console.log('\n=== 按 Type 分类的节点列表 ===\n');
Object.keys(typeStats).sort().forEach(type => {
  console.log(`\n【${type}】`);
  nodeInfo
    .filter(n => n.type === type)
    .forEach(n => console.log(`  - ${n.fileName} (${n.file})`));
});

console.log('\n=== 没有定义 Type 的节点 ===\n');
noTypeNodes.forEach(n => {
  console.log(`  - ${n.fileName} (${n.file})`);
});

console.log(`\n=== 统计摘要 ===`);
console.log(`总节点数: ${nodeFiles.length}`);
console.log(`有 type 的节点: ${nodeInfo.length}`);
console.log(`无 type 的节点: ${noTypeNodes.length}`);
console.log(`Type 种类数: ${Object.keys(typeStats).length}`);

// 输出 JSON 供后续使用
const output = {
  nodeInfo,
  typeStats,
  noTypeNodes,
  summary: {
    total: nodeFiles.length,
    withType: nodeInfo.length,
    withoutType: noTypeNodes.length,
    typeCount: Object.keys(typeStats).length
  }
};

fs.writeFileSync(
  path.join(__dirname, 'node-types-analysis.json'),
  JSON.stringify(output, null, 2)
);

console.log('\n分析结果已保存到: scripts/node-types-analysis.json');
