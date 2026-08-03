export type AnnotationType = 'rect' | 'circle' | 'arrow' | 'text'
export type ToolType = AnnotationType | 'crop'
export type CropShape = 'rect' | 'circle'

export interface Annotation {
  type: AnnotationType
  x: number
  y: number
  width?: number
  height?: number
  endX?: number
  endY?: number
  text?: string
  color: string
  lineWidth?: number
}

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
  shape?: CropShape  // 裁剪形状：矩形或圆形
}

export interface ImageEditorProps {
  imageUrl: string
  initialAnnotations?: Annotation[]
  initialCrop?: CropArea | null
  onSave?: (data: { annotations?: Annotation[], crop?: CropArea }) => void | Promise<void>
  onClose: () => void
  open?: boolean
}
