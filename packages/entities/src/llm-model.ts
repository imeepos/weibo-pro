import { Column, CreateDateColumn, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Entity } from "./decorator";
import type { LlmModelProvider } from "./llm-model-provider";

@Entity({
    name: 'llm_models'
})
export class LlmModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    // 标准化模型名称，如 gpt-4, claude-3-opus
    @Column({ type: 'varchar', length: 100, unique: true })
    name!: string;

    @OneToMany('LlmModelProvider', 'model')
    providers!: LlmModelProvider[];

    @CreateDateColumn({ name: 'created_at' })
    created_at!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at!: Date;
}