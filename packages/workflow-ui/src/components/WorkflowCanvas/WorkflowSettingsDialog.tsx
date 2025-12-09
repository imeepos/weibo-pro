'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { WorkflowGraphAst } from '@sker/workflow'
import { Subject, merge, debounceTime, distinctUntilChanged, filter, map, tap } from 'rxjs'
import { WorkflowSettingsDialog as WorkflowSettingsDialogUI } from '@sker/ui/components/workflow'

export interface WorkflowSettingsDialogProps {
  visible: boolean
  workflow: WorkflowGraphAst
  onClose: () => void
  onSave: (settings: WorkflowSettings) => void
}

export interface WorkflowSettings {
  name?: string
  description?: string
  color?: string
  tags?: string[]
}

export function WorkflowSettingsDialog({
  visible,
  workflow,
  onClose,
  onSave,
}: WorkflowSettingsDialogProps) {
  // RxJS Subjects
  const nameInput$ = useRef(new Subject<string>()).current
  const descriptionInput$ = useRef(new Subject<string>()).current
  const colorChange$ = useRef(new Subject<string>()).current
  const customColorChange$ = useRef(new Subject<string>()).current
  const tagInput$ = useRef(new Subject<string>()).current
  const addTag$ = useRef(new Subject<void>()).current
  const removeTag$ = useRef(new Subject<string>()).current

  // React 状态
  const [name, setName] = useState(workflow.name || '')
  const [description, setDescription] = useState(workflow.description || '')
  const [color, setColor] = useState(workflow.color || '#3b82f6')
  const [customColor, setCustomColor] = useState('')
  const [tags, setTags] = useState<string[]>(workflow.tags || [])
  const [newTag, setNewTag] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)

  // 表单验证流（仅处理验证，不影响输入框值）
  const nameValidation$ = nameInput$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    map(value => {
      if (!value.trim()) {
        return '工作流名称不能为空'
      }
      if (value.length > 50) {
        return '工作流名称不能超过50个字符'
      }
      return ''
    })
  )

  // 标签管理流
  const tagManagement$ = merge(
    addTag$.pipe(
      map(() => newTag.trim()),
      filter(tag => tag.length > 0),
      filter(tag => !tags.includes(tag)),
      filter(() => tags.length < 10),
      tap(tag => {
        setTags(prev => [...prev, tag])
        setNewTag('')
      })
    ),
    removeTag$.pipe(
      tap(tag => {
        setTags(prev => prev.filter(t => t !== tag))
      })
    )
  )

  // 标签输入流
  const tagInputChange$ = tagInput$.pipe(
    tap(value => setNewTag(value))
  )

  // 颜色选择流
  const colorSelection$ = merge(
    colorChange$.pipe(
      tap(color => {
        setColor(color)
        setCustomColor('')
      })
    ),
    customColorChange$.pipe(
      tap(color => setCustomColor(color))
    )
  )

  // 初始化表单状态
  useEffect(() => {
    if (visible) {
      setName(workflow.name || 'default')
      setDescription(workflow.description || '')
      setColor(workflow.color || '#3b82f6')
      setCustomColor('')
      setTags(workflow.tags || [])
      setNewTag('')
      setNameError('')
    }
  }, [visible, workflow])

  // 订阅 RxJS 流
  useEffect(() => {
    const subscriptions = [
      nameValidation$.subscribe(error => {
        setNameError(error)
      }),
      descriptionInput$.subscribe(setDescription),
      colorSelection$.subscribe(),
      tagInputChange$.subscribe(),
      tagManagement$.subscribe(),
    ]

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe())
    }
  }, [nameValidation$, descriptionInput$, colorSelection$, tagInputChange$, tagManagement$])

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setNameError('工作流名称不能为空')
      return
    }
    if (name.length > 50) {
      setNameError('工作流名称不能超过50个字符')
      return
    }

    setNameError('')
    setSaving(true)

    try {
      workflow.name = name
      workflow.description = description
      workflow.color = customColor || color
      workflow.tags = tags

      onSave({
        name,
        description,
        color: customColor || color,
        tags,
      })

      onClose()
    } catch (error: any) {
      setNameError(error.message || '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }, [name, description, customColor, color, tags, workflow, onSave, onClose])

  // 事件处理函数
  const handleNameChange = (value: string) => {
    setName(value)
    nameInput$.next(value)
  }
  const handleDescriptionChange = (value: string) => descriptionInput$.next(value)
  const handleColorChange = (value: string) => colorChange$.next(value)
  const handleCustomColorChange = (value: string) => customColorChange$.next(value)
  const handleTagInputChange = (value: string) => tagInput$.next(value)
  const handleAddTag = () => addTag$.next()
  const handleRemoveTag = (tag: string) => removeTag$.next(tag)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  // 全局键盘事件
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && visible && name.trim()) {
        e.preventDefault()
        handleSave()
      }
    }

    if (visible) {
      document.addEventListener('keydown', handleGlobalKeyDown)
      return () => {
        document.removeEventListener('keydown', handleGlobalKeyDown)
      }
    }
  }, [visible, name, onClose, handleSave])

  return (
    <WorkflowSettingsDialogUI
      open={visible}
      onOpenChange={(open) => !open && onClose()}
      name={name}
      description={description}
      color={color}
      customColor={customColor}
      tags={tags}
      newTag={newTag}
      nameError={nameError}
      saving={saving}
      onNameChange={handleNameChange}
      onDescriptionChange={handleDescriptionChange}
      onColorChange={handleColorChange}
      onCustomColorChange={handleCustomColorChange}
      onTagInputChange={handleTagInputChange}
      onAddTag={handleAddTag}
      onRemoveTag={handleRemoveTag}
      onSave={handleSave}
      onKeyDown={handleKeyDown}
    />
  )
}
