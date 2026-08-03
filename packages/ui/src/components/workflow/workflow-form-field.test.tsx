import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkflowFormField } from './workflow-form-field'
import { parseValue } from './workflow-form-field/utils'

describe('WorkflowFormField', () => {
  it('应渲染 label 与默认文本输入', () => {
    render(<WorkflowFormField label="名称" value="hello" onChange={() => {}} />)
    expect(screen.getByText('名称')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('hello')
  })

  it('文本输入失焦后提交解析值', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<WorkflowFormField label="名称" type="text" value="" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'world')
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith('world')
  })

  it('textarea 字段渲染多行输入', () => {
    render(<WorkflowFormField label="内容" type="textarea" value="line1" onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('line1')
  })

  it('数字输入：有效值失焦提交数字', () => {
    const onChange = vi.fn()
    render(<WorkflowFormField label="数量" type="number" value={0} onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '42' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(42)
  })

  it('数字输入：清空失焦提交 0', () => {
    const onChange = vi.fn()
    render(<WorkflowFormField label="数量" type="number" value={5} onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('parseValue 对无效数字抛出错误', () => {
    expect(() => parseValue('abc', 'number')).toThrow('请输入有效的数字')
  })

  it('parseValue 对有效数字返回数值', () => {
    expect(parseValue('42', 'number')).toBe(42)
  })

  it('parseValue 对无效日期抛出错误', () => {
    expect(() => parseValue('invalid-date', 'date')).toThrow('请输入有效的日期')
  })

  it('布尔字段点击切换值', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<WorkflowFormField label="启用" type="boolean" value={false} onChange={onChange} />)
    await user.click(screen.getByText('启用'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('select 字段渲染选项并提交', () => {
    const onChange = vi.fn()
    render(
      <WorkflowFormField
        label="模式"
        type="select"
        value="a"
        options={['a', 'b', 'c']}
        onChange={onChange}
      />
    )
    expect(screen.getAllByRole('option')).toHaveLength(3)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } })
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('date 字段渲染日期值', () => {
    render(
      <WorkflowFormField
        label="日期"
        type="date"
        value={new Date('2024-01-15T00:00:00Z')}
        onChange={() => {}}
      />
    )
    expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument()
  })

  it('展示 externalError', () => {
    render(<WorkflowFormField label="名称" value="x" error="外部错误" onChange={() => {}} />)
    expect(screen.getByText('外部错误')).toBeInTheDocument()
  })

  it('image 字段无值时渲染上传按钮', () => {
    render(<WorkflowFormField label="图片" type="image" value="" onChange={() => {}} />)
    expect(screen.getByText('上传图片')).toBeInTheDocument()
  })

  it('video 字段无值时渲染上传按钮', () => {
    render(<WorkflowFormField label="视频" type="video" value="" onChange={() => {}} />)
    expect(screen.getByText('上传视频')).toBeInTheDocument()
  })

  it('audio 字段无值时渲染上传按钮', () => {
    render(<WorkflowFormField label="音频" type="audio" value="" onChange={() => {}} />)
    expect(screen.getByText('上传音频')).toBeInTheDocument()
  })
})
