import React from 'react'
import { useDerivedNodeWorkbench } from '../../store/derived-node-workbench.store'
import { Button } from '@sker/ui/components/ui/button'
import { BasicInfoStep } from './steps/BasicInfoStep'
import { FrozenInputsStep } from './steps/FrozenInputsStep'
import { PortConfigStep } from './steps/PortConfigStep'
import { MetadataStep } from './steps/MetadataStep'

const STEPS = [
  { id: 1, title: '基础信息', component: BasicInfoStep },
  { id: 2, title: '冻结输入', component: FrozenInputsStep },
  { id: 3, title: '端口配置', component: PortConfigStep },
  { id: 4, title: '元数据', component: MetadataStep }
] as const

export function ConfigEditor() {
  const { currentStep, setStep, baseNode } = useDerivedNodeWorkbench()

  if (!baseNode) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        请先选择元节点
      </div>
    )
  }

  const CurrentStepComponent = STEPS[currentStep - 1]?.component

  if (!CurrentStepComponent) return null

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="flex gap-2">
          {STEPS.map((step) => (
            <Button
              key={step.id}
              variant={currentStep === step.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStep(step.id)}
            >
              {step.id}. {step.title}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <CurrentStepComponent />
      </div>

      <div className="border-t p-4 flex justify-between">
        <Button
          variant="outline"
          disabled={currentStep === 1}
          onClick={() => setStep((currentStep - 1) as any)}
        >
          上一步
        </Button>
        <Button
          disabled={currentStep === 4}
          onClick={() => setStep((currentStep + 1) as any)}
        >
          下一步
        </Button>
      </div>
    </div>
  )
}
