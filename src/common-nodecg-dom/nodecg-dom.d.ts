// NodeCG typing
// https://github.com/Hoishin/ts-nodecg

import { CreateNodecgInstance, CreateNodecgConstructor, Replicant as Replicant_ } from "ts-nodecg/browser"

declare global {
  interface Window {
    nodecg: CreateNodecgInstance<
			"ctwc-japan-lite",
			any,
			ReplicantMap,
			MessageMap
		>
		NodeCG: CreateNodecgConstructor<
			"ctwc-japan-lite",
			any,
			ReplicantMap,
			MessageMap
		>
  }

  const nodecg: CreateNodecgInstance<
    "ctwc-japan-lite",
    any,
    ReplicantMap,
    MessageMap
  >
  const NodeCG: CreateNodecgConstructor<
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
