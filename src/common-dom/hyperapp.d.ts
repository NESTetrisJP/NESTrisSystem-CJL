// A minimal Hyperapp V2 type definition
// Ideas / some copied from:
// * https://codesandbox.io/s/hyperapp-v2-type-definition-improvement-minimal-bnzln?file=/hyperapp.d.ts
// * https://github.com/diontools/typerapp/blob/master/main/index.ts

declare module "hyperapp" {
  /** The VDOM representation of an Element. */
  export interface VNode<Attributes = {}> {
    nodeName: string
    attributes?: Attributes
    children: (VNode | string)[]
    key: string | number | null
  }

  /** Possibles children types. */
  export type Children = VNode | string | number | null

  /** A Component is a function that returns a custom VNode or View. */
  export interface Component<Attributes = {}> {
    (attributes: Attributes, children: Children[]): VNode<Attributes>
  }

  /**
   * The soft way to create a VNode.
   * @param nodeName An element name or a Component function
   * @param attributes Any valid HTML atributes, events, styles, and meta data
   * @param children The children of the VNode
   * @returns A VNode tree.
   *
   * @memberOf [VDOM]
   */
  export function h<Attributes>(
    nodeName: Component<Attributes> | string,
    attributes?: Attributes,
    ...children: (Children | Children[])[]
  ): VNode<Attributes>

  export type Dispatch<State> = {
    (action: Action<State, void>): void
    <Payload>(action: Action<State, Payload>, params: Payload): void
  }

  export type EffectFunction<State> = (dispatch: Dispatch<State>) => (void | (() => void))
  // export type UnsubscribableEffectFunction<State> = (dispatch: Dispatch<State>) => (() => void)

  export type Action<State, Payload = void> = (state: State, payload: Payload) => (State | [State, EffectFunction<State>[]])
  // export type ActionWithEffects<State, Payload> = (state: State, payload: Payload) => [ State, Effect[] ]

  export type Init<State> = [State]
  export type View<State> = (state: State) => VNode<object> | null
  export type Subscriptions<State> = (state: State) => (false | [EffectFunction<State>])[]

  export interface AppProps<State> {
    init?: Init<State>
    view: View<State>
    node: Element
    subscriptions?: Subscriptions<State>
  }

  export function app<State>(app: AppProps<State>): void

  type EventKeys = keyof GlobalEventHandlers

  type EventParameterType<Key extends EventKeys> = Parameters<
    Exclude<GlobalEventHandlers[Key], null>
  >[0]

  // <div onclick={A} title={B} />
  //   -> A: Dispatchable<any, MouseEvent, any>  B: any
  //
  type JSXAttribute = Partial<
    { [key in EventKeys]: any }
  > & { [key: string]: any }
}