// 使い方間違えてるけど…
import { CreateNodecgInstance, CreateNodecgConstructor, Replicant as Replicant_ } from "ts-nodecg/browser"

declare global {
  type NodeCG = CreateNodecgInstance<
    "ctwc-japan-lite",
    any,
    any,
    any
  >

  var nodecg: NodeCG
  type Replicant = Replicant_<
    "ctwc-japan-lite",
    any,
    any,
    any
  >
}
