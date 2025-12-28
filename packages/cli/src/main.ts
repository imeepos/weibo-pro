#!/usr/bin/env node
import { Command } from 'commander';
import { startDaemon, stopDaemon, getPid } from './daemon.js';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program.name('sker').description('Sker CLI daemon').version('0.0.1');

program.command('start').description('Start daemon').action(startDaemon);
program.command('stop').description('Stop daemon').action(stopDaemon);
program.command('restart').description('Restart daemon').action(() => {
  stopDaemon();
  setTimeout(startDaemon, 1000);
});
program.command('status').description('Check daemon status').action(() => {
  const pid = getPid();
  console.log(pid ? `Running (PID: ${pid})` : 'Not running');
});
program.command('logs').description('Tail logs').action(() => {
  const logFile = join(homedir(), '.sker', 'logs', 'sker.log');

  if (!existsSync(logFile)) {
    console.log('No logs found. Start the daemon first with: sker start');
    return;
  }

  spawn('tail', ['-f', logFile], { stdio: 'inherit' });
});

program.command('tui').description('Launch task manager UI').action(async () => {
  const { render } = await import('ink');
  const React = await import('react');
  const { Tui } = await import('./tui/index.js');
  const { TaskManager } = await import('./task-manager.js');
  const { TaskExecutor } = await import('./task-executor.js');

  const taskManager = new TaskManager({ maxConcurrent: 3 });
  const executor = new TaskExecutor(taskManager);

  await executor.start();

  const handleAddTask = (command: string) => {
    const taskId = `task-${Date.now()}`;
    taskManager.addTask({
      taskId,
      clientId: 'tui',
      command,
      timestamp: Date.now(),
    });
  };

  render(React.createElement(Tui, { taskManager, onAddTask: handleAddTask }));
});

program.parse();

