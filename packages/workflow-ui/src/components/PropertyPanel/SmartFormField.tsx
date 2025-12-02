'use client'

import React from 'react'
import { WorkflowFormField, type WorkflowFormFieldProps } from '@sker/ui/components/workflow'

export interface SmartFormFieldProps extends WorkflowFormFieldProps {}

export function SmartFormField(props: SmartFormFieldProps) {
  return <WorkflowFormField {...props} />
}
