import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@sker/ui/components/ui/pagination';
import { cn } from '@/utils';
import { buildPaginationPages } from './utils';

export interface PaginationBarProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

/** 分页条（totalPages <= 1 时不渲染） */
export const PaginationBar: React.FC<PaginationBarProps> = ({ totalPages, currentPage, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = buildPaginationPages(totalPages, currentPage);

  return (
    <div className="flex justify-center py-4">
      <Pagination>
        <PaginationContent className="gap-1">
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) onPageChange(currentPage - 1);
              }}
              className={cn(
                'transition-colors',
                currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-muted',
              )}
            />
          </PaginationItem>

          {pages.map((item, idx) =>
            item === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(item);
                  }}
                  isActive={currentPage === item}
                  className={cn(
                    'cursor-pointer transition-all',
                    currentPage === item && 'bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) onPageChange(currentPage + 1);
              }}
              className={cn(
                'transition-colors',
                currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-muted',
              )}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};
