// /** @namespace [JSX] */

import { VNode, JSXAttribute } from "hyperapp";

declare global {
  namespace JSX {
    interface Element extends VNode<any> {}
    interface IntrinsicElements {
      [elemName: string]: JSXAttribute;
    }
  }
}

export {}