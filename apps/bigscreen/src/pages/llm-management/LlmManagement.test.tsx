import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import LlmManagement from '../LlmManagement';

const { mockControllers } = vi.hoisted(() => ({
  mockControllers: {
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    updateScore: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
  },
}));

vi.mock('@sker/core', async () => {
  const actual = await vi.importActual<typeof import('@sker/core')>('@sker/core');
  return {
    ...actual,
    root: {
      get: vi.fn(() => mockControllers),
    },
  };
});

vi.mock('@sker/sdk', () => ({
  LlmProvidersController: class LlmProvidersController {},
  LlmModelsController: class LlmModelsController {},
  LlmModelProvidersController: class LlmModelProvidersController {},
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/components/PromptAnalysisDialog', () => ({
  PromptAnalysisDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="prompt-analysis-dialog" /> : null,
}));

const provider = {
  id: 'p1',
  name: '测试提供商',
  protocol: 'anthropic',
  base_url: 'https://api.example.com',
  api_key: 'key',
  score: 900,
};

const model = {
  id: 'm1',
  name: '测试模型',
};

const binding = {
  id: 'b1',
  modelId: 'm1',
  providerId: 'p1',
  modelName: 'gpt-4o',
  tierLevel: 1,
  supportsThinking: false,
  enabled: true,
  model: { id: 'm1', name: '测试模型' },
  provider: { id: 'p1', name: '测试提供商' },
};

describe('LlmManagement', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockControllers.findAll.mockResolvedValue([]);
    mockControllers.create.mockResolvedValue(undefined);
    mockControllers.update.mockResolvedValue(undefined);
    mockControllers.remove.mockResolvedValue(undefined);
    mockControllers.updateScore.mockResolvedValue(undefined);
    mockControllers.enable.mockResolvedValue(undefined);
    mockControllers.disable.mockResolvedValue(undefined);
  });

  it('renders provider/model/binding sections after loading', async () => {
    render(<LlmManagement />);

    expect(await screen.findByText('绑定关系')).toBeInTheDocument();
    expect(screen.getAllByText('提供商').length).toBeGreaterThan(0);
    expect(screen.getAllByText('模型').length).toBeGreaterThan(0);
    expect(screen.getAllByText('添加')).toHaveLength(3);
  });

  it('adds a provider through the dialog', async () => {
    const user = userEvent.setup();
    render(<LlmManagement />);

    await screen.findByText('绑定关系');

    const addButtons = screen.getAllByText('添加');
    await user.click(addButtons[0]);

    await screen.findByText('添加提供商', {}, { timeout: 5000 });
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('名称'), '新提供商');
    await user.type(within(dialog).getByPlaceholderText('Base URL'), 'https://new.example.com');
    await user.click(within(dialog).getByText('添加'));

    await waitFor(() => {
      expect(mockControllers.create).toHaveBeenCalledWith({
        name: '新提供商',
        protocol: 'anthropic',
        base_url: 'https://new.example.com',
        api_key: '',
      });
    });
  }, 15000);

  it('deletes a provider through the delete dialog', async () => {
    mockControllers.findAll
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const user = userEvent.setup();
    const { container } = render(<LlmManagement />);

    await screen.findByText('测试提供商');

    const trashButton = (container.querySelector('svg.lucide-trash') as HTMLElement)?.closest('button');
    expect(trashButton).not.toBeNull();
    await user.click(trashButton!);

    await screen.findByText('确认删除');
    await user.click(screen.getByRole('button', { name: '删除' }));

    await waitFor(() => {
      expect(mockControllers.remove).toHaveBeenCalledWith('p1');
    });
  });

  it('disables a binding through the enabled toggle', async () => {
    mockControllers.findAll
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([model])
      .mockResolvedValueOnce([binding]);
    const user = userEvent.setup();
    render(<LlmManagement />);

    await screen.findByTitle('点击禁用');
    await user.click(screen.getByTitle('点击禁用'));

    await waitFor(() => {
      expect(mockControllers.disable).toHaveBeenCalledWith('b1');
    });
  });

  it('opens the prompt analysis dialog', async () => {
    const user = userEvent.setup();
    render(<LlmManagement />);

    await screen.findByText('绑定关系');
    await user.click(screen.getByText('提示词分析'));

    expect(screen.getByTestId('prompt-analysis-dialog')).toBeInTheDocument();
  });
});
