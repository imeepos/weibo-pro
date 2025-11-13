import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { ArrayIteratorAst } from "@sker/workflow";
import React from "react";

const ConfigRow = ({ label, value }: { label: string; value: React.ReactNode }) =>
(
    <div className="flex justify-between items-center">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{value}</span>
    </div>
);

const ArrayIteratorComponent: React.FC<{ ast: ArrayIteratorAst }> = ({ ast }) => {
    const currentIndex = ast.currentIndex || 0;
    const arrayLength = ast.array?.length || 0;
    const progress = arrayLength > 0 ? `${currentIndex + 1}/${arrayLength}` : '0/0';

    return (
        <div className="space-y-1.5 text-xs">
            <div className="font-medium text-slate-200 mb-1">数组迭代器</div>
            {arrayLength > 0 && (
                <ConfigRow
                    label="进度"
                    value={progress}
                />
            )}
            {ast.currentItem && (
                <ConfigRow
                    label="当前项"
                    value={String(ast.currentItem).slice(0, 10)}
                />
            )}
            {ast.hasNext !== undefined && (
                <ConfigRow
                    label="状态"
                    value={ast.hasNext ? '继续' : '完成'}
                />
            )}
            {!ast.array && (
                <div className="text-slate-400 italic">等待输入数组...</div>
            )}
        </div>
    );
};

@Injectable()
export class ArrayIteratorAstRender {
    @Render(ArrayIteratorAst)
    render(ast: ArrayIteratorAst) {
        return <ArrayIteratorComponent ast={ast} />;
    }
}