import {
  createAction,
  createReducer,
  on,
  props,
} from './index';

// Counter Feature
export interface CounterState {
  count: number;
  lastAction: string;
}

export const increment = createAction('[Counter] Increment');
export const decrement = createAction('[Counter] Decrement');
export const add = createAction('[Counter] Add', props<{ value: number }>());
export const reset = createAction('[Counter] Reset');

export const counterInitialState: CounterState = {
  count: 0,
  lastAction: 'none',
};

export const counterReducer = createReducer(
  counterInitialState,
  on(increment, (state) => ({
    ...state,
    count: state.count + 1,
    lastAction: 'increment',
  })),
  on(decrement, (state) => ({
    ...state,
    count: state.count - 1,
    lastAction: 'decrement',
  })),
  on(add, (state, { value }) => ({
    ...state,
    count: state.count + value,
    lastAction: 'add',
  })),
  on(reset, () => ({
    ...counterInitialState,
    lastAction: 'reset',
  }))
);

// User Feature
export interface UserState {
  name: string;
  loggedIn: boolean;
}

export const login = createAction('[User] Login', props<{ name: string }>());
export const logout = createAction('[User] Logout');

export const userInitialState: UserState = {
  name: '',
  loggedIn: false,
};

export const userReducer = createReducer(
  userInitialState,
  on(login, (state, { name }) => ({
    ...state,
    name,
    loggedIn: true,
  })),
  on(logout, () => userInitialState)
);

// Root State
export interface RootState {
  counter: CounterState;
  user: UserState;
}
