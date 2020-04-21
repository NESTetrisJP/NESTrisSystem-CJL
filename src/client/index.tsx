import { h, app } from "hyperapp";
import { Mutex } from "await-semaphore"
import Renderer from "../common/renderer"
import deepEqual from "fast-deep-equal"
import DataProcessor from "../common/data-processor"
import { CanvasReferences } from "../common/canvas-references"
import GameRenderer from "../common/game-renderer"

const r = Renderer.getInstance()

const selectRoom = (state, name) => {
  return [{
    ...state,
    selectedRoom: name
  }, [updateCanvasContextsEffect]]
}

let canvasContexts: CanvasReferences = {
  "qualifier": [],
  "qualifier-ranking": [],
  "1v1a": [],
  "1v1b": [],
  "award": []
}

const updateCanvasContexts = (state) => {
  const result = {
    "qualifier": [],
    "qualifier-ranking": [],
    "1v1a": [],
    "1v1b": [],
    "award": []
  }

  switch (state.selectedRoom) {
    case "qualifier": {
      const elements = Array.from(document.querySelectorAll<HTMLCanvasElement>(`#room-qualifier>.game-container>canvas`))
      result["qualifier"].push(elements.map(e => ({ context: e.getContext("2d"), position: null })))
      const rankingElement = document.querySelector<HTMLCanvasElement>(`#room-qualifier>.ranking`)
      if (rankingElement != null) result["qualifier-ranking"].push(({ context: rankingElement.getContext("2d"), position: null }))
    }
    break
    case "1v1a":
    case "1v1b":
      const element = document.querySelector<HTMLCanvasElement>(`#room-${state.selectedRoom}>.game-container>canvas`)
      if (element != null) {
        result[state.selectedRoom].push([
          { context: element.getContext("2d"), position: 0 },
          { context: element.getContext("2d"), position: 1 }
        ])
      }
      break
  }

  canvasContexts = result
  return state
}

let onServerMessageCallback: Function = null

const onServerMessage = (state, data) => {
  const roomPlayers = {
    "all": data.users.length
  }
  Object.keys(data.rooms).forEach(room => {
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

const onServerMessageEffect = (dispatch) => {
  onServerMessageCallback = (data) => dispatch(onServerMessage, data)
  return () => onServerMessageCallback = null
}

const updateRoomInfo = dispatch => {
  setTimeout(() => dispatch(updateCanvasContexts), 100)
}

const updateCanvasContextsEffect = dispatch => {
  setTimeout(() => dispatch(updateCanvasContexts), 100)
}

const constructRoomSelectorElements = (state) => {
  const displayNames = ["予選", "1v1-A", "1v1-B"]
  const internalNames = ["qualifier", "1v1a", "1v1b"]
  return displayNames.map((name, i) => {
    const internalName = internalNames[i]
    const classes = [
      "room-name",
      internalName == state.selectedRoom && "room-name-active"
    ]
    return <span class={classes} onClick={[selectRoom, internalName]}>{name} ({state.roomPlayers[internalName]})</span>
  })
}

const constructRoomElement = (state, name: string) => {
  let innerElements
  if (name == state.selectedRoom) {
    if (name == "qualifier") {
      innerElements = [
        <div class="game-container game-container-qualifier">
          {[...Array(state.roomPlayers[name])].map((e, i) => {
            return <canvas class="game" width="96" height="232"></canvas>
          })}
        </div>,
        <canvas class="ranking" width="104" height="254"></canvas>
      ]
    } else if (name.startsWith("1v1")) {
      innerElements = [
        <div class="game-container game-container-qualifier">
          <canvas class="game-1v1" width="256" height="224"></canvas>
        </div>,
      ]
    }
  }
  return <div id={"room-" + name}>{innerElements}</div>
}

app({
  init: [
    {
      selectedRoom: "qualifier",
      roomPlayers: {}
    }
  ],
  view: state => (
    <div id="root">
      <div id="rooms">
        { constructRoomSelectorElements(state) }
      </div>
      { constructRoomElement(state, "qualifier") }
      { constructRoomElement(state, "1v1a") }
      { constructRoomElement(state, "1v1b") }
      <canvas id="main" width="640" height="360"></canvas>
    </div>
  ),
  subscriptions: state => [
    [onServerMessageEffect, {}]
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
    const data = JSON.parse(await e.data.text())
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

r.initialize().then(() => {
  updateCanvasContexts({ selectedRoom: "qualifier" })
  const onFrame = () => {
    dataProcessor.onRender()
    const qualifierRanking = dataProcessor.getRankingOfRoom("qualifier")

    GameRenderer.renderRoom(canvasContexts["qualifier"], dataProcessor, "qualifier", 0, qualifierRanking.userToRankIndex)
    GameRenderer.renderRoom(canvasContexts["1v1a"], dataProcessor, "1v1a", 1)
    GameRenderer.renderRoom(canvasContexts["1v1b"], dataProcessor, "1v1b", 1)
    GameRenderer.renderQualifierRanking(canvasContexts["qualifier-ranking"], qualifierRanking.ranking)
  }

  const _onFrame = () => {
    onFrame()
    requestAnimationFrame(_onFrame)
  }
  requestAnimationFrame(_onFrame)
})