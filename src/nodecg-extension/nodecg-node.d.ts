// NodeCG typing
// https://github.com/Hoishin/ts-nodecg

import { CreateNodecgInstance, Replicant as Replicant_ } from "ts-nodecg/server"

declare global {
  type NodeCG = CreateNodecgInstance<
    "ctwc-japan-lite",
    any,
    ReplicantMap,
    MessageMap
  >
  namespace NodeCG {
    type Replicant<K extends keyof(ReplicantMap)> = Replicant_<
      "ctwc-japan-lite",
      ReplicantMap,
      K,
      ReplicantMap[K]
    >
  }
}