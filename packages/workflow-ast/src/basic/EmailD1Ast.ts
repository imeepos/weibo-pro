import { Ast, Input, Node, Output } from '@sker/workflow';

@Node({
  title: '临时邮箱',
  type: 'basic',
  errorStrategy: 'fail',
})
export class EmailD1Ast extends Ast {
  @Input({ title: 'API地址', defaultValue: 'https://email.bowong.cc' })
  apiUrl = 'https://email.bowong.cc';

  @Input({ title: '邮箱域名', defaultValue: 'email.bowong.cc' })
  domain = 'email.bowong.cc';

  @Input({ title: '触发', defaultValue: true })
  trigger = true;

  @Output({ title: '邮箱地址', defaultValue: '' })
  email = '';

  @Output({ title: '邮件内容', defaultValue: undefined })
  message: {
    id: string;
    from: string;
    subject: string;
    content: string;
    receivedAt: Date;
  } | undefined = undefined;

  type = 'EmailD1Ast';
}
