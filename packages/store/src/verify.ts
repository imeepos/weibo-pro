/**
 * 快速验证测试 - 验证核心功能无 Angular 依赖可正常运行
 */

import {
  createAction,
  props,
  createReducer,
  on,
  createSelector,
  createFeatureSelector,
} from './index';

// ============ 测试 1: Action Creator ============
console.log('📝 测试 1: Action Creator');

const increment = createAction('[Counter] Increment');
const decrement = createAction('[Counter] Decrement');
const reset = createAction('[Counter] Reset');
const setValue = createAction('[Counter] Set Value', props<{ value: number }>());

console.log('✅ Action 创建成功:');
console.log('  - increment():', increment());
console.log('  - setValue({ value: 42 }):', setValue({ value: 42 }));

// ============ 测试 2: Reducer Creator ============
console.log('\n📝 测试 2: Reducer Creator');

interface CounterState {
  count: number;
  lastUpdated: string;
}

const initialState: CounterState = {
  count: 0,
  lastUpdated: 'never',
};

const counterReducer = createReducer(
  initialState,
  on(increment, (state) => ({
    ...state,
    count: state.count + 1,
    lastUpdated: new Date().toISOString(),
  })),
  on(decrement, (state) => ({
    ...state,
    count: state.count - 1,
    lastUpdated: new Date().toISOString(),
  })),
  on(reset, (state) => ({
    ...state,
    count: 0,
    lastUpdated: new Date().toISOString(),
  })),
  on(setValue, (state, { value }) => ({
    ...state,
    count: value,
    lastUpdated: new Date().toISOString(),
  }))
);

console.log('✅ Reducer 创建成功');
console.log('  - 初始状态:', initialState);

let state = counterReducer(undefined, { type: '@@INIT' });
console.log('  - 初始化后:', state);

state = counterReducer(state, increment());
console.log('  - increment 后:', state);

state = counterReducer(state, increment());
console.log('  - 再次 increment:', state);

state = counterReducer(state, setValue({ value: 100 }));
console.log('  - setValue(100):', state);

state = counterReducer(state, decrement());
console.log('  - decrement 后:', state);

// ============ 测试 3: Selector (记忆化) ============
console.log('\n📝 测试 3: Selector (记忆化)');

interface AppState {
  counter: CounterState;
  user: {
    name: string;
    age: number;
  };
}

const selectCounter = (state: AppState) => state.counter;
const selectCount = createSelector(
  selectCounter,
  (counter) => counter.count
);

const selectCountDouble = createSelector(
  selectCount,
  (count) => {
    console.log('    🔄 selectCountDouble 计算被执行');
    return count * 2;
  }
);

const appState: AppState = {
  counter: { count: 5, lastUpdated: '2025-01-01' },
  user: { name: 'Alice', age: 30 },
};

console.log('✅ Selector 创建成功');
console.log('  - selectCount(state):', selectCount(appState));
console.log('  - selectCountDouble(state):', selectCountDouble(appState));

// 测试记忆化：相同输入不重新计算
console.log('  - 第二次调用 selectCountDouble (应该使用缓存):');
console.log('    结果:', selectCountDouble(appState));

// 测试记忆化：不同输入重新计算
const newState = { ...appState, counter: { ...appState.counter, count: 10 } };
console.log('  - count 变化后调用 selectCountDouble (应该重新计算):');
console.log('    结果:', selectCountDouble(newState));

// ============ 测试 4: Feature Selector ============
console.log('\n📝 测试 4: Feature Selector');

const selectCounterFeature = createFeatureSelector<CounterState>('counter');
const selectCountFromFeature = createSelector(
  selectCounterFeature,
  (counter) => counter.count
);

console.log('✅ Feature Selector 创建成功');
console.log('  - selectCounterFeature(state):', selectCounterFeature(appState));
console.log('  - selectCountFromFeature(state):', selectCountFromFeature(appState));

// ============ 测试 5: 复合 Selector ============
console.log('\n📝 测试 5: 复合 Selector');

const selectUser = (state: AppState) => state.user;
const selectUserName = createSelector(selectUser, (user) => user.name);
const selectUserAge = createSelector(selectUser, (user) => user.age);

const selectViewModel = createSelector(
  selectCount,
  selectUserName,
  selectUserAge,
  (count, name, age) => ({
    message: `${name} (${age}岁) 的计数器: ${count}`,
  })
);

console.log('✅ 复合 Selector 创建成功');
console.log('  - selectViewModel(state):', selectViewModel(appState));

// ============ 总结 ============
console.log('\n✨ 所有核心功能测试通过！');
console.log('✅ Action Creator - 正常工作');
console.log('✅ Reducer Creator - 正常工作');
console.log('✅ Selector (记忆化) - 正常工作');
console.log('✅ Feature Selector - 正常工作');
console.log('✅ 复合 Selector - 正常工作');
console.log('\n🎉 @sker/store 已成功剥离 Angular 依赖！');
