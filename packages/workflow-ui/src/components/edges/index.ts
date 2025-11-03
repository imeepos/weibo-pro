import { ControlEdge } from './ControlEdge'
import { DataEdge } from './DataEdge'

export { DataEdge } from './DataEdge'
export { ControlEdge } from './ControlEdge'
export { EdgeLabel } from './EdgeLabel'

export const edgeTypes = {
  'workflow-data-edge': DataEdge,
  'workflow-control-edge': ControlEdge,
}
