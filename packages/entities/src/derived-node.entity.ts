import { Column, CreateDateColumn, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Entity } from './decorator';

export enum DerivedNodeStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

/**
 * 派生节点实体 - 元节点动态扩展
 *
 * 存在即合理：
 * - 保存用户冻结输入后的节点配置
 * - 支持节点的版本管理和发布
 * - 运行时动态注册为新节点类型
 */
@Entity('derived_nodes')
export class DerivedNodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Index()
  @Column({ type: 'varchar', length: 100, name: 'base_type' })
  baseType!: string;

  @Column({ type: 'jsonb', name: 'frozen_inputs', default: '{}' })
  frozenInputs!: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'node_metadata' })
  nodeMetadata!: {
    class: {
      title: string;
      type: string;
      description?: string;
      errorStrategy?: string;
      maxRetries?: number;
    };
    inputs: Array<{
      property: string;
      title: string;
      type?: string;
      defaultValue?: unknown;
      mode?: number;
    }>;
    outputs: Array<{
      property: string;
      title: string;
      defaultValue?: unknown;
      isRouter?: boolean;
    }>;
    states?: Array<{
      property: string;
      title: string;
    }>;
  };

  @Index()
  @Column({
    type: 'enum',
    enum: DerivedNodeStatus,
    default: DerivedNodeStatus.DRAFT,
  })
  status!: DerivedNodeStatus;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'varchar', length: 100, name: 'created_by', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
