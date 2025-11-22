import { Ast } from "./ast";
import { Input, Node, Output } from "./decorator";
import dayjs from 'dayjs'

@Node({ title: '日期' })
export class DateAst extends Ast {

    @Input({ title: '日期' })
    dateStr: string = dayjs().format('YYYY-MM-DD HH:mm:ss');

    @Output({ title: '日期' })
    date: Date = new Date()

    type: `DateAst` = `DateAst`
}