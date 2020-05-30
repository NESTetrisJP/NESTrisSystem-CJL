// NodeCG typing
// https://github.com/Hoishin/ts-nodecg

import { CreateNodecgInstance, Replicant as Replicant_ } from "ts-nodecg/server"

declare global {
  type NodeCG = CreateNodecgInstance<
    "ctwc-japan-lite",
    any,
    ReplicantTypes,
    MessageTypes
  >
  namespace NodeCG {
    type Replicant<K extends keyof(ReplicantTypes)> = Replicant_<
      "ctwc-japan-lite",
      ReplicantTypes,
      K,
      ReplicantTypes[K]
    >
  }
}