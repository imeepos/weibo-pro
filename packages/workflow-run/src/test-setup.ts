import { root, Injectable, } from '@sker/core';
import { EntityManager } from 'typeorm';
import { EDGE_MODE_STRATEGY, EdgeMode } from '@sker/workflow';
import { Observable, merge, zip, combineLatest } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';

// 本地定义 IEdgeModeStrategy 接口（与 @sker/workflow 中的定义一致）
interface IEdgeModeStrategy {
  combine(sources: Observable<any>[], edges: any[]): Observable<any>;
}

// Mock EntityManager for tests
class MockEntityManager {
  find() { return Promise.resolve([]); }
  findOne() { return Promise.resolve(null); }
  save() { return Promise.resolve(null); }
  remove() { return Promise.resolve(null); }
  create() { return {}; }
  getRepository() { return this; }
}

// 注册 EdgeMode 策略提供者
// 注意：由于 @sker/workflow 的构建产物导出问题，这里本地定义策略类

@Injectable()
class MergeStrategy implements IEdgeModeStrategy {
  combine(sources: Observable<any>[], edges: any[]): Observable<any> {
    return merge(
      ...sources.map((source, sourceIndex) =>
        source.pipe(
          map(value => ({ [edges[sourceIndex]!.toProperty!]: value }))
        )
      )
    );
  }
}

@Injectable()
class ZipStrategy implements IEdgeModeStrategy {
  combine(sources: Observable<any>[], edges: any[]): Observable<any> {
    return zip(...sources).pipe(
      map(values => this.mapToObject(values, edges))
    );
  }

  private mapToObject(values: any[], edges: any[]): Record<string, any> {
    const result: Record<string, any> = {};
    values.forEach((value, index) => {
      const prop = edges[index]?.toProperty;
      if (prop) {
        if (result[prop] === undefined) {
          result[prop] = value;
        } else if (Array.isArray(result[prop])) {
          result[prop].push(value);
        } else {
          result[prop] = [result[prop], value];
        }
      }
    });
    return result;
  }
}

@Injectable()
class CombineLatestStrategy implements IEdgeModeStrategy {
  combine(sources: Observable<any>[], edges: any[]): Observable<any> {
    return combineLatest(sources).pipe(
      map(values => this.mapToObject(values, edges))
    );
  }

  private mapToObject(values: any[], edges: any[]): Record<string, any> {
    const result: Record<string, any> = {};
    values.forEach((value, index) => {
      const prop = edges[index]?.toProperty;
      if (prop) result[prop] = value;
    });
    return result;
  }
}

@Injectable()
class WithLatestFromStrategy implements IEdgeModeStrategy {
  combine(sources: Observable<any>[], edges: any[]): Observable<any> {
    const primaryIndex = edges.findIndex(edge => edge.isPrimary === true);

    if (primaryIndex === -1) {
      return this.fallbackToCombineLatest(sources, edges);
    }

    const primarySource = sources[primaryIndex]!;
    const secondarySources = sources.filter((_, i) => i !== primaryIndex);
    const primaryEdge = edges[primaryIndex]!;
    const secondaryEdges = edges.filter((_, i) => i !== primaryIndex);

    if (secondarySources.length === 0) {
      return primarySource.pipe(
        map(value => ({ [primaryEdge.toProperty!]: value }))
      );
    }

    return primarySource.pipe(
      withLatestFrom(...secondarySources),
      map(([primaryValue, ...secondaryValues]) => {
        const result: Record<string, any> = {};

        if (primaryEdge.toProperty) {
          result[primaryEdge.toProperty] = primaryValue;
        }

        secondaryValues.forEach((value, index) => {
          const prop = secondaryEdges[index]?.toProperty;
          if (prop) result[prop] = value;
        });

        return result;
      })
    );
  }

  private fallbackToCombineLatest(sources: Observable<any>[], edges: any[]): Observable<any> {
    return combineLatest(sources).pipe(
      map(values => {
        const result: Record<string, any> = {};
        values.forEach((value, index) => {
          const prop = edges[index]?.toProperty;
          if (prop) result[prop] = value;
        });
        return result;
      })
    );
  }
}

// 注册所有 providers
root.set([
  { provide: EntityManager, useValue: new MockEntityManager() },
  { provide: EDGE_MODE_STRATEGY, useClass: MergeStrategy, multi: 'map', mapKey: EdgeMode.MERGE },
  { provide: EDGE_MODE_STRATEGY, useClass: ZipStrategy, multi: 'map', mapKey: EdgeMode.ZIP },
  { provide: EDGE_MODE_STRATEGY, useClass: CombineLatestStrategy, multi: 'map', mapKey: EdgeMode.COMBINE_LATEST },
  { provide: EDGE_MODE_STRATEGY, useClass: WithLatestFromStrategy, multi: 'map', mapKey: EdgeMode.WITH_LATEST_FROM },
]);
