// 使い方間違えてるけど…
import { CreateNodecgInstance, CreateNodecgConstructor } from "ts-nodecg/browser"

declare global {
  type NodeCG = CreateNodecgInstance<
    "ctwc-japan-lite",
    any,
    any,
    any
  >

  var nodecg: NodeCG
}
