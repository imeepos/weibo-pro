import { Ast } from "./ast";
import { Input, Node, Output } from "./decorator";
import { BehaviorSubject } from "rxjs";
import dayjs from 'dayjs'

@Node({ title: '日期', type: 'basic' })
export class DateAst extends Ast {

    @Input({ title: '日期', type: 'datetime-local' })
    dateStr: string = dayjs().format('YYYY-MM-DD HH:mm:ss');

    @Output({ title: '日期', type: 'datetime-local' })
    date: BehaviorSubject<Date> = new BehaviorSubject<Date>(new Date())

    type: `DateAst` = `DateAst`
}