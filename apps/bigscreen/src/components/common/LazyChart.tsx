import React, { Suspense } from 'react';
import { Spinner } from '@sker/ui/components/ui/spinner';

interface LazyChartProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const LazyChart: React.FC<LazyChartProps> = ({
  children,
  fallback = <Spinner className="h-6 w-6" />
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

export default React.memo(LazyChart);
