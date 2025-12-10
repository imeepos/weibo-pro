import {
    Column,
    CreateDateColumn,
    Index,
    PrimaryGeneratedColumn
} from "typeorm";
import { Entity } from "./decorator";

@Entity({
    name: 'llm_chat_log'
})
@Index(['providerId'])
@Index(['modelName'])
@Index(['isSuccess'])
@Index(['createdAt'])
@Index(['createdAt', 'isSuccess'])  // 用于时间范围和成功状态组合查询
@Index(['providerId', 'createdAt'])  // 用于按提供商和时间查询
@Index(['modelName', 'createdAt'])   // 用于按模型和时间查询
@Index(['statusCode'])               // 用于状态码统计
export class LlmChatLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'provider_id' })
    providerId!: string;

    @Column({ type: 'varchar', length: 100, name: 'model_name' })
    modelName!: string;

    @Column({ type: 'json' })
    request!: any;

    @Column({ type: 'int', name: 'duration_ms' })
    durationMs!: number;

    @Column({ type: 'boolean', name: 'is_success' })
    isSuccess!: boolean;

    @Column({ type: 'int', name: 'status_code' })
    statusCode!: number;

    @Column({ type: 'text', nullable: true })
    error?: string;

    @Column({ type: 'int', name: 'prompt_tokens', nullable: true })
    promptTokens?: number;

    @Column({ type: 'int', name: 'completion_tokens', nullable: true })
    completionTokens?: number;

    @Column({ type: 'int', name: 'total_tokens', nullable: true })
    totalTokens?: number;

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP'
    })
    createdAt!: Date;
}