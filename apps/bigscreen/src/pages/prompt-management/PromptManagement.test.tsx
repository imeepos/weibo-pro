import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import PromptManagement from '../PromptManagement';

const { mockControllers } = vi.hoisted(() => ({
  mockControllers: {
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    addSkill: vi.fn(),
    removeSkill: vi.fn(),
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
  PromptRolesController: class PromptRolesController {},
  PromptSkillsController: class PromptSkillsController {},
}));

const role = {
  id: 'r1',
  role_id: 'system_assistant',
  name: '系统助手',
  description: '测试角色描述',
  personality: '友好',
  scope: 'user',
  skill_refs: [],
};

const skill = {
  id: 's1',
  name: 'web_search',
  title: '联网搜索',
  description: null,
  type: 'execution',
  content: '# 技能内容',
  scope: 'user',
};

describe('PromptManagement', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockControllers.findAll.mockResolvedValue([]);
    mockControllers.create.mockResolvedValue(undefined);
    mockControllers.update.mockResolvedValue(undefined);
    mockControllers.remove.mockResolvedValue(undefined);
    mockControllers.addSkill.mockResolvedValue(undefined);
    mockControllers.removeSkill.mockResolvedValue(undefined);
  });

  it('渲染角色/绑定/技能库三个区块', async () => {
    mockControllers.findAll.mockResolvedValueOnce([role]).mockResolvedValueOnce([skill]);
    render(<PromptManagement />);

    expect(await screen.findByText('系统助手')).toBeInTheDocument();
    expect(screen.getByText('联网搜索')).toBeInTheDocument();
    expect(screen.getByText('技能库')).toBeInTheDocument();
  });

  it('通过对话框添加角色', async () => {
    const user = userEvent.setup();
    render(<PromptManagement />);

    await screen.findByText('角色');
    const addButtons = screen.getAllByText('添加');
    await user.click(addButtons[0]);

    await screen.findByText('添加角色', {}, { timeout: 5000 });
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('角色ID (唯一标识)'), 'test_role');
    await user.type(within(dialog).getByPlaceholderText('名称'), '测试角色');
    await user.type(within(dialog).getByPlaceholderText('人格设定'), '热情');
    await user.click(within(dialog).getByRole('button', { name: '添加' }));

    await waitFor(() => {
      expect(mockControllers.create).toHaveBeenCalledWith({
        role_id: 'test_role',
        name: '测试角色',
        description: '',
        personality: '热情',
        scope: 'user',
      });
    });
  }, 15000);

  it('通过删除对话框删除技能', async () => {
    mockControllers.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([skill]);
    const user = userEvent.setup();
    const { container } = render(<PromptManagement />);

    await screen.findByText('联网搜索');
    const trashButton = (container.querySelector('svg.lucide-trash') as HTMLElement)?.closest('button');
    expect(trashButton).not.toBeNull();
    await user.click(trashButton!);

    await screen.findByText('确认删除');
    await user.click(screen.getByRole('button', { name: '删除' }));

    await waitFor(() => {
      expect(mockControllers.remove).toHaveBeenCalledWith('s1');
    });
  });

  it('通过绑定对话框为角色绑定技能', async () => {
    mockControllers.findAll
      .mockResolvedValueOnce([role])
      .mockResolvedValueOnce([skill]);
    const user = userEvent.setup();
    render(<PromptManagement />);

    await screen.findByText('系统助手');
    await user.click(screen.getByRole('button', { name: '绑定' }));

    await screen.findByText('绑定技能');
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByText('点击选择技能...'));

    await screen.findByText('搜索技能');
    const commandDialog = screen.getAllByRole('dialog').at(-1);
    expect(commandDialog).toBeDefined();
    await user.click(within(commandDialog!).getByText('联网搜索'));

    await waitFor(() => {
      expect(mockControllers.addSkill).toHaveBeenCalledWith('r1', { skill_id: 's1', ref_type: 'required' });
    });
  }, 15000);
});
