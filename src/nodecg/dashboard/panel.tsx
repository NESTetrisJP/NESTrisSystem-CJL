import { h, app } from "hyperapp"

const replicantNames = [
  "serverActive"
]

const replicants = {}
const replicantInitialStates = {}
const replicantActions = {}
const replicantEffects = {}
const replicantSubscriptions = {}

replicantNames.forEach(name => {
  replicants[name] = nodecg.Replicant(name)
  replicantActions[name] = (state, newValue) => ({ ...state, nodecg: { ...state.nodecg, [name]: newValue } })
  replicantEffects[name] = (dispatch, {}) => {
    const onChange = (newValue, oldValue) => {
      setTimeout(() => {
        // setTimeoutしないと無限再帰する…
        dispatch(replicantActions[name], newValue)
      })
    }
    replicants[name].on("change", onChange)
    return () => replicants[name].off("change", onChange)
  }
  replicantSubscriptions[name] = [replicantEffects[name], {}]
})

Promise.all(
  replicantNames.map(name => new Promise((resolve, reject) => nodecg.readReplicant(name, value => {
      replicantInitialStates[name] = value
      resolve()
    }))
  )
).then(() => {
  app({
    init: [
      { nodecg: replicantInitialStates }
    ],
    view: state => (
      <div>

      </div>
    ),
    subscriptions: state => [
      ...Object.values(replicantSubscriptions)
    ],
    node: document.querySelector("#root")
  })
})
