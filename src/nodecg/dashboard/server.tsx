import { h, app } from "hyperapp"
import ReplicantManager from "../../common/replicant-manager"

const replicantManager = new ReplicantManager({
  messages: {
    "serverCommandResponse": (dispatch, message) => {
      dispatch(receiveServerCommandResponse, message)
    }
  }
})
const { updateFromInput, sendMessage } = replicantManager.getHelperFunctions()

const resetQualifierScore = (state) => {
  nodecg.sendMessage("resetQualifierScore")
  return state
}

const confirmAction = (action) => {
  if (window.confirm("マジ？")) {
    return [action]
  }
  return [(state) => state]
}

const sendServerCommand = (state) => {
  const command = document.querySelector<HTMLInputElement>("#serverCommand").value
  nodecg.sendMessage("serverCommand", command)
  return { ...state, serverCommandLog: [{ type: "client", message: command }, ...state.serverCommandLog] }
}

const receiveServerCommandResponse = (state, message) => {
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
