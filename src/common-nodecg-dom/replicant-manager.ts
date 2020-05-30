import { Action, Dispatch, Dispatchable } from "hyperapp"

declare global {
}

type State<R extends ReplicantNames> = {
  nodecg: Pick<ReplicantTypes, R>
}

export default class ReplicantManager<R extends ReplicantNames, M extends MessageNames> {
  replicantNames: string[]
  replicants: {[key in R]: NodeCG.Replicant<key>}
  replicantActions: {[key in R]: <S extends State<R>>(state: S, newValue: ReplicantTypes[key]) => S}
  replicantEffects: {[key in R]: <S extends State<R>>(dispatch: Dispatch<S, ReplicantTypes[key]>, {}) => void}
  replicantSubscriptions: {[key in R]: [Function, {}]}

  messageEffects: {[key in M]: <S extends State<R>>(dispatch: Dispatch<S>, {}) => void}
  messageSubscriptions: {[key in M]: [Function, {}]}

  constructor(replicantNames: R[], messages: { [key in M]: <T, S extends State<R>>(dispatch: Dispatch<S, T>, data: MessageDataTypes[key]) => void }) {
    this.replicantNames = replicantNames
    this.replicants = {} as any
    this.replicantActions = {} as any
    this.replicantEffects = {} as any
    this.replicantSubscriptions = {} as any

    this.messageEffects = {} as any
    this.messageSubscriptions = {} as any

    this.replicantNames.forEach((name: R) => {
      this.replicants[name] = nodecg.Replicant(name)
      this.replicantActions[name] = (state, newValue) => ({ ...state, nodecg: { ...state.nodecg, [name]: newValue } })
      this.replicantEffects[name] = <S extends State<R>>(dispatch: (obj: Dispatchable<S, any, any>, data: ReplicantTypes[R]) => void, {}) => { // urgh!
      // this.replicantEffects[name] = (dispatch, {}) => {
        const onChange = (newValue: ReplicantTypes[R], oldValue: ReplicantTypes[R]) => {
          setTimeout(() => {
            // no setTimeout results in infinite loop
            dispatch(this.replicantActions[name], newValue)
          })
        }
        this.replicants[name].on("change", onChange)
        return () => this.replicants[name].removeListener("change", onChange)
      }
      this.replicantSubscriptions[name] = [this.replicantEffects[name], {}]
    })

    Object.keys(messages).forEach((message: M) => {
      this.messageEffects[message] = (dispatch, {}) => {
        const onMessage = (data: MessageDataTypes[M]) => messages[message](dispatch, data)
        nodecg.listenFor(message, onMessage)
        return () => nodecg.unlisten(message, onMessage)
      }
      this.messageSubscriptions[message] = [this.messageEffects[message], {}]
    })
  }

  async initialize() {
    const initialStates = {} as State<R>["nodecg"]
    await Promise.all(this.replicantNames.map((name: R) => {
      return new Promise((resolve, reject) => nodecg.readReplicant(name, value => {
          initialStates[name] = value
          resolve()
        })
      )
    }))
    return initialStates
  }

  getReplicant(name: R) {
    return this.replicants[name]
  }

  getSubscriptions() {
    return [
      ...Object.values(this.replicantSubscriptions),
      ...Object.values(this.messageSubscriptions),
    ]
  }
  getHelperFunctions() {
    return {
      updateFromInput: <S extends State<R>>(state: S, [id, replicantName]: [string, R & { [key in ReplicantNames]: ReplicantTypes[key] extends string ? key : never }[ReplicantNames]]): S => {
        const value = (document.querySelector(`#${id}`) as HTMLInputElement).value
        this.getReplicant(replicantName).value = value as ReplicantTypes[R] // urgh!
        return { ...state, nodecg: { ...state.nodecg, [replicantName]: value } }
      },
      sendMessage: <S extends State<R>>(state: S, [message, data]: [M, MessageTypes[M]["data"]]) => {
        nodecg.sendMessage(message, data)
        return state
      }
    }
  }
}

const a = new ReplicantManager(["footer"], {})