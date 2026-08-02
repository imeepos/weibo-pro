import React from 'react';
import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { ProxyAutoSelectAst } from '@sker/workflow-ast';

const ProxyAutoSelectRender: React.FC<{ ast: ProxyAutoSelectAst }> = ({ ast }) => {
    if (ast.state === 'pending' || !ast.proxyList || ast.proxyList.length === 0) {
        return null;
    }

    const formatExpireTime = (timestamp: number) => {
        const _date = new Date(timestamp);
        const now = Date.now();
        const diff = timestamp - now;

        if (diff < 0) return '已过期';

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}小时${minutes % 60}分钟`;
        return `${minutes}分钟`;
    };

    return (
        <div className="space-y-2 p-2 max-w-md">
            {ast.proxyList.map((proxy, index) => {
                const isSelected = proxy.url === ast.selectedProxyUrl;
                const isExpired = proxy.expiresAt < Date.now();

                return (
                    <div
                        key={index}
                        className={`
                            flex flex-col gap-2 p-3 rounded-lg border transition-all
                            ${isSelected
                                ? 'border-green-500 bg-green-500/10 shadow-lg'
                                : 'border-slate-600 bg-slate-700/50'
                            }
                            ${isExpired ? 'opacity-50' : ''}
                        `}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`
                                    w-2 h-2 rounded-full
                                    ${isSelected ? 'bg-green-400' : 'bg-slate-500'}
                                `} />
                                <span className="text-xs font-medium text-slate-300">
                                    {proxy.provider}
                                </span>
                            </div>
                            <span className={`
                                text-xs px-2 py-0.5 rounded
                                ${isExpired
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }
                            `}>
                                {formatExpireTime(proxy.expiresAt)}
                            </span>
                        </div>

                        <div className="font-mono text-xs text-slate-400 break-all">
                            {proxy.url}
                        </div>
                    </div>
                );
            })}

            {ast.selectedProxyUrl && (
                <div className="mt-3 p-2 rounded-md bg-slate-800/50 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">当前选中</div>
                    <div className="font-mono text-xs text-green-400 break-all">
                        {ast.selectedProxyUrl}
                    </div>
                </div>
            )}
        </div>
    );
};

@Injectable()
export class ProxyAutoSelectAstRender {
    @Render(ProxyAutoSelectAst)
    render(ast: ProxyAutoSelectAst) {
        return <ProxyAutoSelectRender ast={ast} />;
    }
}
