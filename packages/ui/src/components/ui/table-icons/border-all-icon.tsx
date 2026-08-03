'use client';

import type { LucideProps } from 'lucide-react';

export function BorderAllIcon(props: LucideProps) {
  return (
    <svg
      fill="none"
      height="15"
      viewBox="0 0 15 15"
      width="15"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Border All</title>
      <path
        clipRule="evenodd"
        d="M0.25 1C0.25 0.585786 0.585786 0.25 1 0.25H14C14.4142 0.25 14.75 0.585786 14.75 1V14C14.75 14.4142 14.4142 14.75 14 14.75H1C0.585786 14.75 0.25 14.4142 0.25 14V1ZM1.75 1.75V13.25H13.25V1.75H1.75Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      <rect fill="currentColor" height="1" rx=".5" width="1" x="7" y="5" />
      <rect fill="currentColor" height="1" rx=".5" width="1" x="7" y="3" />
      <rect fill="currentColor" height="1" rx=".5" width="1" x="7" y="7" />
      <rect fill="currentColor" height="1" rx=".5" width="1" x="5" y="7" />
      <rect fill="currentColor" height="1" rx=".5" width="1" x="3" y="7" />
      <rect fill="currentColor" height="1" rx=".5" width="1" x="9" y="7" />
      <rect fill="currentColor" height="1" rx=".5" width="1" x="11" y="7" />
      <rect fill="currentColor" height="1" rx=".5" width="1" x="7" y="9" />
      <rect fill="currentColor" height="1" rx=".5" width="1" x="7" y="11" />
    </svg>
  );
}
