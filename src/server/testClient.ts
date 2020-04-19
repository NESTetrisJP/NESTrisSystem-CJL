import net from "net"
import { encode, decode } from "../common/network-codec"

console.log("NESTrisSystem Test Client v0.8.0")
for (let i = 0; i < 8; i++) {
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
          field[i] = Math.floor(Math.random() * 4)
        }
        result.push({ time, field, score, level, lines, next, stats })
      }
    }
    end--

    return result
  }

  let startTime
  const client = net.createConnection({ port: 5041 }, () => {
    client.on("end", () => {
      console.error("end")
    })
    client.on("data", () => {})

    client.write(encode({ userName: `テストTest${i}`, key: "key", version: 1 }))

    startTime = Date.now()
    setInterval(() => {
      if (!client.destroyed) {
        client.write(encode({ timeSent: Date.now(), data: createDummyData() }))
      }
    }, 200)
  })
}
