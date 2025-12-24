import type { Visitor } from './visitor';

export abstract class Ast {
    abstract visit(visitor: Visitor, ctx: any): any;
}
