import { Ast } from "./ast";
import { Handler, Input, Node, Output } from "./decorator";
import { BehaviorSubject } from "rxjs";
import dayjs from 'dayjs'

@Node({ title: '日期', type: 'basic' })
export class DateAst extends Ast {

    @Input({ title: '日期', type: 'datetime-local' })
    dateStr: string = dayjs().format('YYYY-MM-DD HH:mm:ss');

    @Output({ title: '日期', type: 'datetime-local' })
    date: Date = new Date()

    type: `DateAst` = `DateAst`
}

import { Injectable } from "@sker/core";
import { Observable } from "rxjs";
import { NodeEvent } from "./execution/events";

@Injectable()
export class DateAstVisitor {
    @Handler(DateAst)
    handler(ast: DateAst, ctx: any) {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            ast.date = new Date(ast.dateStr);
            obs.next({ type: 'node_emit', id: ast.id, property: 'date', value: ast.date });

            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id, data: ast });
            obs.complete()
        })
    }
}

