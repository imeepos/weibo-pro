import { describe, it, expect } from 'vitest';
import {
  PATH_METADATA,
  METHOD_METADATA,
  ROUTE_ARGS_METADATA,
  SSE_METADATA,
  RequestMethod,
  ParamType,
} from '@sker/core';
import { Observable } from 'rxjs';
import type { NodeEvent } from '@sker/workflow';
import type {
  TimeRange,
  PaginatedResponse,
  ChartData,
  EventListItem,
  WordCloudItem,
} from '../types';
import { EventsController } from '../controllers/events.controller';
import { WorkflowController } from '../controllers/workflow.controller';
import { ChartsController } from '../controllers/charts.controller';
import { LoginController } from '../controllers/login.controller';
import { PostsController } from '../controllers/posts.controller';
import * as sdk from '../index';

// =============================================================
// 编译期类型契约断言（不产生运行时副作用）
// =============================================================
type IsAssignable<A, B> = A extends B ? true : false;
type Assert<T extends true> = T;

// EventsController.getEventList 的返回类型必须满足 PaginatedResponse<EventListItem>
type _t1 = Assert<
  IsAssignable<
    Awaited<ReturnType<EventsController['getEventList']>>,
    PaginatedResponse<EventListItem>
  >
>;

// ChartsController.getWordCloud 的返回类型必须满足 WordCloudItem[]
type _t2 = Assert<
  IsAssignable<
    Awaited<ReturnType<ChartsController['getWordCloud']>>,
    WordCloudItem[]
  >
>;

// WorkflowController.execute 的返回类型必须满足 Observable<NodeEvent>
type _t3 = Assert<
  IsAssignable<ReturnType<WorkflowController['execute']>, Observable<NodeEvent>>
>;

// 关键类型可从 '@sker/sdk'（包导出入口）import 成功
type _sdkTypesCheck = [TimeRange, PaginatedResponse<EventListItem>, ChartData, EventListItem, WordCloudItem];

describe('types contract', () => {
  it('constructs a PaginatedResponse<EventListItem> sample (shared API contract)', () => {
    const sample: PaginatedResponse<EventListItem> = {
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    };
    expect(sample).toMatchObject({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });
  });

  it('index exports the shared types & key controllers', () => {
    expect(sdk.EventsController).toBeDefined();
    expect(sdk.WorkflowController).toBeDefined();
    expect(sdk.ChartsController).toBeDefined();
    expect(sdk.LoginController).toBeDefined();
    expect(sdk.PostsController).toBeDefined();
    expect(sdk.BETTER_FETCH).toBeDefined();
    expect(typeof sdk.createSkerClientPlugin).toBe('function');
  });

  it('EventsController.getEventList carries route metadata', () => {
    const method = EventsController.prototype.getEventList;

    expect(Reflect.getMetadata(PATH_METADATA, method)).toBe('list');
    expect(Reflect.getMetadata(METHOD_METADATA, method)).toBe(RequestMethod.GET);

    const routeArgs = Reflect.getMetadata(ROUTE_ARGS_METADATA, method);
    expect(routeArgs).toHaveProperty('query:0');
    expect(routeArgs['query:0']).toMatchObject({ type: ParamType.QUERY, key: 'timeRange' });
  });

  it('WorkflowController.listWorkflows carries route metadata', () => {
    const method = WorkflowController.prototype.listWorkflows;

    expect(Reflect.getMetadata(PATH_METADATA, method)).toBe('list');
    expect(Reflect.getMetadata(METHOD_METADATA, method)).toBe(RequestMethod.GET);
  });

  it('WorkflowController.saveWorkflow carries POST route metadata', () => {
    const method = WorkflowController.prototype.saveWorkflow;

    expect(Reflect.getMetadata(PATH_METADATA, method)).toBe('save');
    expect(Reflect.getMetadata(METHOD_METADATA, method)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(SSE_METADATA, method)).toBeUndefined();
  });

  it('WorkflowController.execute is flagged as SSE', () => {
    const method = WorkflowController.prototype.execute;

    expect(Reflect.getMetadata(PATH_METADATA, method)).toBe('execute');
    expect(Reflect.getMetadata(METHOD_METADATA, method)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(SSE_METADATA, method)).toBe(true);
  });

  it('LoginController.getStatus resolves @Param placeholders via route metadata', () => {
    const method = LoginController.prototype.getStatus;

    expect(Reflect.getMetadata(PATH_METADATA, method)).toBe(':platform/status');
    expect(Reflect.getMetadata(METHOD_METADATA, method)).toBe(RequestMethod.GET);

    const routeArgs = Reflect.getMetadata(ROUTE_ARGS_METADATA, method);
    expect(routeArgs).toHaveProperty('param:0');
    expect(routeArgs['param:0']).toMatchObject({ type: ParamType.PARAM, key: 'platform' });
  });

  it('PostsController.getPendingNLPPosts carries keyed query metadata', () => {
    const method = PostsController.prototype.getPendingNLPPosts;

    expect(Reflect.getMetadata(PATH_METADATA, method)).toBe('pending-nlp');
    expect(Reflect.getMetadata(METHOD_METADATA, method)).toBe(RequestMethod.GET);

    const routeArgs = Reflect.getMetadata(ROUTE_ARGS_METADATA, method);
    expect(routeArgs).toHaveProperty('query:0');
    expect(routeArgs).toHaveProperty('query:1');
    expect(routeArgs['query:0']).toMatchObject({ type: ParamType.QUERY, key: 'cursor' });
    expect(routeArgs['query:1']).toMatchObject({ type: ParamType.QUERY, key: 'pageSize' });
  });
});
