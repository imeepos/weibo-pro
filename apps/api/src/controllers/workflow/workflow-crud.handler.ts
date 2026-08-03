import { BadRequestException, NotFoundException, logger, root } from '@sker/core';
import { generateId, WorkflowGraphAst } from '@sker/workflow';
import * as sdk from '@sker/sdk';
import { WorkflowService } from '../../services/workflow.service';
import { WorkflowTemplateService } from '../../services/workflow-template.service';
import { WorkflowEntity } from '@sker/entities';

/**
 * 工作流 CRUD 与模板处理
 *
 * 存在即合理：
 * - 保存、查询、删除工作流
 * - 支持从模板自动初始化工作流
 * - 列出可用模板
 */
export class WorkflowCrudHandler {
  private readonly workflowService: WorkflowService;
  private readonly workflowTemplateService: WorkflowTemplateService;

  constructor() {
    this.workflowService = root.get(WorkflowService);
    this.workflowTemplateService = root.get(WorkflowTemplateService);
  }

  /**
   * 保存工作流
   *
   * 优雅设计：
   * - 委托给 WorkflowService 处理业务逻辑
   * - 统一的参数验证和异常处理
   */
  async saveWorkflow(body: WorkflowGraphAst): Promise<WorkflowEntity> {
    const { name, edges, nodes } = body;

    if (!name || name.trim().length === 0) {
      throw new BadRequestException('工作流名称不能为空');
    }

    if (!nodes || !edges) {
      throw new BadRequestException('工作流数据格式错误');
    }
    body.id = body.id || generateId()
    return await this.workflowService.saveWorkflow(body);
  }

  async initWorkflow(params: { name: string }): Promise<sdk.InitWorkflowResponse> {
    const { name } = params;
    // 2. 检查是否有对应的模板
    const template = this.workflowTemplateService.createFromTemplate(name);

    if (template) {
      await this.saveWorkflow(template);
      return { template };
    }

    return {};
  }

  /**
   * 根据 name 获取工作流
   *
   * 优雅设计：
   * - 支持从模板自动创建工作流
   * - 如果存在则返回，不存在则检查是否有模板
   * - 有模板则使用模板初始化，无模板则创建空工作流
   */
  async getWorkflow(params: { name: string }): Promise<WorkflowGraphAst | null> {
    const { name } = params;
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('工作流名称不能为空');
    }
    // 1. 尝试从数据库获取现有工作流
    const workflow = await this.workflowService.getWorkflowByName(name);
    if (workflow) {
      return workflow;
    }
    // 3. 无模板，创建空工作流
    logger.info('创建空工作流', { name });
    const workflowAst = new WorkflowGraphAst();
    workflowAst.name = name;
    await this.saveWorkflow(workflowAst);
    return workflowAst;
  }

  /**
   * 列出所有可用的工作流模板
   *
   * 优雅设计：
   * - 让用户知道有哪些预定义模板可以使用
   * - 提供模板描述，帮助用户选择合适的模板
   */
  async listTemplates(): Promise<{ name: string; description: string }[]> {
    const templates = this.workflowTemplateService.getAvailableTemplates();

    return templates.map(name => ({
      name,
      description: this.workflowTemplateService.getTemplateDescription(name)
    }));
  }

  /**
   * 列出所有工作流
   */
  async listWorkflows(): Promise<sdk.WorkflowSummary[]> {
    return await this.workflowService.listWorkflows();
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(params: { id: string }): Promise<{ success: boolean }> {
    const { id } = params;

    if (!id || id.trim().length === 0) {
      throw new BadRequestException('工作流ID不能为空');
    }

    const success = await this.workflowService.deleteWorkflow(id);

    if (!success) {
      throw new NotFoundException('工作流不存在');
    }

    return { success };
  }
}
