import { h, app } from "hyperapp"
import ReplicantManager from "../../common/replicant-manager"
import Renderer from "../../common/renderer"
import BracketRenderer from "../common/bracket-renderer"

const r = Renderer.getInstance()
const bracketRenderer = new BracketRenderer()

const replicantManager = new ReplicantManager({
})
const { updateFromInput, sendMessage } = replicantManager.getHelperFunctions()

let currentState: any = {}

let canvasContexts = {
  "group-a": null,
  "group-b": null,
  "bracket": null,
}

const paramReplicant = nodecg.Replicant("bracketData")
let currentParamString = ""

const updateRealDOM = (state) => {
  ;["group-a", "group-b", "bracket"].forEach(name => {
    const element = document.querySelector<HTMLCanvasElement>(`#${name}`)
    canvasContexts[name] = element?.getContext("2d")
  })

  nodecg.readReplicant("bracketData", (data) => {
    if (currentParamString != data) {
      document.querySelector<HTMLTextAreaElement>("#params").value = data
    }
    currentParamString = data
  })

  return state
}

const updateRealDOMEffect = dispatch => {
  const intervalId = setInterval(() => dispatch(updateRealDOM), 1000)
  return () => clearInterval(intervalId)
}

const onChangeParams = (state) => {
  let valid = true
  try {
    JSON.parse(document.querySelector<HTMLTextAreaElement>("#params").value)
  } catch (e) {
    valid = false
  }
  return { ...state, valid }
}

const updateParams = (state) => {
  try {
    const data = document.querySelector<HTMLTextAreaElement>("#params").value
    paramReplicant.value = data
  } catch (e) {
  }
  return state
}

Promise.all([
  replicantManager.initialize(),
]).then(([replicantInitialStates]) => {
  app({
    init: [
      {
        nodecg: replicantInitialStates,
        valid: true
      }
    ],
    view: state => (
      <div>
        <div>
          <textarea id="params" class={[!state.valid && "error"]} cols="60" rows="30" onkeyup={[onChangeParams]} onchange={[onChangeParams]}></textarea>
          <br></br>
          <button onclick={updateParams} disabled={!state.valid}>更新</button>
        </div>
        <hr></hr>
        <div>
          <canvas id="group-a" width="232" height="184"></canvas>
          <canvas id="group-b" width="232" height="184"></canvas>
          <canvas id="bracket" width="272" height="152"></canvas>
        </div>
        { /* Expose current state */ (() => { currentState = state; return null })() }
      </div>
    ),
    subscriptions: state => [
      ...replicantManager.getSubscriptions(),
      [updateRealDOMEffect]
    ],
    node: document.querySelector("#root")
  })
})

Promise.all([
  r.initialize(),
  bracketRenderer.initialize()
]).then(() => {
  updateRealDOM({})

  const onFrame = () => {
    bracketRenderer.render(canvasContexts["group-a"], "group-a")
    bracketRenderer.render(canvasContexts["group-b"], "group-b")
    bracketRenderer.render(canvasContexts["bracket"], "bracket")
  }

  const _onFrame = () => {
    try {
      onFrame()
    } catch (e) {
      console.error(e)
    }
    requestAnimationFrame(_onFrame)
  }
  requestAnimationFrame(_onFrame)
})
