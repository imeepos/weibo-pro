import { Column, CreateDateColumn, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Entity } from "./decorator";
import { LlmModel } from "./llm-model";
import { LlmProvider } from "./llm-provider";

@Entity({
    name: 'llm_model_providers'
})
@Unique(['modelName', 'providerId', 'modelId'])
@Index(['providerId'])
@Index(['tierLevel'])
export class LlmModelProvider {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'model_id' })
    modelId!: string;

    @Column({ name: 'provider_id' })
    providerId!: string;

    // 该模型在此提供商的实际名称（可能与标准名称不同）
    @Column({ type: 'varchar', length: 100, name: 'model_name' })
    modelName!: string;

    // 梯队等级：1=第一梯队（优先）, 2=第二梯队（回退）, 3=第三梯队（兜底）
    @Column({ type: 'int', default: 1, name: 'tier_level' })
    tierLevel!: number;

    @ManyToOne(() => LlmModel, model => model.providers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'model_id' })
    model!: LlmModel;

    @ManyToOne(() => LlmProvider, provider => provider.models, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_id' })
    provider!: LlmProvider;

    @CreateDateColumn({ name: 'created_at' })
    created_at!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at!: Date;
}