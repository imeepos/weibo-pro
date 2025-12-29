import React from 'react';

export interface WeiboAccount {
    id: string;
    avatar: string;
    nickname: string;
    healthScore: number;
}

export interface WeiboAccountListProps {
    accounts: WeiboAccount[];
    selectedId?: string;
}

export const WeiboAccountList: React.FC<WeiboAccountListProps> = ({ accounts, selectedId }) => {
    if (!accounts || accounts.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2 p-2 max-w-md">
            {accounts.map((account) => {
                const isSelected = account.id === selectedId;
                return (
                    <div
                        key={account.id}
                        className={`
                            flex items-center gap-3 p-3 rounded-lg border transition-all
                            ${isSelected
                                ? 'border-primary bg-primary/10 shadow-lg'
                                : 'border-border bg-card'
                            }
                        `}
                    >
                        <img
                            src={account.avatar}
                            alt={account.nickname}
                            className={`
                                w-10 h-10 rounded-full object-cover
                                ${isSelected ? 'ring-2 ring-primary' : ''}
                            `}
                        />

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground truncate">
                                    {account.nickname}
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
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
                                        className="text-muted"
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
                                            account.healthScore > 70 ? 'text-green-500' :
                                            account.healthScore > 40 ? 'text-yellow-500' :
                                            'text-red-500'
                                        }
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-bold text-foreground">
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
