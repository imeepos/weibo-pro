import React from 'react';
import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { WeiboAccountPickAst } from '@sker/workflow-ast';

const WeiboAccountPickRender: React.FC<{ ast: WeiboAccountPickAst }> = ({ ast }) => {
    if (ast.state === 'pending' || !ast.list || ast.list.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2 p-2 max-w-md">
            {ast.list.map((account) => {
                const isSelected = account.id === ast.selectedId;
                return (
                    <div
                        key={account.id}
                        className={`
                            flex items-center gap-3 p-3 rounded-lg border transition-all
                            ${isSelected
                                ? 'border-blue-500 bg-blue-500/10 shadow-lg'
                                : 'border-slate-600 bg-slate-700/50'
                            }
                        `}
                    >
                        <img
                            src={account.avatar}
                            alt={account.nickname}
                            className={`
                                w-10 h-10 rounded-full object-cover
                                ${isSelected ? 'ring-2 ring-blue-400' : ''}
                            `}
                        />

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-200 truncate">
                                    {account.nickname}
                                </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                                健康分: {account.healthScore}
                            </div>
                        </div>

                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 relative">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                        className="text-slate-600"
                                    />
                                    <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                        strokeDasharray={`${account.healthScore * 1.256} 125.6`}
                                        className={
                                            account.healthScore > 70 ? 'text-green-400' :
                                            account.healthScore > 40 ? 'text-yellow-400' :
                                            'text-red-400'
                                        }
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-bold text-slate-200">
                                        {account.healthScore}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

@Injectable()
export class WeiboAccountPickAstRender {
    @Render(WeiboAccountPickAst)
    render(ast: WeiboAccountPickAst) {
        return <WeiboAccountPickRender ast={ast} />;
    }
}
