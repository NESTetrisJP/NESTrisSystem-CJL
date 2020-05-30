// NodeCG typing
// https://github.com/Hoishin/ts-nodecg

import { CreateNodecgInstance, CreateNodecgConstructor, Replicant as Replicant_ } from "ts-nodecg/browser"

declare global {
  interface Window {
    nodecg: CreateNodecgInstance<
			"ctwc-japan-lite",
			any,
			ReplicantTypes,
			MessageTypes
		>
		NodeCG: CreateNodecgConstructor<
			"ctwc-japan-lite",
			any,
			ReplicantTypes,
			MessageTypes
		>
  }

  const nodecg: CreateNodecgInstance<
    "ctwc-japan-lite",
    any,
    ReplicantTypes,
    MessageTypes
  >
  const NodeCG: CreateNodecgConstructor<
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
