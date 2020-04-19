import { h, app } from "hyperapp"
import ReplicantManager from "../../common/replicant-manager"

const replicantManager = new ReplicantManager()
const { updateFromInput, sendMessage } = replicantManager.getHelperFunctions()

const resetQualifierScore = (state) => {
  console.log("RESET")
  return state
}

const confirmAction = (action) => {
  if (window.confirm("マジ？")) {
    return [action]
  }
  return [(state) => state]
}

Promise.all([
  replicantManager.initialize()
]).then(([replicantInitialStates]) => {
  app({
    init: [
      { nodecg: replicantInitialStates }
    ],
    view: state => (
      <div>
        <div>
          <div>Server active: {state.nodecg.serverActive.toString()}</div>
          <hr></hr>
          <button id="updateTitleMessage" onclick={() => confirmAction(resetQualifierScore)}>予選スコアリセット</button>
          <hr></hr>
        </div>
      </div>
    ),
    subscriptions: state => [
      ...replicantManager.getSubscriptions()
    ],
    node: document.querySelector("#root")
  })
})
