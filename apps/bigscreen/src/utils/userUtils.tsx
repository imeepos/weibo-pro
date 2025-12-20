import React from 'react';
import { AlertTriangle, Eye, Shield, UserCheck } from 'lucide-react';
import type { UserProfile } from '@/types';

export type RiskLevel = UserProfile['riskLevel'];

export const getRiskColor = (level: RiskLevel): string => {
  switch (level) {
    case 'high':
      return 'text-red-400 bg-red-500/20';
    case 'medium':
      return 'text-yellow-400 bg-yellow-500/20';
    case 'low':
      return 'text-green-400 bg-green-500/20';
    default:
      return 'text-gray-400 bg-gray-500/20';
  }
};

export const getRiskIcon = (level: RiskLevel): React.ReactNode => {
  switch (level) {
    case 'high':
      return <AlertTriangle className="w-4 h-4" />;
    case 'medium':
      return <Eye className="w-4 h-4" />;
    case 'low':
      return <Shield className="w-4 h-4" />;
    default:
      return <UserCheck className="w-4 h-4" />;
  }
};

export const DEFAULT_PAGE_SIZE = 10;
