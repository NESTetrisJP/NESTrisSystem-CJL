import net from "net"

console.log("NESTrisSystem Test Client v0.1.0")
let startTime
const client = net.createConnection({ port: 5041 }, () => {
  client.write(encode({ userName: `テストTest${Date.now() % 1000}`, key: "key" }))

  startTime = Date.now()
  setInterval(() => {
    client.write(encode({ timeSent: Date.now(), data: createDummyData() }))
  }, 200)
})

const createDummyData = () => {
  const result = []
  const currentTime = Date.now()
  const score = Math.floor(Math.random() * 1000000)
  const level = Math.floor(Math.random() * 30)
  const lines = Math.floor(Math.random() * 300)
  const next = ["I", "J", "L", "O", "S", "T", "Z"][Math.floor(Math.random() * 7)]
  const stats = []
  for (let i = 0; i < 10; i++) {
    const time = currentTime - 20 * (9 - i)
    const field = new Array(200)
    for (let i = 0; i < 200; i++) {
      field[i] = Math.floor(Math.random() * 4)
    }
    result.push({ time, field, score, level, lines, next, stats })
  }

  return result
}

const encode = (obj: object) => Buffer.from(JSON.stringify(obj))
const decode = (buffer: Buffer) => JSON.parse(buffer.toString())