import { vi } from 'vitest';

// --- Mock LLM / langchain / workflow deps so nothing hits a real service ---
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(
    class {
      config: unknown;
      withStructuredOutput: () => unknown;
      constructor(config?: unknown) {
        this.config = config;
        this.withStructuredOutput = () => this;
      }
    }
  ),
}));

vi.mock('@langchain/langgraph', () => ({
  MemorySaver: vi.fn(class MemorySaver {}),
}));

vi.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: vi.fn(() => ({ invoke: vi.fn() })),
}));

vi.mock('@langchain/core/tools', () => ({
  tool: vi.fn((fn: unknown, config: Record<string, unknown>) => ({
    ...config,
    invoke: fn,
  })),
}));

vi.mock('@sker/workflow', () => ({
  getAllNodeTypes: vi.fn(() => []),
  findNodeType: vi.fn(() => undefined),
  NODE: Symbol('NODE'),
}));

vi.mock('@sker/workflow-compiler', () => ({
  compile: vi.fn(() => ({ success: true })),
}));

import { BaseGeneral } from '../../eight-generals';
import type {
  GeneralRole,
  AgentTask,
  AgentContext,
  AgentCapability,
} from '../../eight-generals';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

/** A controllable, LLM-free general used to test orchestration logic. */
export class FakeGeneral extends BaseGeneral {
  readonly role: GeneralRole;
  readonly description: string;

  /** Override-able hook for doExecute; records the tasks it receives. */
  public executeImpl?: (task: AgentTask, context: AgentContext) => Promise<unknown>;

  constructor(role: GeneralRole, description = 'fake general') {
    super(0.1);
    this.role = role;
    this.description = description;
    this.initState();
  }

  getCapabilities(): AgentCapability[] {
    return [{ name: 'fake', description: 'fake capability' }];
  }

  getTools() {
    return [];
  }

  protected async doExecute(task: AgentTask, context: AgentContext): Promise<unknown> {
    if (this.executeImpl) {
      return this.executeImpl(task, context);
    }
    return { handled: true, taskId: task.id };
  }
}

/** Default mock factory used by beforeEach to keep `createReactAgent` controllable. */
export const reactAgentInvoke = () => ({ invoke: vi.fn() });

/** Reset all mocks and restore default implementations before each test. */
export function setupMocks(): void {
  vi.clearAllMocks();
  vi.mocked(ChatOpenAI).mockImplementation(function (this: any) {
    this.withStructuredOutput = () => this;
    return this;
  });
  vi.mocked(createReactAgent).mockImplementation(reactAgentInvoke);
}
