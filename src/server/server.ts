import net from "net"
import ws from "ws"
import fs from "fs"
import readline from "readline"
import commandLineArgs from "command-line-args"
import { Mutex } from "await-semaphore"
import { encode, decodeStr } from "../common/network-codec"
import SimpleNodeLogger from "simple-node-logger"

const logger = SimpleNodeLogger.createSimpleLogger("server.log")

const options = commandLineArgs([
  { name: "debug", type: Boolean }
])
const debug = options.debug ?? false

logger.info("NESTrisSystem Server v0.8.1")
if (debug) logger.info("Launching in debug mode.")

const loginList = new Map<string, string>()
const loginListFile = JSON.parse(fs.readFileSync("loginlist.json", "utf8"))
loginListFile.forEach(e => {
  loginList.set(e.userName, e.key)
})

const activeUsers = new Map<string, { socket: net.Socket }>()
const activeUsersMutex = new Mutex()
const bestScores = new Map<string, number>()
const hearts = new Map<string, [number, number]>()
const heartsMutex = new Mutex()

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
  const rl = readline.createInterface(socket)
  const onData = async (data) => {
    const releaseOnDataMutex = await onDataMutex.acquire()
    if (data.userName != null && data.key != null) {
      if (debug || loginList.get(data.userName) == data.key) {
        userName = data.userName
        if (data.version == 1) {
          loginSuccess = true
          logger.info(`${userName} logged in (${socket.remoteAddress})`)
          const releaseActiveUsersMutex = await activeUsersMutex.acquire()
          activeUsers.set(data.userName, { socket })
          releaseActiveUsersMutex()
          const releaseHeartsMutex = await heartsMutex.acquire()
          hearts.set(data.userName, [0, 0])
          releaseHeartsMutex()
        } else {
          logger.info(`${userName} (${socket.remoteAddress}) is using older client`)
          socket.end(encode({ reason: "You are using older client" }))
        }
      } else {
        logger.info(`${data.userName} (${socket.remoteAddress}) tried to login, but key did not matched`)
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
        let bestScore = bestScores.get(userName) ?? 0
        const newData = data.data.map(e => {
          if (e.score != null) bestScore = Math.max(bestScore, e.score)
          return { ...e, userName, time: e.time + averageDelay, bestScore }
        })
        bestScores.set(userName, bestScore)
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

  // socket.on("data", data => {
  rl.on("line", data => {
    try {
      onData(decodeStr(data))
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
  ws.on("error", () => {

  })
  ws.on("close", () => {

  })
})

const activeAdmins: Set<net.Socket> = new Set()
const activeAdminsMutex = new Mutex()

net.createServer(async socket => {
  logger.info(`Admin socket (${socket.remoteAddress}) connected`)
  const releaseActiveAdminsMutex = await activeAdminsMutex.acquire()
  activeAdmins.add(socket)
  releaseActiveAdminsMutex()

  const rl = readline.createInterface(socket)
  const onData = async (data) => {
    if (false) {
      const releaseHeartsMutex = await heartsMutex.acquire()
      hearts.set(data.userName, [0, 3])
      releaseHeartsMutex()
    }
  }

  // socket.on("data", (data) => {
  rl.on("line", data => {
    try {
      onData(decodeStr(data))
    } catch {
      logger.error(`Received invalid data from admin socket (${socket.remoteAddress}): ` + data)
      socket.end(encode({ reason: "Invalid data." }))
    }
  })

  socket.setTimeout(10000)
  socket.on("timeout", () => {
    logger.error(`Admin socket (${socket.remoteAddress}) timeout`)
    socket.end(encode({ reason: "Socket timeout." }))
  })
  socket.on("error", async err => {
    logger.error(`Admin socket (${socket.remoteAddress}) emit an error: ` + err)
    const releaseActiveAdminsMutex = await activeAdminsMutex.acquire()
    activeAdmins.delete(socket)
    releaseActiveAdminsMutex()
  })
  socket.on("close", async hadError => {
    logger.error(`Admin socket (${socket.remoteAddress}) closed`)
    const releaseActiveAdminsMutex = await activeAdminsMutex.acquire()
    activeAdmins.delete(socket)
    releaseActiveAdminsMutex()
  })
}).listen(5043, "localhost")

setInterval(async () => {
  const releaseQueueMutex = await queueMutex.acquire()

  const buffer = encode({
    timeSent: Date.now(),
    users: Array.from(activeUsers.keys()).map(name => ({ name, hearts: hearts.get(name) })),
    rooms: {
      "qualifier": Array.from(activeUsers.keys()),
      "1v1a": Array.from(activeUsers.keys()).slice(0, 2),
      "1v1b": Array.from(activeUsers.keys()).slice(2, 4)
    },
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