import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/utils';

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  emptyMessage?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '请选择',
  disabled = false,
  className,
  triggerClassName,
  menuClassName,
  optionClassName,
  emptyMessage = '暂无可选项',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(() => {
    const initial = options.findIndex(option => option.value === value);
    if (initial >= 0) {
      return initial;
    }
    return options.length > 0 ? 0 : -1;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selectedOption = useMemo(
    () => options.find(option => option.value === value) ?? null,
    [options, value]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) {
      return;
    }

    const list = listRef.current;
    if (!list) {
      return;
    }

    const item = list.querySelector<HTMLElement>(`[data-index="${highlightedIndex}"]`);
    if (!item) {
      return;
    }

    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;
    const viewTop = list.scrollTop;
    const viewBottom = viewTop + list.clientHeight;

    if (itemTop < viewTop) {
      list.scrollTop = itemTop;
    } else if (itemBottom > viewBottom) {
      list.scrollTop = itemBottom - list.clientHeight;
    }
  }, [highlightedIndex, isOpen]);

  useEffect(() => {
    const selectedIndex = options.findIndex(option => option.value === value);
    if (selectedIndex >= 0) {
      setHighlightedIndex(selectedIndex);
      return;
    }

    setHighlightedIndex(options.length > 0 ? 0 : -1);
  }, [options, value]);

  const close = useCallback(() => setIsOpen(false), []);

  const handleToggle = () => {
    if (disabled) {
      return;
    }
    setIsOpen(prev => {
      const next = !prev;
      if (next) {
        setHighlightedIndex(current => {
          if (current >= 0 && current < options.length) {
            return current;
          }
          return options.length > 0 ? 0 : -1;
        });
      }
      return next;
    });
  };

  const handleSelect = (option: SelectOption) => {
    if (disabled) {
      return;
    }
    onChange(option.value);
    close();
  };

  const moveHighlight = (direction: 1 | -1) => {
    if (!options.length) {
      return;
    }

    setHighlightedIndex(current => {
      const fallback = direction === 1 ? 0 : options.length - 1;
      if (current < 0 || current >= options.length) {
        return fallback;
      }

      const nextIndex = current + direction;

      if (nextIndex < 0) {
        return options.length - 1;
      }

      if (nextIndex >= options.length) {
        return 0;
      }

      return nextIndex;
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement | HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(prev => {
            if (prev >= 0 && prev < options.length) {
              return prev;
            }
            return options.length > 0 ? 0 : -1;
          });
        } else {
          moveHighlight(1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(prev => {
            if (prev >= 0 && prev < options.length) {
              return prev;
            }
            return options.length > 0 ? options.length - 1 : -1;
          });
        } else {
          moveHighlight(-1);
        }
        break;
      case 'Enter':
      case ' ': {
        if (!isOpen) {
          event.preventDefault();
          setIsOpen(true);
          setHighlightedIndex(prev => {
            if (prev >= 0 && prev < options.length) {
              return prev;
            }
            return options.length > 0 ? 0 : -1;
          });
          return;
        }

        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          event.preventDefault();
          handleSelect(options[highlightedIndex]);
        }
        break;
      }
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          close();
        }
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('select-container w-full', className)}
    >
      <button
        type="button"
        className={cn(
          'select-trigger',
          disabled && 'select-trigger-disabled',
          triggerClassName
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      >
        <span className={cn('select-trigger-label truncate', !selectedOption && 'select-trigger-placeholder')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn('select-trigger-icon transition-transform duration-200', isOpen && 'rotate-180')} size={16} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="select-menu"
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-activedescendant={
              isOpen && highlightedIndex >= 0 && highlightedIndex < options.length
                ? `${listboxId}-option-${highlightedIndex}`
                : undefined
            }
            className={cn('select-menu', menuClassName)}
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
            {options.length === 0 && (
              <div className="select-option select-option-empty" role="option" aria-disabled="true">
                {emptyMessage}
              </div>
            )}

            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={option.value}
                  type="button"
                  data-index={index}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'select-option',
                    isHighlighted && 'select-option-highlighted',
                    isSelected && 'select-option-selected',
                    optionClassName
                  )}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="select-option-label">{option.label}</span>
                  {option.description && (
                    <span className="select-option-description">{option.description}</span>
                  )}
                  {isSelected && (
                    <Check className="select-option-check" aria-hidden="true" size={16} />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Select;
