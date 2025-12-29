'use client'

import React from 'react'
import { WorkflowFormField, type WorkflowFormFieldProps } from '@sker/ui/components/workflow'

export interface SmartFormFieldProps extends WorkflowFormFieldProps {
  // 继承所有 WorkflowFormFieldProps 的属性，包括 options
}

export function SmartFormField(props: SmartFormFieldProps) {
  return <WorkflowFormField {...props} />
}
