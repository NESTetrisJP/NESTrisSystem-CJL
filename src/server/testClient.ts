import net from "net"
import { encode, decode } from "../common/network-codec"
import commandLineArgs from "command-line-args"

const options = commandLineArgs([
  { name: "port", type: Number },
  { name: "host", type: String },
  { name: "num", type: Number }
])
const port = options.port ?? 5041
const host = options.host ?? "localhost"
const num = options.num ?? 8

console.log("NESTrisSystem Test Client v1.0.1")
for (let i = 0; i < num; i++) {
  let score = 0
  let end = 0
  const createDummyData = () => {
    const result = []
    const currentTime = Date.now()
    if (score >= 500000 && Math.random() < 0.3) {
      end = 10
    } else {
      score += Math.floor(Math.random() * 20000)
    }
    const level = Math.floor(Math.random() * 30)
    const lines = Math.floor(Math.random() * 300)
    const next = ["I", "J", "L", "O", "S", "T", "Z"][Math.floor(Math.random() * 7)]
    const stats = []
    for (let i = 0; i < 10; i++) {
      const time = currentTime - 20 * (9 - i)
      if (end >= 5) {
        const field = new Array(200)
        for (let i = 0; i < 200; i++) {
          field[i] = 1
        }
        result.push({ time, field, score, level, lines, next, stats })
      } else if (end > 0) {
        score = 0
        result.push({ time })
      } else {
        const field = new Array(200)
        for (let i = 0; i < 200; i++) {
          if (i < 20) field[i] = 0
          else field[i] = Math.floor(Math.random() * 4)
        }
        result.push({ time, field, score, level, lines, next, stats })
      }
    }
    end--

    return result
  }

  let startTime
  const client = net.createConnection(port, host, () => {
    client.on("end", () => {
      console.error("end")
    })
    client.on("data", () => {})

    client.write(encode({ userName: `テストTest${i}`, key: "key", version: 2 }))

    startTime = Date.now()
    setInterval(() => {
      if (!client.destroyed) {
        client.write(encode({ timeSent: Date.now(), data: createDummyData() }))
      }
    }, 200)
  })
}
