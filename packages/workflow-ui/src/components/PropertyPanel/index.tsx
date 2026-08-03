'use client'

import React from 'react'
import { useSelectedNode } from './useSelectedNode'
import { PortDialog } from './PortDialog'
import { usePropertyPanelState } from './usePropertyPanelState'
import {
  buildBasicSection,
  buildCustomSettingSection,
  buildInputsSection,
  buildOutputsSection,
  buildDynamicPortsSection,
  buildInfoSection,
  buildReadonlyProperties,
} from './sections'
import { WorkflowPropertyPanel, PropertyPanelEmptyState } from '@sker/ui/components/workflow'
import { INode } from '@sker/workflow'

export interface PropertyPanelProps {
  className?: string
  formData?: INode
  onPropertyChange?: (property: string, value: any) => void
}

export function PropertyPanel({
  className = '',
  formData: externalFormData,
  onPropertyChange: externalOnPropertyChange
}: PropertyPanelProps) {
  const selectedNode = useSelectedNode()
  const metadata = selectedNode?.data?.metadata

  const state = usePropertyPanelState({
    selectedNode,
    metadata,
    externalFormData,
    externalOnPropertyChange,
  })

  if (!selectedNode || !metadata) {
    return (
      <WorkflowPropertyPanel
        className={className}
        emptyState={<PropertyPanelEmptyState />}
      />
    )
  }

  const ast = selectedNode.data

  const editableProperties = metadata.inputs.map((input) => ({
    ...input,
    label: input.title || input.property,
  }))

  const readonlyProperties = buildReadonlyProperties(metadata.outputs, ast)

  const sections = [
    buildBasicSection({
      formData: state.formData,
      metadata,
      handlePropertyChange: state.handlePropertyChange,
    }),
  ]

  // 如果有 @Setting 渲染器，添加自定义设置 section
  if (state.settingRenderer) {
    sections.push(buildCustomSettingSection({
      ast,
      formData: state.formData,
      settingRenderer: state.settingRenderer,
      handlePropertyChange: state.handlePropertyChange,
    }))
  }

  if (editableProperties.length > 0) {
    sections.push(buildInputsSection({
      formData: state.formData,
      ast,
      editableProperties,
      handlePropertyChange: state.handlePropertyChange,
    }))
  }

  if (readonlyProperties.length > 0) {
    sections.push(buildOutputsSection({ readonlyProperties }))
  }

  sections.push(buildDynamicPortsSection({
    supportsDynamicInputs: state.supportsDynamicInputs,
    supportsDynamicOutputs: state.supportsDynamicOutputs,
    currentDynamicInputs: state.currentDynamicInputs,
    currentDynamicOutputs: state.currentDynamicOutputs,
    onAddPort: state.handleAddPort,
    onEditPort: state.handleEditPort,
    onRemoveInput: state.handleRemoveInput,
    onRemoveOutput: state.handleRemoveOutput,
  }))

  sections.push(buildInfoSection({ selectedNode }))

  return (
    <>
      <WorkflowPropertyPanel sections={sections} className={className} />
      <PortDialog
        open={state.portDialogOpen}
        onOpenChange={state.setPortDialogOpen}
        mode={state.portDialogMode}
        portType={state.currentPortType}
        initialValues={state.editValues}
        existingProperties={state.currentPortType === 'input' ? state.getInputProperties() : state.getOutputProperties()}
        onSave={state.handleSavePort}
      />
    </>
  )
}
