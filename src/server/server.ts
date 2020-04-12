import net from "net"
import ws from "ws"
// import { TokenGenerator } from "ts-token-generator"
import { Mutex } from "await-semaphore"

import SimpleNodeLogger from "simple-node-logger"
const logger = SimpleNodeLogger.createSimpleLogger("server.log")

logger.info("NESTrisSystem Server v0.1.0")
// const tokenGenerator = new TokenGenerator()

const loginList = new Map<string, string>()
const activeUsers = new Map<string, { socket: net.Socket }>()
const activeUsersMutex = new Mutex()

let queue = []
const queueMutex = new Mutex()

const merge = (a, b) => {
  let i = 0
  let j = 0
  const result = []
  while (i < a.length || j < b.length) {
    if (i == a.length) {
      result.push(b[j])
      j++
    } else if (j == b.length) {
      result.push(a[i])
      i++
    } else if (a[i].time >= b[j].time) {
      result.push(b[j])
      j++
    } else if (a[i].time <= b[j].time) {
      result.push(a[i])
      i++
    }
  }
  return result
}

net.createServer(socket => {
  let loginSuccess = false
  let userName = null
  let bucketReceived = 0
  let averageDelay = 0
  const onDataMutex = new Mutex()
  const onData = async (data) => {
    const releaseOnDataMutex = await onDataMutex.acquire()
    if (data.userName != null && data.key != null) {
      // login
      // if (loginList.get(data.userName) == data.key) {
      if (true) {
        userName = data.userName
        loginSuccess = true
        logger.info(`${userName} logged in (${socket.remoteAddress})`)
        const releaseActiveUsersMutex = await activeUsersMutex.acquire()
        activeUsers.set(data.userName, { socket })
        releaseActiveUsersMutex()
      } else {
        socket.end(encode({ reason: "Invalid login info" }))
      }
    } else if (loginSuccess) {
      if (Array.isArray(data.data)) {
        const releaseQueueMutex = await queueMutex.acquire()
        const clientTime = data.timeSent
        const serverTime = Date.now()
        const thisDelay = serverTime - clientTime
        averageDelay = averageDelay / (bucketReceived + 1) * bucketReceived + thisDelay / (bucketReceived + 1)
        bucketReceived = Math.min(bucketReceived + 1, 100)
        const newData = data.data.map(e => ({ ...e, userName, time: e.time + averageDelay }))
        queue = merge(queue, newData)
        // console.log(queue)
        releaseQueueMutex()
      } else {
        logger.error(`Received invalid data from ${userName} (${socket.remoteAddress}): ` + JSON.stringify(data))
        socket.end(encode({ reason: "Invalid data." }))
      }
    } else {
      logger.error(`Received data from user not logged in (${socket.remoteAddress}): ` + JSON.stringify(data))
      socket.end(encode({ reason: "You must login first." }))
    }
    releaseOnDataMutex()
  }

  logger.info(`Connection established with ${socket.remoteAddress}`)
  socket.on("data", data => {
    try {
      onData(decode(data))
    } catch {
      logger.error(`Received invalid data from ${userName} (${socket.remoteAddress}): ` + data)
      socket.end(encode({ reason: "Invalid data." }))
    }
  })
  socket.setTimeout(10000)
  socket.on("timeout", () => {
    logger.error(`Socket to ${userName} (${socket.remoteAddress}) timeout`)
    socket.end(encode({ reason: "Socket timeout." }))
  })
  socket.on("error", async err => {
    logger.error(`Socket to ${userName} (${socket.remoteAddress}) emit an error: ` + err)
    const releaseActiveUsersMutex = await activeUsersMutex.acquire()
    activeUsers.delete(userName)
    releaseActiveUsersMutex()
  })
  socket.on("close", async hadError => {
    logger.error(`Socket to ${userName} (${socket.remoteAddress}) closed`)
    const releaseActiveUsersMutex = await activeUsersMutex.acquire()
    activeUsers.delete(userName)
    releaseActiveUsersMutex()
  })
}).listen(5041)

const wss = new ws.Server({ port: 5042 })

wss.on("connection", (ws, req) => {
  logger.info(`WebSocket to ${req.connection.remoteAddress} connected`)
})

setInterval(async () => {
  const releaseQueueMutex = await queueMutex.acquire()

  const buffer = encode({
    timeSent: Date.now(),
    users: Array.from(activeUsers.keys()),
    data: queue
  })
  wss.clients.forEach(client => {
    if (client.readyState == ws.OPEN) {
      client.send(buffer)
    }
  })
  queue = []
  releaseQueueMutex()
}, 200)

const encode = (obj: object) => Buffer.from(JSON.stringify(obj))
const decode = (buffer: Buffer) => JSON.parse(buffer.toString())