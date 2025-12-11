import { createAction, props } from './action-creator'
import { capitalize, uncapitalize } from './helpers'
import type {
  Action,
  ActionCreator,
  ActionCreatorProps,
  Creator,
  FunctionWithParametersType,
  NotAllowedCheck,
} from './models'

/**
 * 字符串字面量检查
 */
type StringLiteralCheck<
  Str extends string,
  Name extends string,
> = string extends Str ? `${Name} 必须是字符串字面量类型` : unknown

/**
 * 唯一事件名称检查
 */
type UniqueEventNameCheck<EventNames extends string, EventName extends string> =
  ActionName<EventName> extends ActionName<Exclude<EventNames, EventName>>
    ? `${ActionName<EventName>} action 已定义`
    : unknown

/**
 * 事件 Props 检查
 */
type NotAllowedEventPropsCheck<
  PropsCreator extends ActionCreatorProps<unknown> | Creator,
> =
  PropsCreator extends ActionCreatorProps<infer Props>
    ? Props extends void
      ? unknown
      : NotAllowedCheck<Props & object>
    : PropsCreator extends Creator<any, infer Result>
      ? NotAllowedCheck<Result>
      : unknown

/**
 * 事件创建器类型
 */
type EventCreator<
  PropsCreator extends ActionCreatorProps<unknown> | Creator,
  Type extends string,
> =
  PropsCreator extends ActionCreatorProps<infer Props>
    ? void extends Props
      ? ActionCreator<Type, () => Action<Type>>
      : ActionCreator<
          Type,
          (
            props: Props & NotAllowedCheck<Props & object>,
          ) => Props & Action<Type>
        >
    : PropsCreator extends Creator<infer Props, infer Result>
      ? FunctionWithParametersType<
          Props,
          Result & NotAllowedCheck<Result> & Action<Type>
        > &
          Action<Type>
      : never

/**
 * 将事件名转换为 camelCase action 名称
 */
type ActionName<EventName extends string> = Uncapitalize<
  Join<CapitalizeWords<EventName>>
>

/**
 * 移除字符串中的分隔符
 */
type Join<
  Str extends string,
  Separator extends string = ' ',
> = Str extends `${infer First}${Separator}${infer Rest}`
  ? Join<`${First}${Rest}`, Separator>
  : Str

/**
 * 首字母大写每个单词
 */
type CapitalizeWords<Str extends string> =
  Str extends `${infer First} ${infer Rest}`
    ? `${Capitalize<First>} ${CapitalizeWords<Rest>}`
    : Capitalize<Str>

/**
 * Action Group 配置
 */
interface ActionGroupConfig<
  Source extends string,
  Events extends Record<string, ActionCreatorProps<unknown> | Creator>,
> {
  source: Source & StringLiteralCheck<Source, 'source'>
  events: Events & {
    [EventName in keyof Events]: StringLiteralCheck<
      EventName & string,
      'event name'
    > &
      UniqueEventNameCheck<keyof Events & string, EventName & string> &
      NotAllowedEventPropsCheck<Events[EventName]>
  }
}

/**
 * Action Group 类型
 */
type ActionGroup<
  Source extends string,
  Events extends Record<string, ActionCreatorProps<unknown> | Creator>,
> = {
  [EventName in keyof Events as ActionName<EventName & string>]: EventCreator<
    Events[EventName],
    `[${Source}] ${EventName & string}`
  >
}

/**
 * 创建 Action Group
 *
 * @example
 * ```ts
 * const authApiActions = createActionGroup({
 *   source: 'Auth API',
 *   events: {
 *     'Login Success': props<{ userId: number; token: string }>(),
 *     'Login Failure': props<{ error: string }>(),
 *     'Logout Success': emptyProps(),
 *   },
 * });
 *
 * // action type: "[Auth API] Login Success"
 * authApiActions.loginSuccess({ userId: 10, token: 'token' });
 *
 * // action type: "[Auth API] Logout Success"
 * authApiActions.logoutSuccess();
 * ```
 */
export const createActionGroup = <
  Source extends string,
  Events extends Record<string, ActionCreatorProps<unknown> | Creator>,
>(
  config: ActionGroupConfig<Source, Events>,
): ActionGroup<Source, Events> => {
  const { source, events } = config

  return Object.keys(events).reduce(
    (actionGroup, eventName) => ({
      ...actionGroup,
      [toActionName(eventName)]: createAction(
        toActionType(source, eventName),
        (events as any)[eventName],
      ),
    }),
    {} as ActionGroup<Source, Events>,
  )
}

/**
 * 空 props（用于无参数的 action）
 */
export const emptyProps = (): ActionCreatorProps<void> => props()

/**
 * 将事件名转换为 camelCase
 */
const toActionName = <EventName extends string>(
  eventName: EventName,
): ActionName<EventName> =>
  eventName
    .trim()
    .split(' ')
    .map((word, i) => (i === 0 ? uncapitalize(word) : capitalize(word)))
    .join('') as ActionName<EventName>

/**
 * 生成 Action Type
 */
const toActionType = <Source extends string, EventName extends string>(
  source: Source,
  eventName: EventName,
): `[${Source}] ${EventName}` => `[${source}] ${eventName}`
