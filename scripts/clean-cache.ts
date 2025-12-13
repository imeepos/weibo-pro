#!/usr/bin/env tsx

import { rmSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

function log(message: string, color: keyof typeof colors = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logTitle(message: string) {
  log(`\n${colors.bgBlue}${colors.bright}${message}${colors.reset}`, 'white');
}

function removeIfExists(path: string): boolean {
  try {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
      return true;
    }
    return false;
  } catch (error) {
    logError(`Failed to remove ${path}: ${error}`);
    return false;
  }
}

function main() {
  logTitle('🧹 Weibo-Pro 缓存清理工具');
  logInfo('开始清理项目中的所有缓存文件和目录...\n');

  const projectRoot = process.cwd();
  const appsDir = join(projectRoot, 'apps');
  const packagesDir = join(projectRoot, 'packages');

  let totalRemoved = 0;

  // 1. 清理根目录 node_modules
  logInfo('1. 清理根目录 node_modules...');
  const rootNodeModules = join(projectRoot, 'node_modules');
  if (existsSync(rootNodeModules)) {
    try {
      // 尝试删除，如果失败则跳过
      rmSync(rootNodeModules, { recursive: true, force: true });
      totalRemoved++;
      logSuccess('已删除根目录 node_modules');
    } catch (error) {
      logWarning(`根目录 node_modules 清理失败（权限不足或文件被占用），请在关闭相关进程后手动删除`);
      log(`   路径: ${rootNodeModules}`, 'dim');
      log(`   提示: 请关闭正在运行的应用后再尝试清理`, 'dim');
    }
  } else {
    log(`   未找到根目录 node_modules`, 'dim');
  }

  // 2. 清理 apps 下的所有 node_modules
  logInfo('\n2. 清理 apps 下的所有 node_modules...');
  if (existsSync(appsDir)) {
    const apps = readdirSync(appsDir);
    apps.forEach(app => {
      const appPath = join(appsDir, app, 'node_modules');
      if (removeIfExists(appPath)) {
        totalRemoved++;
        logSuccess(`已删除 apps/${app}/node_modules`);
      }
    });
  }

  // 3. 清理 packages 下的所有 node_modules
  logInfo('\n3. 清理 packages 下的所有 node_modules...');
  if (existsSync(packagesDir)) {
    const packages = readdirSync(packagesDir);
    packages.forEach(pkg => {
      const pkgPath = join(packagesDir, pkg, 'node_modules');
      if (removeIfExists(pkgPath)) {
        totalRemoved++;
        logSuccess(`已删除 packages/${pkg}/node_modules`);
      }
    });
  }

  // 4. 清理 .turbo 缓存
  logInfo('\n4. 清理 .turbo 缓存...');
  const turboPaths = [
    join(projectRoot, '.turbo', 'cache'),
    join(projectRoot, '.turbo', 'daemon'),
    join(projectRoot, '.turbo') // 删除整个 .turbo 目录（如果为空）
  ];

  turboPaths.forEach(path => {
    if (removeIfExists(path)) {
      totalRemoved++;
      logSuccess(`已删除 ${path}`);
    }
  });

  // 5. 清理 apps 和 packages 下的 .turbo 目录
  logInfo('\n5. 清理 apps 和 packages 下的 .turbo 目录...');

  // 清理 apps 下的 .turbo
  if (existsSync(appsDir)) {
    const apps = readdirSync(appsDir);
    apps.forEach(app => {
      const turboDir = join(appsDir, app, '.turbo');
      if (existsSync(turboDir)) {
        // 删除 .turbo 下的所有文件（除了可能的配置文件）
        const turboFiles = readdirSync(turboDir);
        turboFiles.forEach(file => {
          if (file !== 'turbo.json') { // 保留配置文件
            const filePath = join(turboDir, file);
            if (removeIfExists(filePath)) {
              totalRemoved++;
              logSuccess(`已删除 apps/${app}/.turbo/${file}`);
            }
          }
        });
      }
    });
  }

  // 清理 packages 下的 .turbo
  if (existsSync(packagesDir)) {
    const packages = readdirSync(packagesDir);
    packages.forEach(pkg => {
      const turboDir = join(packagesDir, pkg, '.turbo');
      if (existsSync(turboDir)) {
        const turboFiles = readdirSync(turboDir);
        turboFiles.forEach(file => {
          const filePath = join(turboDir, file);
          if (removeIfExists(filePath)) {
            totalRemoved++;
            logSuccess(`已删除 packages/${pkg}/.turbo/${file}`);
          }
        });
      }
    });
  }

  // 6. 清理 dist 目录
  logInfo('\n6. 清理 dist 目录...');
  const distPaths: string[] = [];

  // 根目录 dist
  distPaths.push(join(projectRoot, 'dist'));

  // apps 下的 dist
  if (existsSync(appsDir)) {
    const apps = readdirSync(appsDir);
    apps.forEach(app => {
      distPaths.push(join(appsDir, app, 'dist'));
    });
  }

  // packages 下的 dist
  if (existsSync(packagesDir)) {
    const packages = readdirSync(packagesDir);
    packages.forEach(pkg => {
      distPaths.push(join(packagesDir, pkg, 'dist'));
    });
  }

  distPaths.forEach(path => {
    if (removeIfExists(path)) {
      totalRemoved++;
      logSuccess(`已删除 ${path}`);
    }
  });

  // 7. 清理 .next, .nuxt, .vite 等构建缓存
  logInfo('\n7. 清理构建缓存...');
  const buildCachePatterns = [
    '.next', '.nuxt', '.vite', '.svelte-kit', '.svelte', 'build', 'out'
  ];

  buildCachePatterns.forEach(pattern => {
    const path = join(projectRoot, pattern);
    if (removeIfExists(path)) {
      totalRemoved++;
      logSuccess(`已删除 ${pattern}`);
    }
  });

  // 8. 清理 apps 和 packages 下的构建缓存
  if (existsSync(appsDir)) {
    const apps = readdirSync(appsDir);
    apps.forEach(app => {
      buildCachePatterns.forEach(pattern => {
        const path = join(appsDir, app, pattern);
        if (removeIfExists(path)) {
          totalRemoved++;
          logSuccess(`已删除 apps/${app}/${pattern}`);
        }
      });
    });
  }

  if (existsSync(packagesDir)) {
    const packages = readdirSync(packagesDir);
    packages.forEach(pkg => {
      buildCachePatterns.forEach(pattern => {
        const path = join(packagesDir, pkg, pattern);
        if (removeIfExists(path)) {
          totalRemoved++;
          logSuccess(`已删除 packages/${pkg}/${pattern}`);
        }
      });
    });
  }

  // 9. 清理 storybook 缓存
  logInfo('\n8. 清理 Storybook 缓存...');
  const storybookCache = join(projectRoot, 'node_modules', '.cache');
  if (removeIfExists(storybookCache)) {
    totalRemoved++;
    logSuccess('已删除 node_modules/.cache');
  }

  // 10. 清理 pnpm 缓存
  logInfo('\n9. 清理 pnpm 缓存...');
  const pnpmCache = join(projectRoot, 'node_modules', '.pnpm');
  if (removeIfExists(pnpmCache)) {
    totalRemoved++;
    logSuccess('已删除 node_modules/.pnpm');
  }

  // 11. 清理其他常见缓存
  logInfo('\n10. 清理其他缓存...');
  const otherCaches = [
    'coverage',
    '.coverage',
    'node_modules/.cache',
    'node_modules/.vite',
    'node_modules/.tsbuildinfo',
    '.tsbuildinfo'
  ];

  otherCaches.forEach(cache => {
    const path = join(projectRoot, cache);
    if (removeIfExists(path)) {
      totalRemoved++;
      logSuccess(`已删除 ${cache}`);
    }
  });

  // 12. 清理 apps 和 packages 下的其他缓存
  if (existsSync(appsDir)) {
    const apps = readdirSync(appsDir);
    apps.forEach(app => {
      otherCaches.forEach(cache => {
        const path = join(appsDir, app, cache);
        if (removeIfExists(path)) {
          totalRemoved++;
          logSuccess(`已删除 apps/${app}/${cache}`);
        }
      });
    });
  }

  if (existsSync(packagesDir)) {
    const packages = readdirSync(packagesDir);
    packages.forEach(pkg => {
      otherCaches.forEach(cache => {
        const path = join(packagesDir, pkg, cache);
        if (removeIfExists(path)) {
          totalRemoved++;
          logSuccess(`已删除 packages/${pkg}/${cache}`);
        }
      });
    });
  }

  logTitle('\n🧹 清理完成');
  logSuccess(`成功删除 ${totalRemoved} 个缓存目录/文件`);
  logInfo('建议执行以下命令重新安装依赖：');
  log(`   pnpm install`, 'bright');
  log('\n注意：');
  log('   - .git 目录已自动保留，不会删除', 'dim');
  log('   - Docker 相关文件已保留，不会删除', 'dim');
  log('   - 锁定文件（pnpm-lock.yaml）已保留，不会删除', 'dim');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    logError(`执行失败: ${error}`);
    process.exit(1);
  }
}