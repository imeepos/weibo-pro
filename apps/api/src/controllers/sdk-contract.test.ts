import { describe, it, expect } from 'vitest';
import { PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA, RequestMethod, ParamType } from '@sker/core';
import * as sdk from '@sker/sdk';

// =============================================================
// SDK 驱动开发契约：SDK controller（路由元数据）↔ API controller（实现）
// =============================================================
import { MediaTypeController as ApiMediaTypeController } from './media-type.controller';
import { OverviewController as ApiOverviewController } from './overview.controller';
import { PostingTimeController as ApiPostingTimeController } from './posting-time.controller';
import { KeywordsController as ApiKeywordsController } from './keywords.controller';
import { NetworkCentralityController as ApiNetworkCentralityController } from './network-centrality.controller';
import { CommentDepthController as ApiCommentDepthController } from './comment-depth.controller';
import { CommunityDetectionController as ApiCommunityDetectionController } from './community-detection.controller';
import { CommunityEvolutionController as ApiCommunityEvolutionController } from './community-evolution.controller';
import { InfluencePredictionController as ApiInfluencePredictionController } from './influence-prediction.controller';
import { UserStratificationController as ApiUserStratificationController } from './user-stratification.controller';
import { SentimentTransitionController as ApiSentimentTransitionController } from './sentiment-transition.controller';
import { SpreadBreadthController as ApiSpreadBreadthController } from './spread-breadth.controller';
import { PropagationVelocityController as ApiPropagationVelocityController } from './propagation-velocity.controller';

interface ControllerPair {
  name: string;
  api: any;
  sdkClass: any;
}

// API controller 必须实现 SDK controller 定义的全部路由方法
const PAIRS: ControllerPair[] = [
  { name: 'MediaType', api: ApiMediaTypeController, sdkClass: sdk.MediaTypeController },
  { name: 'Overview', api: ApiOverviewController, sdkClass: sdk.OverviewController },
  { name: 'PostingTime', api: ApiPostingTimeController, sdkClass: sdk.PostingTimeController },
  { name: 'Keywords', api: ApiKeywordsController, sdkClass: sdk.KeywordsController },
  { name: 'NetworkCentrality', api: ApiNetworkCentralityController, sdkClass: sdk.NetworkCentralityController },
  { name: 'CommentDepth', api: ApiCommentDepthController, sdkClass: sdk.CommentDepthController },
  { name: 'CommunityDetection', api: ApiCommunityDetectionController, sdkClass: sdk.CommunityDetectionController },
  { name: 'CommunityEvolution', api: ApiCommunityEvolutionController, sdkClass: sdk.CommunityEvolutionController },
  { name: 'InfluencePrediction', api: ApiInfluencePredictionController, sdkClass: sdk.InfluencePredictionController },
  { name: 'UserStratification', api: ApiUserStratificationController, sdkClass: sdk.UserStratificationController },
  { name: 'SentimentTransition', api: ApiSentimentTransitionController, sdkClass: sdk.SentimentTransitionController },
  { name: 'SpreadBreadth', api: ApiSpreadBreadthController, sdkClass: sdk.SpreadBreadthController },
  { name: 'PropagationVelocity', api: ApiPropagationVelocityController, sdkClass: sdk.PropagationVelocityController },
];

function getRouteMethods(sdkClass: any): string[] {
  return Object.getOwnPropertyNames(sdkClass.prototype).filter(name => {
    if (name === 'constructor') return false;
    const method = sdkClass.prototype[name];
    return typeof method === 'function' && Reflect.getMetadata(METHOD_METADATA, method) !== undefined;
  });
}

describe('SDK ↔ API controller 契约（SDK 驱动开发）', () => {
  it.each(PAIRS)('$name: SDK 定义了非空 controller 前缀', ({ sdkClass }) => {
    const prefix = Reflect.getMetadata(PATH_METADATA, sdkClass);
    expect(typeof prefix).toBe('string');
    expect((prefix as string).length).toBeGreaterThan(0);
  });

  it.each(PAIRS)('$name: API controller 实现了 SDK 声明的全部路由方法', ({ name, api, sdkClass }) => {
    const routeMethods = getRouteMethods(sdkClass);
    expect(routeMethods.length).toBeGreaterThan(0);
    for (const methodName of routeMethods) {
      expect(typeof api.prototype[methodName], `${name}.${methodName} 应由 API controller 实现`).toBe('function');
    }
  });

  it.each(PAIRS)('$name: SDK 每个路由方法都带有 method + path 元数据', ({ name, sdkClass }) => {
    const routeMethods = getRouteMethods(sdkClass);
    for (const methodName of routeMethods) {
      const method = sdkClass.prototype[methodName];
      const httpMethod = Reflect.getMetadata(METHOD_METADATA, method);
      const path = Reflect.getMetadata(PATH_METADATA, method);
      expect(httpMethod, `${name}.${methodName} 应有 HTTP method`).toBeDefined();
      expect(typeof path, `${name}.${methodName} 应有路由 path`).toBe('string');
    }
  });
});

describe('SDK 路由元数据明细（方法/path 精确匹配）', () => {
  const cases: Array<[string, any, string, RequestMethod, string]> = [
    ['NetworkCentrality.getAnalysis', sdk.NetworkCentralityController, 'analysis', RequestMethod.GET, 'network-centrality'],
    ['CommentDepth.getAnalysis', sdk.CommentDepthController, 'analysis', RequestMethod.GET, 'comment-depth'],
    ['MediaType.getDistribution', sdk.MediaTypeController, 'distribution', RequestMethod.GET, 'media-type'],
    ['PostingTime.getHeatmap', sdk.PostingTimeController, 'heatmap', RequestMethod.GET, 'posting-time'],
    ['Overview.getStatistics', sdk.OverviewController, 'statistics', RequestMethod.GET, 'overview'],
    ['Overview.getSentiment', sdk.OverviewController, 'sentiment', RequestMethod.GET, 'overview'],
    ['Overview.getLocations', sdk.OverviewController, 'locations', RequestMethod.GET, 'overview'],
    ['Overview.getRealtimeSnapshot', sdk.OverviewController, 'realtime-snapshot', RequestMethod.GET, 'overview'],
    ['Overview.refreshRealtimeSnapshotCache', sdk.OverviewController, 'realtime-snapshot/cache', RequestMethod.POST, 'overview'],
    ['PropagationVelocity.getVelocity', sdk.PropagationVelocityController, 'velocity', RequestMethod.GET, 'events/:eventId/propagation'],
  ];

  it.each(cases)('%s → %s %s (prefix %s)', (_label, sdkClass, path, method, prefix) => {
    const methodName = _label.split('.')[1]!;
    const protoMethod = sdkClass.prototype[methodName];
    expect(Reflect.getMetadata(PATH_METADATA, sdkClass)).toBe(prefix);
    expect(Reflect.getMetadata(PATH_METADATA, protoMethod)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, protoMethod)).toBe(method);
  });

  it('NetworkCentrality.getAnalysis 携带 eventId query 参数', () => {
    const method = sdk.NetworkCentralityController.prototype.getAnalysis;
    const routeArgs = Reflect.getMetadata(ROUTE_ARGS_METADATA, method);
    expect(routeArgs).toHaveProperty('query:0');
    expect(routeArgs['query:0']).toMatchObject({ type: ParamType.QUERY, key: 'eventId' });
  });
});
