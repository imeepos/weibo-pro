const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

/**
 * 迁移脚本：将 AST 方法调用替换为工具函数调用
 *
 * 优雅设计：
 * - 自动化迁移，减少人工错误
 * - 保留代码格式和注释
 * - 智能导入管理，只在需要时添加导入
 */

async function migrateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // 检查是否使用了需要迁移的方法
    const usesSetError = /\.setError\(/.test(content);
    const usesGetDeepError = /\.getDeepError\(\)/.test(content);
    const usesGetErrorDescription = /\.getErrorDescription\(\)/.test(content);

    if (!usesSetError && !usesGetDeepError && !usesGetErrorDescription) {
        return false; // 不需要迁移
    }

    // 1. 添加导入（如果尚未导入）
    const importsToAdd = [];
    if (usesSetError) importsToAdd.push('setAstError');
    if (usesGetDeepError) importsToAdd.push('getAstDeepError');
    if (usesGetErrorDescription) importsToAdd.push('getAstErrorDescription');

    // 检查是否已经从 @sker/workflow 导入
    const workflowImportMatch = content.match(/from ['"]@sker\/workflow['"]/);
    if (workflowImportMatch) {
        // 找到导入语句的位置
        const importLine = content.substring(0, workflowImportMatch.index).split('\n').length - 1;
        const lines = content.split('\n');

        // 检查是否已经导入了这些函数
        const currentImport = lines[importLine];
        const alreadyImported = importsToAdd.filter(imp => currentImport.includes(imp));
        const needsImport = importsToAdd.filter(imp => !alreadyImported.includes(imp));

        if (needsImport.length > 0) {
            // 在现有导入中添加
            lines[importLine] = lines[importLine].replace(
                /from ['"]@sker\/workflow['"]/,
                (match) => {
                    const imports = lines[importLine].match(/import\s+{([^}]+)}/);
                    if (imports) {
                        const existingImports = imports[1].trim().split(',').map(s => s.trim());
                        const allImports = [...new Set([...existingImports, ...needsImport])].join(', ');
                        return `from '@sker/workflow'`;
                    }
                    return match;
                }
            );
            content = lines.join('\n');
            modified = true;
        }
    }

    // 2. 替换方法调用
    if (usesSetError) {
        // ast.setError(error) -> setAstError(ast, error)
        // ast.setError(error, includeStack) -> setAstError(ast, error, includeStack)
        content = content.replace(
            /(\w+)\.setError\(([^)]+)\)/g,
            (match, astVar, args) => {
                return `setAstError(${astVar}, ${args})`;
            }
        );
        modified = true;
    }

    if (usesGetDeepError) {
        // ast.getDeepError() -> getAstDeepError(ast)
        content = content.replace(
            /(\w+)\.getDeepError\(\)/g,
            (match, astVar) => {
                return `getAstDeepError(${astVar})`;
            }
        );
        modified = true;
    }

    if (usesGetErrorDescription) {
        // ast.getErrorDescription() -> getAstErrorDescription(ast)
        content = content.replace(
            /(\w+)\.getErrorDescription\(\)/g,
            (match, astVar) => {
                return `getAstErrorDescription(${astVar})`;
            }
        );
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ 已迁移: ${filePath}`);
        return true;
    }

    return false;
}

async function main() {
    const packagesDir = path.join(__dirname, '../packages');

    // 查找所有 TypeScript 文件
    const files = await glob('**/*.ts', {
        cwd: packagesDir,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
    });

    console.log(`找到 ${files.length} 个 TypeScript 文件`);

    let migratedCount = 0;
    for (const file of files) {
        try {
            const migrated = await migrateFile(file);
            if (migrated) {
                migratedCount++;
            }
        } catch (error) {
            console.error(`❌ 迁移失败: ${file}`, error.message);
        }
    }

    console.log(`\n迁移完成！共迁移 ${migratedCount} 个文件`);
}

main().catch(console.error);
