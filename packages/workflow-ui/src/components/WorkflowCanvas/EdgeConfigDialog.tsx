import React from 'react'
import { EdgeMode, type IEdge } from '@sker/workflow'
import {
  EdgeConfigDialog as BaseEdgeConfigDialog,
  type EdgeModeOption,
  type EdgeModeStyle
} from '@sker/ui/components/workflow'
import { EDGE_MODE_STYLES } from '../../types/edge.types'

export interface EdgeConfigDialogProps {
  visible: boolean
  edge: IEdge | null
  onClose: () => void
  onSave: (edgeConfig: Partial<IEdge>) => void
}

const modeOptions: EdgeModeOption[] = [
  {
    key: EdgeMode.MERGE,
    icon: EDGE_MODE_STYLES.merge.icon,
    label: EDGE_MODE_STYLES.merge.label,
    description: EDGE_MODE_STYLES.merge.description,
    scenario: EDGE_MODE_STYLES.merge.scenario
  },
  {
    key: EdgeMode.ZIP,
    icon: EDGE_MODE_STYLES.zip.icon,
    label: EDGE_MODE_STYLES.zip.label,
    description: EDGE_MODE_STYLES.zip.description,
    scenario: EDGE_MODE_STYLES.zip.scenario
  },
  {
    key: EdgeMode.COMBINE_LATEST,
    icon: EDGE_MODE_STYLES.combineLatest.icon,
    label: EDGE_MODE_STYLES.combineLatest.label,
    description: EDGE_MODE_STYLES.combineLatest.description,
    scenario: EDGE_MODE_STYLES.combineLatest.scenario
  },
  {
    key: EdgeMode.WITH_LATEST_FROM,
    icon: EDGE_MODE_STYLES.withLatestFrom.icon,
    label: EDGE_MODE_STYLES.withLatestFrom.label,
    description: EDGE_MODE_STYLES.withLatestFrom.description,
    scenario: EDGE_MODE_STYLES.withLatestFrom.scenario
  },
]

const modeStyles: Record<EdgeMode, EdgeModeStyle> = {
  [EdgeMode.MERGE]: {
    stroke: EDGE_MODE_STYLES.merge.stroke,
    strokeWidth: EDGE_MODE_STYLES.merge.strokeWidth,
    strokeDasharray: EDGE_MODE_STYLES.merge.strokeDasharray,
    icon: EDGE_MODE_STYLES.merge.icon,
    label: EDGE_MODE_STYLES.merge.label,
  },
  [EdgeMode.ZIP]: {
    stroke: EDGE_MODE_STYLES.zip.stroke,
    strokeWidth: EDGE_MODE_STYLES.zip.strokeWidth,
    strokeDasharray: EDGE_MODE_STYLES.zip.strokeDasharray,
    icon: EDGE_MODE_STYLES.zip.icon,
    label: EDGE_MODE_STYLES.zip.label,
  },
  [EdgeMode.COMBINE_LATEST]: {
    stroke: EDGE_MODE_STYLES.combineLatest.stroke,
    strokeWidth: EDGE_MODE_STYLES.combineLatest.strokeWidth,
    strokeDasharray: EDGE_MODE_STYLES.combineLatest.strokeDasharray,
    icon: EDGE_MODE_STYLES.combineLatest.icon,
    label: EDGE_MODE_STYLES.combineLatest.label,
  },
  [EdgeMode.WITH_LATEST_FROM]: {
    stroke: EDGE_MODE_STYLES.withLatestFrom.stroke,
    strokeWidth: EDGE_MODE_STYLES.withLatestFrom.strokeWidth,
    strokeDasharray: EDGE_MODE_STYLES.withLatestFrom.strokeDasharray,
    icon: EDGE_MODE_STYLES.withLatestFrom.icon,
    label: EDGE_MODE_STYLES.withLatestFrom.label,
  },
}

export function EdgeConfigDialog({
  visible,
  edge,
  onClose,
  onSave
}: EdgeConfigDialogProps) {
  return (
    <BaseEdgeConfigDialog
      open={visible}
      edge={edge}
      modeOptions={modeOptions}
      modeStyles={modeStyles}
      onOpenChange={(open) => !open && onClose()}
      onSave={onSave}
    />
  )
}
