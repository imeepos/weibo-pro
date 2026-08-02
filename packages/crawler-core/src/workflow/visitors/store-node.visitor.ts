import { Injectable, NoRetryError } from '@sker/core';
import { Handler, setAstError } from '@sker/workflow';
import { StoreNodeAst } from '../nodes/store-node';
import { StoreFactory } from '../../store/factory';

@Injectable()
export class StoreNodeVisitor {
  @Handler(StoreNodeAst)
  async visit(ast: StoreNodeAst, _ctx: any) {
    ast.state = 'running';

    try {
      if (!ast.data) {
        throw new NoRetryError('缺少必要参数: data');
      }

      const store = StoreFactory.create({
        type: ast.storeType,
        baseDir: './data'
      });

      if (Array.isArray(ast.data)) {
        for (const item of ast.data) {
          await store.storeContent(item);
        }
      } else {
        await store.storeContent(ast.data);
      }

      ast.success = true;
      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      ast.success = false;
      setAstError(ast, error instanceof Error ? error : new Error(String(error)), process.env.NODE_ENV === 'development');
    }

    return ast;
  }
}
