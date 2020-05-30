import { h, app, Action } from "hyperapp"
import ReplicantManager from "../common-nodecg-dom/replicant-manager"

const replicantManager = new ReplicantManager({
  messages: {
    "serverCommandResponse": (dispatch, message) => {
      dispatch(receiveServerCommandResponse, message)
    }
  }
})

type State = {
  serverCommandLog: ServerCommandResponse[]

}

const sendServerCommand: Action<State> = state => {
  const command = document.querySelector<HTMLInputElement>("#serverCommand").value
  nodecg.sendMessage("serverCommand", command)
  return { ...state, serverCommandLog: [{ type: "client", message: command }, ...state.serverCommandLog] }
}

const receiveServerCommandResponse: Action<State, ServerCommandResponse> = (state, message) => {
  return { ...state, serverCommandLog: [message, ...state.serverCommandLog] }
}

Promise.all([
  replicantManager.initialize()
]).then(([replicantInitialStates]) => {
  app({
    init: [
      {
        nodecg: replicantInitialStates,
        serverCommandLog: []
      }
    ],
    view: state => (
      <div>
        <div>
          <div>Server active: {state.nodecg.serverActive.toString()}</div>
          <hr></hr>
          { /* <button id="updateTitleMessage" onclick={() => confirmAction(resetQualifierScore)}>予選スコアリセット</button> */ }
          <input id="serverCommand" placeholder="Command"></input>
          <button onclick={[sendServerCommand]}>送信</button>
          <hr></hr>
          {
            state.serverCommandLog.map(e => {
              const classes = [
                "command-log",
                `command-log-${e.type}`
              ]
              return <div class={classes}>{e.message}</div>
            })
          }
        </div>
      </div>
    ),
    subscriptions: state => [
      ...replicantManager.getSubscriptions()
    ],
    node: document.querySelector("#root")
  })
})
