import { root } from '@sker/core'
import { INode, RENDER_METHOD } from '@sker/workflow'
export { BaseNode } from './BaseNode';
import { Node } from '@xyflow/react'
import { useRender } from './hook';
import React from 'react';
export const NodeContainer: React.FC<React.PropsWithChildren & Node<INode>> = ({ data, type }) => {
  const Render = useRender(data)
  if (Render) {
    return <div>{Render}</div>
  }
}
export const createNodeTypes = () => {
  const methods = root.get(RENDER_METHOD, [])
  const obj = {}
  methods.map(({ ast }) => {
    Reflect.set(obj, ast.name, NodeContainer)
  })
  return obj;
}