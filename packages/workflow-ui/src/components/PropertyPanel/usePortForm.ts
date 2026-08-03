'use client'

import { useState, useEffect } from 'react'
import { INodeInputMetadata, INodeOutputMetadata } from '@sker/workflow'
import { INPUT_TYPES, OUTPUT_TYPES, validateProperty } from './port-dialog-utils'

export interface UsePortFormParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'edit'
  portType: 'input' | 'output'
  initialValues?: Partial<INodeInputMetadata | INodeOutputMetadata>
  existingProperties: string[]
  onSave: (port: INodeInputMetadata | INodeOutputMetadata) => void
}

export function usePortForm({
  open,
  onOpenChange,
  mode,
  portType,
  initialValues,
  existingProperties,
  onSave,
}: UsePortFormParams) {
  const [property, setProperty] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('string')
  const [isRouter, setIsRouter] = useState(false)
  const [condition, setCondition] = useState('')
  const [required, setRequired] = useState(false)
  const [defaultValue, setDefaultValue] = useState('')

  useEffect(() => {
    if (open) {
      if (initialValues) {
        setProperty(initialValues.property || '')
        setTitle(initialValues.title || '')
        setDescription(initialValues.description || '')
        setType(initialValues.type || 'string')
        setIsRouter('isRouter' in initialValues ? initialValues.isRouter || false : false)
        setCondition('condition' in initialValues ? initialValues.condition || '' : '')
        setRequired('required' in initialValues ? initialValues.required || false : false)
        setDefaultValue('defaultValue' in initialValues ? String(initialValues.defaultValue || '') : '')
      } else {
        setProperty('')
        setTitle('')
        setDescription('')
        setType('string')
        setIsRouter(false)
        setCondition('')
        setRequired(false)
        setDefaultValue('')
      }
    }
  }, [open, initialValues])

  const propertyError = validateProperty(
    property,
    existingProperties,
    mode === 'edit' ? initialValues?.property : undefined
  )

  const isFormValid = property && !propertyError && type

  const handleSave = () => {
    if (!isFormValid) return

    const basePort = {
      property,
      title,
      description,
      type,
      isStatic: false,
    }

    if (portType === 'input') {
      const inputPort: INodeInputMetadata = {
        ...basePort,
        required,
        ...(defaultValue && { defaultValue }),
      } as INodeInputMetadata
      onSave(inputPort)
    } else {
      const outputPort: INodeOutputMetadata = {
        ...basePort,
        isRouter,
        ...(condition && { condition }),
        ...(defaultValue && { defaultValue }),
      } as INodeOutputMetadata
      onSave(outputPort)
    }

    onOpenChange(false)
  }

  const applyPreset = (template: string) => {
    if (template === 'true') {
      setCondition('true')
    } else {
      setCondition(template)
    }
  }

  const availableTypes = portType === 'input' ? INPUT_TYPES : OUTPUT_TYPES

  return {
    property,
    setProperty,
    title,
    setTitle,
    description,
    setDescription,
    type,
    setType,
    isRouter,
    setIsRouter,
    condition,
    setCondition,
    required,
    setRequired,
    defaultValue,
    setDefaultValue,
    propertyError,
    isFormValid,
    handleSave,
    applyPreset,
    availableTypes,
  }
}
