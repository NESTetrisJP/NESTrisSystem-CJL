import { h, app } from "hyperapp";
import { Mutex } from "await-semaphore"
import r from "../common/renderer"
import deepEqual from "fast-deep-equal"

import DataProcessor from "../common/data-processor"

const selectRoom = (state, name) => {
  return [{
    ...state,
    selectedRoom: name
  }, [updateCanvasContextsEffect]]
}

/*
let canvasContexts = {
  singlePlayers: new Array<CanvasRenderingContext2D[]>(),
  doublePlayers: new Array<CanvasRenderingContext2D[]>(),
  ranking: new Array<CanvasRenderingContext2D>(),
  award: new Array<CanvasRenderingContext2D>()
}
*/

type CanvasReference = {
  context: CanvasRenderingContext2D,
  position: number
}

let canvasContexts = {
  "qualifier": new Array<CanvasReference[]>(),
  "qualifier-ranking": new Array<CanvasReference>(),
  "1v1a": new Array<CanvasReference[]>(),
  "1v1b": new Array<CanvasReference[]>(),
}

const updateCanvasContexts = (state) => {
  const result = {
    "qualifier": [],
    "qualifier-ranking": [],
    "1v1a": [],
    "1v1b": [],
  }

  switch (state.selectedRoom) {
    case "qualifier":
      const sp = Array.from(document.querySelectorAll<HTMLCanvasElement>(`#room-qualifier>.game-container>canvas`)).map(e => ({ context: e.getContext("2d"), position: null }))
      result["qualifier"].push(sp)
      const ranking = { context: document.querySelector<HTMLCanvasElement>(`#room-qualifier>.ranking`).getContext("2d"), position: null}
      result["qualifier-ranking"].push(ranking)
      break
    case "1v1a":
    case "1v1b":
      const context = document.querySelector<HTMLCanvasElement>(`#room-${state.selectedRoom}>.game-container>canvas`).getContext("2d")
      result[state.selectedRoom].push([
        { context, position: 0 },
        { context, position: 1 }
      ])
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

r.init()

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

const sock = new WebSocket(`${location.protocol == "https:" ? "wss" : "ws"}://${location.hostname}:5042`)

sock.addEventListener("open", e => {
  console.log("open")
})

sock.addEventListener("message", async (e) => {
  const data = JSON.parse(await e.data.text())
  await dataProcessor.onData(data)
  if (onServerMessageCallback != null) onServerMessageCallback(data)
})

sock.addEventListener("close", e => {
  console.log("close")
})

sock.addEventListener("error", e => {
  console.log("error")
})


const formatScore = (score, hex) => {
  const hexStrings = ["A", "B", "C", "D", "E", "F"]
  if (hex) {
    const topDigit = Math.floor(score / 100000)
    const topChar = topDigit >= 10 ? hexStrings[topDigit - 10] : String(topDigit)
    const lowerDigits = score % 100000
    return topChar + String(lowerDigits).padStart(5, "0")
  }
  return String(score).padStart(6, "0")
}

const renderIcon = (ctx, userName) => {
  const icon = r.requestUserIcon(userName)
  if (icon != null) {
    ctx.drawImage(icon, 0, 16, 79, 79)
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
    ctx.fillRect(0, 16, 79, 79)
  }
}

const renderField = (ctx, field, blockColor) => {
  field.forEach((blockId, i) => {
    const dx = ((i % 10) * 8)
    const dy = (Math.floor(i / 10) * 8)
    if (blockId != 0) {
      ctx.drawImage(r.blocks, (blockId - 1) * 8, blockColor * 8, 8, 8, dx, dy, 8, 8)
    }
  })
}
const renderNext = (ctx, next, blockColor, size) => {
  if (size != 6 && size != 8) return
  const sourceImage = size == 6 ? r.blocks6 : r.blocks
  r.nextPieceRenderingData[next].forEach(e => {
    ctx.drawImage(sourceImage, (e[2] - 1) * size, blockColor * size, size, size, e[0] * size, e[1] * size, size, size)
  })
}
const renderHearts = (ctx, [active, max], rtl) => {
  for (let i = 0; i < max; i++) {
    const act = i < active
    ctx.drawImage(r.heart, act ? 8 : 0, 0, 8, 8, i * 8 * (rtl ? -1 : 1), 0, 8, 8)
  }
}

const renderRoom = (roomName: string, type: number, userToRankIndex?) => {
  if (type == 0) {
    canvasContexts[roomName].forEach(set => {
      const canvasSet = new Set<CanvasRenderingContext2D>()
      set.forEach((reference, i) => {
        canvasSet.add(reference.context)
      })
      canvasSet.forEach(ctx => {
        ctx.clearRect(0, 0, 96, 232)
        ctx.drawImage(r.fieldTiny, 0, 0)
      })
      set.forEach((reference, i) => {
        const userName = dataProcessor.getRoomUsers("qualifier")[i]
        const d = dataProcessor.getPlayerState(userName)
        if (d != null) {
          const ctx = reference.context
          r.drawTextCentered(ctx, userName, 48, 216)
          const rankString = (userToRankIndex.get(userName) + 1).toString().padStart(2, "0")
          const bestScoreString = formatScore(d.bestScore, true)
          const scoreString = formatScore(d.score, true)
          const levelString = (0).toString().padStart(2, "0")
          const linesString = d.lines.toString().padStart(3, "0")
          r.drawText(ctx, `#${rankString}:${bestScoreString}`, 8, 8)
          r.drawText(ctx, `${scoreString}-${linesString}`, 8, 16)
          const blockColor = d.level % 10
          ctx.save()
          ctx.translate(8, 40)
          renderIcon(ctx, userName)
          renderField(ctx, d.field, blockColor)
          renderHearts(ctx, dataProcessor.getPlayerInfo(userName).hearts, false)
          ctx.restore()
          ctx.save()
          ctx.translate(64, 42)
          renderNext(ctx, d.next, blockColor, 6)
          ctx.restore()
        }
      })
    })
  } else if (type == 1) {
    canvasContexts[roomName].forEach(set => {
      // Note: (ctxA, 0), (ctxA, 1), (ctxB, 0), (ctxB, 1), ...の順番に並んでいること
      set.forEach((reference, i) => {
        const userName = dataProcessor.getRoomUsers(roomName)[i]
        const d = dataProcessor.getPlayerState(userName)
        if (d != null) {
          const ctx = reference.context
          const position = reference.position
          if (position == 0) {
            ctx.clearRect(0, 0, 256, 224)
            ctx.drawImage(r.field2P, 0, 0)
            r.drawText(ctx, formatScore(d.score, false).padEnd(8, " "), 96, 40)
            r.drawText(ctx, String(d.lines).padStart(3, "0"), 96, 88)
            r.drawText(ctx, String(d.level).padStart(2, "0"), 96, 120)
            r.drawTextCentered(ctx, userName, 48, 208)
            const blockColor = d.level % 10
            ctx.save()
            ctx.translate(8, 32)
            renderIcon(ctx, userName)
            renderField(ctx, d.field, blockColor)
            ctx.restore()
            ctx.save()
            ctx.translate(32, 8)
            renderNext(ctx, d.next, blockColor, 8)
            ctx.restore()
            ctx.save()
            ctx.translate(96, 208)
            renderHearts(ctx, dataProcessor.getPlayerInfo(userName).hearts, false)
            ctx.restore()
          }
          if (position == 1) {
            r.drawText(ctx, formatScore(d.score, false).padStart(8, " "), 96, 56)
            r.drawText(ctx, String(d.lines).padStart(3, "0"), 136, 88)
            r.drawText(ctx, String(d.level).padStart(2, "0"), 144, 120)
            r.drawTextCentered(ctx, userName, 208, 208)
            const blockColor = d.level % 10
            ctx.save()
            ctx.translate(168, 32)
            renderIcon(ctx, userName)
            renderField(ctx, d.field, blockColor)
            ctx.restore()
            ctx.save()
            ctx.translate(192, 8)
            renderNext(ctx, d.next, blockColor, 8)
            ctx.restore()
            ctx.save()
            ctx.translate(152, 208)
            renderHearts(ctx, dataProcessor.getPlayerInfo(userName).hearts, true)
            ctx.restore()
          }
        }
      })
      const reference = set[0]
      const ctx = reference.context
      const userName1 = dataProcessor.getRoomUsers(roomName)[0]
      const userName2 = dataProcessor.getRoomUsers(roomName)[1]
      const d1 = dataProcessor.getPlayerState(userName1)
      const d2 = dataProcessor.getPlayerState(userName2)
      if (d1 != null && d2 != null) {
        const p1Char = d1.score > d2.score ? "<" : " "
        const p2Char = d2.score > d1.score ? ">" : " "
        r.drawText(ctx, p1Char + formatScore(Math.abs(d1.score - d2.score), false) + p2Char, 96, 48)
        ctx.globalCompositeOperation = "multiply"
        if (d1.score == d2.score) {
          ctx.fillStyle = "rgb(250, 245, 0)"
        } else {
          ctx.fillStyle = "rgb(53, 202, 53)"
        }
        ctx.fillRect(96, 48, 64, 8)
        ctx.globalCompositeOperation = "source-over"
      }
    })
  }
}
const renderQualifierRanking = (ranking) => {
  canvasContexts["qualifier-ranking"].forEach(reference => {
    const ctx = reference.context
    ctx.clearRect(0, 0, 104, 254)
    ctx.drawImage(r.rankingFrame, 0, 0)
    r.drawText(ctx, "RANKING", 24, 8)
    ranking.forEach(([userName, score], i) => {
      r.drawText(ctx, `${i + 1}.${userName}`, 8, 32 + i * 24)
      const scoreString = String(score)
      r.drawText(ctx, scoreString, 96 - scoreString.length * 8, 40 + i * 24)
    })
  })
}

const getRankingOfRoom = (roomName) => {
  const ranking = []
  const userToRankIndex = new Map<string, number>()
  dataProcessor.getRoomUsers(roomName).forEach(userName => {
    const d = dataProcessor.getPlayerState(userName)
    if (d != null) {
      ranking.push([userName, d.bestScore])
    }
  })
  ranking.sort((a, b) => b[1] - a[1])
  ranking.forEach(([name, _], i) => userToRankIndex.set(name, i))
  return { ranking, userToRankIndex }
}

const renderAward = (userName) => {
  canvasContexts["award"].forEach(reference => {
    const ctx = reference.context
    ctx.clearRect(0, 0, 128, 160)
    ctx.drawImage(r.award, 0, 0)
    const icon = r.requestUserIcon(userName)
    if (icon != null) {
      ctx.drawImage(icon, 24, 48, 79, 79)
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
    }
    r.drawTextCentered(ctx, userName, 64, 144)
  })
}

r.loadImages().then(() => {
  updateCanvasContexts({ selectedRoom: "qualifier" })
  const onFrame = () => {
    dataProcessor.onRender()
    const r = getRankingOfRoom("qualifier")
    const qualifierRanking = r.ranking
    const qualifierUserToRankIndex = r.userToRankIndex

    renderRoom("qualifier", 0, qualifierUserToRankIndex)
    renderRoom("1v1a", 1)
    renderRoom("1v1b", 1)
    renderQualifierRanking(qualifierRanking)
  }

  const _onFrame = () => {
    onFrame()
    requestAnimationFrame(_onFrame)
  }
  requestAnimationFrame(_onFrame)
})