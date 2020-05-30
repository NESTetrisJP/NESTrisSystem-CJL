import { h, app, Action, EffectFunction } from "hyperapp"
import Renderer from "../common-dom/renderer"
import AudioManager from "../common-dom/audio-manager"
import deepEqual from "fast-deep-equal"
import DataProcessor from "../common-dom/data-processor"
import GameRenderer from "../common-dom/game-renderer"

const r = Renderer.getInstance()
const a = AudioManager.getInstance()

let currentState: any = {}

type RoomPlayers = { [room in RoomName]: number }

type State = {
  selectedRoom: string
  roomPlayers: RoomPlayers
  mute: boolean
}

const selectRoom: Action<State, string> = (state, name) => {
  return [{
    ...state,
    selectedRoom: name
  }, [updateCanvasContextsEffect]]
}

let canvasContexts: CanvasReferences = {
  "default": [],
  "qualifier": [],
  "qualifier-ranking": [],
  "1v1a": [],
  "1v1b": [],
  "1v1v1": [],
  "award": []
}

const updateCanvasContexts: Action<State> = state => {
  const result: CanvasReferences = {
    "default": [],
    "qualifier": [],
    "qualifier-ranking": [],
    "1v1a": [],
    "1v1b": [],
    "1v1v1": [],
    "award": []
  }

  switch (state.selectedRoom) {
    case "default": {
      const elements = Array.from(document.querySelectorAll<HTMLCanvasElement>(`#room-default>.game-container>canvas`))
      result["default"].push(elements.map(e => ({ context: e.getContext("2d"), position: null })))
    }
    break
    case "qualifier": {
      const elements = Array.from(document.querySelectorAll<HTMLCanvasElement>(`#room-qualifier>.game-container>canvas`))
      result["qualifier"].push(elements.map(e => ({ context: e.getContext("2d"), position: null })))
      const rankingElement = document.querySelector<HTMLCanvasElement>(`#room-qualifier>.ranking`)
      if (rankingElement != null) result["qualifier-ranking"].push(({ context: rankingElement.getContext("2d") }))
    }
    break
    case "1v1a":
    case "1v1b": {
      const element = document.querySelector<HTMLCanvasElement>(`#room-${state.selectedRoom}>.game-container>canvas`)
      if (element != null) {
        result[state.selectedRoom].push([
          { context: element.getContext("2d"), position: 0 },
          { context: element.getContext("2d"), position: 1 }
        ])
      }
    }
    break
    case "1v1v1": {
      const elements = Array.from(document.querySelectorAll<HTMLCanvasElement>(`#room-1v1v1>.game-container>canvas`))
      result["1v1v1"].push(elements.map(e => ({ context: e.getContext("2d"), position: null })))
    }
    break
  }

  canvasContexts = result
  return state
}

let onServerMessageCallback: Function = null

const onServerMessage: Action<State, ServerPacket> = (state, data) => {
  const roomPlayers = {} as RoomPlayers
  Object.keys(data.rooms).forEach((room: RoomName) => {
    roomPlayers[room] = data.rooms[room].length
  })

  if (deepEqual(roomPlayers, state.roomPlayers)) {
    return state
  }
  return [{
    ...state,
    roomPlayers
  }, [updateCanvasContextsEffect]]
}

const onServerMessageEffect: EffectFunction<State> = dispatch => {
  onServerMessageCallback = (data: ServerPacket) => dispatch(onServerMessage, data)
  return () => onServerMessageCallback = null
}

const updateRoomInfo: EffectFunction<State> = dispatch => {
  setTimeout(() => dispatch(updateCanvasContexts), 100)
}

const updateCanvasContextsEffect: EffectFunction<State> = dispatch => {
  setTimeout(() => dispatch(updateCanvasContexts), 100)
}

const toggleMute: Action<State> = state => {
  return { ...state, mute: !state.mute }
}

const constructRoomSelectorElements = (state: State) => {
  const displayNames = ["ロビー", "予選", "1v1-A", "1v1-B", "1v1v1"]
  const internalNames: RoomName[] = ["default", "qualifier", "1v1a", "1v1b", "1v1v1"]
  return displayNames.map((name, i) => {
    const internalName = internalNames[i]
    const classes = [
      "room-name",
      internalName == state.selectedRoom && "room-name-active"
    ]
    return <span class={classes} onClick={[selectRoom, internalName]}>{name} ({state.roomPlayers[internalName]})</span>
  })
}

const constructRoomElement = (state: State, name: string) => {
  let innerElements
  if (name == state.selectedRoom) {
    if (name == "default") {
      innerElements = [
        <div class="game-container">
          {[...Array(state.roomPlayers[name])].map((e, i) => {
            return <canvas class="game" width="96" height="232"></canvas>
          })}
        </div>
      ]
    } else if (name == "qualifier") {
      innerElements = [
        <div class="game-container game-container-qualifier">
          {[...Array(state.roomPlayers[name])].map((e, i) => {
            return <canvas class="game" width="96" height="232"></canvas>
          })}
        </div>,
        <canvas class="ranking" width="104" height="254"></canvas>
      ]
    } else if (name == "1v1a" || name == "1v1b") {
      innerElements = [
        <div class="game-container">
          <canvas class="game-1v1" width="256" height="224"></canvas>
        </div>,
      ]
    } else if (name == "1v1v1") {
      innerElements = [
        <div class="game-container">
          {[...Array(state.roomPlayers[name])].map((e, i) => {
            return <canvas class="game" width="96" height="232"></canvas>
          })}
        </div>,
      ]
    }
  }
  return <div id={"room-" + name}>{innerElements}</div>
}

app<State>({
  init: [
    {
      selectedRoom: "default",
      roomPlayers: {
        "default": 0,
        "qualifier": 0,
        "1v1a": 0,
        "1v1b": 0,
        "1v1v1": 0
      },
      mute: false
    }
  ],
  view: state => (
    <div id="root">
      <div id="rooms">
        { constructRoomSelectorElements(state) }
      </div>
      <div class={["mute", state.mute && "mute-active"]} onclick={[toggleMute]}>ミュート</div>
      { constructRoomElement(state, "default") }
      { constructRoomElement(state, "qualifier") }
      { constructRoomElement(state, "1v1a") }
      { constructRoomElement(state, "1v1b") }
      { constructRoomElement(state, "1v1v1") }
      <canvas id="main" width="640" height="360"></canvas>
      { /* Expose current state */ (() => { currentState = state; return false })() }
    </div>
  ),
  subscriptions: state => [
    false && [onServerMessageEffect]
  ],
  node: document.querySelector("#root")
})

const dataProcessor = new DataProcessor()

const newConnection = () => {
  let sock = new WebSocket(`${location.protocol == "https:" ? "wss" : "ws"}://${location.hostname}:5042`)

  sock.addEventListener("open", e => {
    console.log("WebSocket opened")
  })

  sock.addEventListener("message", async (e) => {
    const data: ServerPacket = JSON.parse(e.data)
    await dataProcessor.onData(data)
    if (onServerMessageCallback != null) onServerMessageCallback(data)
  })

  sock.addEventListener("close", e => {
    console.log("WebSocket closed")
    setTimeout(() => {
      webSocket = newConnection()
    }, 3000)
  })

  sock.addEventListener("error", e => {
    console.error(e)
  })

  return sock
}

let webSocket = newConnection()

Promise.all([
  r.initialize(),
  a.initialize(),
]).then(() => {
  updateCanvasContexts({ selectedRoom: "default" } as State)
  const onFrame = () => {
    dataProcessor.onRender()
    const qualifierRanking = dataProcessor.getRankingOfRoom("qualifier", true)
    const _1v1v1Ranking = dataProcessor.getRankingOfRoom("1v1v1", false)

    GameRenderer.renderRoomSingles(canvasContexts["default"], dataProcessor, "default", currentState.mute)
    GameRenderer.renderRoomSingles(canvasContexts["qualifier"], dataProcessor, "qualifier", currentState.mute, false, qualifierRanking)
    GameRenderer.renderRoomDoubles(canvasContexts["1v1a"], dataProcessor, "1v1a", currentState.mute)
    GameRenderer.renderRoomDoubles(canvasContexts["1v1b"], dataProcessor, "1v1b", currentState.mute)
    GameRenderer.renderRoomSingles(canvasContexts["1v1v1"], dataProcessor, "1v1v1", currentState.mute, true, _1v1v1Ranking)
    GameRenderer.renderQualifierRanking(canvasContexts["qualifier-ranking"], qualifierRanking, dataProcessor.qualifyTime)
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