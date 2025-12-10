import {
    Column,
    CreateDateColumn,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn
} from "typeorm";
import { Entity } from "./decorator";
import type { LlmProvider } from "./llm-provider";

@Entity({
    name: 'llm_chat_log'
})
@Index(['provider_id'])
@Index(['model_name'])
@Index(['is_success'])
@Index(['created_at'])
export class LlmChatLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'provider_id' })
    providerId!: string;

    @ManyToOne('LlmProvider', 'id')
    @JoinColumn({ name: 'provider_id' })
    provider!: LlmProvider;

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

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}