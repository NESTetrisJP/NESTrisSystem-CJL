type Options = {
  messages?: {
    [key: string]: Function
  }
}

export default class ReplicantManager {
  replicantNames: string[]
  replicants: {[key: string]: Replicant}
  replicantActions: {[key: string]: Function}
  replicantEffects: {[key: string]: Function}
  replicantSubscriptions: {[key: string]: [Function, {}]}

  messageEffects: {[key: string]: Function}
  messageSubscriptions: {[key: string]: [Function, {}]}

  constructor(options?: Options) {
    this.replicantNames = [
      "serverActive",
      "footer",
      "titleMessage",
      "awardedPlayer"
    ]
    this.replicants = {}
    this.replicantActions = {}
    this.replicantEffects = {}
    this.replicantSubscriptions = {}

    this.messageEffects = {}
    this.messageSubscriptions = {}

    this.replicantNames.forEach(name => {
      this.replicants[name] = nodecg.Replicant(name)
      this.replicantActions[name] = (state, newValue) => ({ ...state, nodecg: { ...state.nodecg, [name]: newValue } })
      this.replicantEffects[name] = (dispatch, {}) => {
        const onChange = (newValue, oldValue) => {
          setTimeout(() => {
            // setTimeoutしないと無限再帰する…
            dispatch(this.replicantActions[name], newValue)
          })
        }
        this.replicants[name].on("change", onChange)
        return () => this.replicants[name].off("change", onChange)
      }
      this.replicantSubscriptions[name] = [this.replicantEffects[name], {}]
    })

    if (options?.messages != null) {
      Object.keys(options.messages).forEach(message => {
        this.messageEffects[message] = (dispatch, {}) => {
          const onMessage = (data) => options.messages[message](dispatch, data)
          nodecg.listenFor(message, onMessage)
          return () => nodecg.unlisten(message, onMessage)
        }
        this.messageSubscriptions[message] = [this.messageEffects[message], {}]
      })
    }
  }

  async initialize() {
    const initialStates = {}
    await Promise.all(this.replicantNames.map(name => {
      return new Promise((resolve, reject) => nodecg.readReplicant(name, value => {
          initialStates[name] = value
          resolve()
        })
      )
    }))
    return initialStates
  }

  getReplicant(name) {
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
      updateFromInput: (state, [id, replicantName]) => {
        const value = (document.querySelector(`#${id}`) as HTMLInputElement).value
        this.getReplicant(replicantName).value = value
        return { ...state, nodecg: { ...state.nodecg, [replicantName]: value } }
      },
      sendMessage: (state, [message, data]) => {
        nodecg.sendMessage(message, data)
        return state
      }
    }
  }
}