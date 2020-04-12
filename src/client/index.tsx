import { h, app } from "hyperapp";
import { Mutex } from "await-semaphore"

// import Encoding from "encoding-japanese"

// Workaround
window.h = h;

import unicodeToKuten from "../unicode-to-kuten.json"
import asciiFont from "../common/images/asciifont.png"
import blocks from "../common/images/blocks.png"
import blocks6 from "../common/images/blocks6.png"
import misakiFont from "../common/images/misaki_gothic.png"
import fieldTiny from "../common/images/field_tiny.png"

const nextPieceRenderingData = {
  "I": [
    [0, 0.5, 1],
    [1, 0.5, 1],
    [2, 0.5, 1],
    [3, 0.5, 1],
  ],
  "J": [
    [0.5, 0, 2],
    [1.5, 0, 2],
    [2.5, 0, 2],
    [2.5, 1, 2],
  ],
  "L": [
    [0.5, 0, 3],
    [0.5, 1, 3],
    [1.5, 0, 3],
    [2.5, 0, 3],
  ],
  "O": [
    [1, 0, 1],
    [1, 1, 1],
    [2, 0, 1],
    [2, 1, 1],
  ],
  "S": [
    [0.5, 1, 2],
    [1.5, 0, 2],
    [1.5, 1, 2],
    [2.5, 0, 2],
  ],
  "T": [
    [0.5, 0, 1],
    [1.5, 0, 1],
    [1.5, 1, 1],
    [2.5, 0, 1],
  ],
  "Z": [
    [0.5, 0, 3],
    [1.5, 0, 3],
    [1.5, 1, 3],
    [2.5, 1, 3],
  ]
}

const fontMap = new Map<number, [number, number]>()
unicodeToKuten.forEach(e => fontMap.set(e[0], [e[1] - 1, e[2] - 1]))

const SetCount = (state, { count }) => ({ ...state, count: count });
const SetAuto = (state, { auto }) => ({ ...state, auto: auto });
const CountUp = state => ({ ...state, count: state.count + 1 });
const SetInput = (state, value) => ({ ...state, input: value });
const SetToByInput = state => ({ ...state, count: parseInt(state.input, 10) });

const DelayCountUp = (state, { timeout }) => [
  state,
  delay(CountUp, { timeout })
]

const delayRunner = (dispatch, { action, timeout }) => {
  setTimeout(() => dispatch(action), timeout);
}

const delay = (action, { timeout }) => [delayRunner, { action, timeout }];

const tickRunner = (dispatch, { action, interval }) => {
  const id = setInterval(() => dispatch(action), interval);
  return () => clearInterval(id);
}

const tick = (action, { interval }) => [tickRunner, { action, interval }];

app({
  init: [
    { count: 0, auto: false, input: "100" },
    delay(CountUp, { timeout: 1000 })
  ],
  view: state => (
    <canvas id="main" width="640" height="360"></canvas>
  ),
  subscriptions: state => state.auto && tick(CountUp, { interval: 1000 }),
  node: document.body
})

const loadImage = path => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = path
  })
}

class DataProcessor {
  data: any
  timeOffset: number
  index: number
  constructor(data, timeOffset) {
    this.data = data
    this.timeOffset = timeOffset
    this.index = 0
  }

  get(time: number): any[] {
    let result = []
    while (!this.end() && time >= this.data[this.index].time + this.timeOffset) {
      result.push(this.data[this.index])
      this.index++
    }
    // console.log(result.length)
    return result
  }

  end() {
    return this.index >= this.data.length
  }
}

window.onload = async () => {
  const asciiFontImage = await loadImage(asciiFont)
  const misakiFontImage = await loadImage(misakiFont)
  const blocksImage = await loadImage(blocks)
  const blocks6Image = await loadImage(blocks6)
  const fieldTinyImage = await loadImage(fieldTiny)
  const canvas = document.querySelector("#main") as HTMLCanvasElement
  const ctx = canvas.getContext("2d")

  const drawText = (ctx, str, dx, dy) => {
    let x = 0
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i)
      if (0x20 <= code && code < 0x80) {
          ctx.drawImage(asciiFontImage, ((code - 0x20) % 16) * 8, Math.floor((code - 0x20) / 16) * 8, 8, 8, dx + x, dy, 8, 8)
          x += 8
      } else {
        const kuten = fontMap.get(str.charCodeAt(i))
        if (kuten != null) {
          ctx.drawImage(misakiFontImage, kuten[1] * 8, kuten[0] * 8, 8, 8, dx + x, dy, 8, 8)
          x += 8
        }
      }
    }
  }

  const sock = new WebSocket("ws://127.0.0.1:5042")

  // const users = new Map<string, number>()
  let users = []
  const states = new Map<string, any>()
  let processors = []
  const messageMutex = new Mutex()

  sock.addEventListener("open", e => {
    console.log("open")
  })

  let bucketReceived = 0
  let averageDelay = 0

  sock.addEventListener("message", async (e) => {
    const releaseMessageMutex = await messageMutex.acquire()
    const data = JSON.parse(await e.data.text())
    const serverTime = data.timeSent
    const clientTime = Date.now()
    const thisDelay = clientTime - serverTime
    averageDelay = averageDelay / (bucketReceived + 1) * bucketReceived + thisDelay / (bucketReceived + 1)
    bucketReceived = Math.min(bucketReceived + 1, 100)
    processors.push(new DataProcessor(data.data, averageDelay + 500))
    processors = processors.filter(e => !e.end())
    // users.clear()
    // data.users.forEach((userName, i) => users.set(userName, i))
    users = data.users
    releaseMessageMutex()
  })

  sock.addEventListener("close", e => {
    console.log("close")
  })

  sock.addEventListener("error", e => {
    console.log("error")
  })

  const onFrame = () => {
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, 640, 360)
    const time = Date.now()
    const data = processors.map(e => e.get(time)).flat().forEach(d => {
      states.set(d.userName, d)
    })
    users.forEach((userName, userIndex) => {
      ctx.save()
      ctx.translate(16 + userIndex * 112, 16)
      ctx.drawImage(fieldTinyImage, 0, 0)
      const d = states.get(userName)
      if (d != null) {
        ctx.save()
        ctx.translate(8, 40)
        const blockColor = d.level % 10
        states.get(userName).field.forEach((blockId, i) => {
          const dx = ((i % 10) * 8)
          const dy = (Math.floor(i / 10) * 8)
          if (blockId != 0) {
            ctx.drawImage(blocksImage, (blockId - 1) * 8, blockColor * 8, 8, 8, dx, dy, 8, 8)
          }
        })
        ctx.restore()
        ctx.save()
        ctx.translate(64, 42)
        nextPieceRenderingData[d.next].forEach(e => {
          ctx.drawImage(blocks6Image, (e[2] - 1) * 6, blockColor * 6, 6, 6, e[0] * 6, e[1] * 6, 6, 6)
        })
        ctx.restore()
        drawText(ctx, d.userName, 8, 216)
        const rankString = (userIndex + 1).toString().padStart(2, "0")
        const scoreString = d.score.toString().padStart(6, "0")
        const levelString = d.level.toString().padStart(2, "0")
        const linesString = d.lines.toString().padStart(3, "0")
        drawText(ctx, `#${rankString}:${scoreString}`, 8, 8)
        drawText(ctx, `${scoreString}-${linesString}`, 8, 16)
      }
      ctx.restore()
    })

    requestAnimationFrame(onFrame)
  }

  requestAnimationFrame(onFrame)
}
