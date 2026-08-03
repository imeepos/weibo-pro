import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { HANDLER_METHOD } from '@sker/workflow';
import { root } from '@sker/core';
import '../LastAstVisitor';
import { WeiboLoginAstVisitor } from '../WeiboLoginAstVisitor';
import { WeiboKeywordSearchAstVisitor } from '../WeiboKeywordSearchAstVisitor';

describe('debug', () => {
  it('checks WeiboLoginAstVisitor handler registration with LastAstVisitor', () => {
    const methods = root.get(HANDLER_METHOD, []);
    console.log('DBG loginMethods:', methods.filter((m: any) => m.ast?.name === 'WeiboLoginAst').length);
    console.log('DBG undefined-ast handlers:', methods.filter((m: any) => !m.ast).map((m: any) => String(m.target?.name)).join(', '));
    console.log('DBG total handlers:', methods.length, 'all:', methods.map((m: any) => m.ast?.name ?? 'UNDEFINED').join(', '));
    expect(true).toBe(true);
  });
});
