import net from "net"
import https from "https"
import ws from "ws"
import fs from "fs"
import readline from "readline"
import commandLineArgs from "command-line-args"
import { Mutex } from "await-semaphore"
import encode from "../common-node/packet-encoder"
import SimpleNodeLogger from "simple-node-logger"

const logger = SimpleNodeLogger.createSimpleLogger("server.log")

const options = commandLineArgs([
  { name: "debug", type: Boolean },
  { name: "ssl", type: Boolean }
])
const debug = options.debug ?? false
const ssl = options.ssl ?? false

logger.info("NESTrisSystem Server v1.0.1")
if (debug) logger.info("Launching in debug mode.")
if (ssl) logger.info("Launching in SSL mode.")

const loginList = new Map<string, string>()
const loginListFile = JSON.parse(fs.readFileSync("loginlist.json", "utf8"))
loginListFile.forEach(e => loginList.set(e.userName, e.key))

const activeUsers = new Map<string, { socket: net.Socket }>()
const activeUsersMutex = new Mutex()
const bestScores = new Map<string, number>()
const bestScoresMutex = new Mutex()
const hearts = new Map<string, [number, number]>()
const heartsMutex = new Mutex()

const rooms: RoomName[] = ["default", "qualifier", "1v1a", "1v1b", "1v1v1"]
const userRooms = new Map<string, string>()
const userRoomsMutex = new Mutex()

let queue: ExtendedPlayerFrame[] = []
const queueMutex = new Mutex()

let qualifyStartTime = null as number

const merge = (a: ExtendedPlayerFrame[], b: ExtendedPlayerFrame[]) => {
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
  let userName = null as string
  let bucketReceived = 0
  let averageDelay = 0
  const onDataMutex = new Mutex()
  const rl = readline.createInterface(socket)
  const onData = async (data: PlayerPacket) => {
    const releaseOnDataMutex = await onDataMutex.acquire()
    if ("userName" in data && "key" in data) {
      if (debug || loginList.get(data.userName) == data.key) {
        userName = data.userName
        if (data.version == 2) {
          loginSuccess = true
          logger.info(`${userName} logged in (${socket.remoteAddress})`)
          const releaseActiveUsersMutex = await activeUsersMutex.acquire()
          activeUsers.set(data.userName, { socket })
          releaseActiveUsersMutex()
          const releaseUserRoomsMutex = await userRoomsMutex.acquire()
          if (!userRooms.has(data.userName)) userRooms.set(data.userName, "default")
          releaseUserRoomsMutex()
          const releaseHeartsMutex = await heartsMutex.acquire()
          if (!hearts.has(data.userName)) hearts.set(data.userName, [0, 0])
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
      if ("data" in data) {
        const releaseQueueMutex = await queueMutex.acquire()
        const clientTime = data.timeSent
        const serverTime = Date.now()
        const thisDelay = serverTime - clientTime
        averageDelay = averageDelay / (bucketReceived + 1) * bucketReceived + thisDelay / (bucketReceived + 1)
        bucketReceived = Math.min(bucketReceived + 1, 100)
        let bestScore = bestScores.get(userName) ?? 0
        const newData: ExtendedPlayerFrame[] = data.data.map(e => {
          if (e.score != null) bestScore = Math.max(bestScore, e.score)
          return { ...e, userName, time: e.time + averageDelay, bestScore }
        })
        const releaseBestScoresMutex = await bestScoresMutex.acquire()
        bestScores.set(userName, bestScore)
        releaseBestScoresMutex()
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
      onData(JSON.parse(data))
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

let wss: ws.Server

if (ssl) {
  const httpsServer = https.createServer({
    key: fs.readFileSync(process.env["SSL_KEY"]),
    cert: fs.readFileSync(process.env["SSL_CERT"])
  }, (req, res) => {
    res.writeHead(200)
    res.end()
  }).listen(5042)

  wss = new ws.Server({ server: httpsServer })
} else {
  wss = new ws.Server({ port: 5042 })
}

wss.on("connection", (ws, req) => {
  logger.info(`WebSocket to ${req.connection.remoteAddress} connected`)
  ws.on("error", (err) => {
    logger.info(`WebSocket to ${req.connection.remoteAddress} emit an error: ` + err)
  })
  ws.on("close", () => {
    logger.info(`WebSocket to ${req.connection.remoteAddress} closed`)
  })
})

const activeAdmins: Set<net.Socket> = new Set()
const activeAdminsMutex = new Mutex()

net.createServer(async socket => {
  logger.info(`Admin socket (${socket.remoteAddress}) connected`)
  const releaseActiveAdminsMutex = await activeAdminsMutex.acquire()
  activeAdmins.add(socket)
  releaseActiveAdminsMutex()

  const commandResponse = (message: string) => socket.write(encode({ type: "commandResponse", message }))
  const rl = readline.createInterface(socket)
  const onData = async (data: CommandPacket) => {
    switch (data.command) {
      case "setHearts": {
        const releaseHeartsMutex = await heartsMutex.acquire()
        hearts.set(data.userName, [data.currentHearts, data.maxHearts])
        releaseHeartsMutex()
        commandResponse("setHearts done.")
      }
      break
      case "setBestScore": {
        const releaseBestScoresMutex = await bestScoresMutex.acquire()
        bestScores.set(data.userName, data.bestScore)
        commandResponse("setBestScore done.")
        releaseBestScoresMutex()
      }
      break
      case "resetBestScores": {
        const releaseBestScoresMutex = await bestScoresMutex.acquire()
        bestScores.clear()
        commandResponse("resetBestScores done.")
        releaseBestScoresMutex()
      }
      break
      case "moveToRoom": {
        if (rooms.indexOf(data.room) >= 0) {
          const releaseUserRoomsMutex = await userRoomsMutex.acquire()
          userRooms.set(data.userName, data.room)
          releaseUserRoomsMutex()
          commandResponse("moveToRoom done.")
        } else {
          commandResponse("moveToRoom: skipping unknown room name.")
        }
      }
      break
      case "startQualifier": {
        qualifyStartTime = Date.now()
        commandResponse("startQualifier done.")
      }
      break
      case "endQualifier": {
        qualifyStartTime = null
        commandResponse("endQualifier done.")
      }
      break
    }
  }

  // socket.on("data", (data) => {
  rl.on("line", data => {
    try {
      onData(JSON.parse(data))
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
  const userNames = Array.from(activeUsers.keys())
  const roomsData = {} as RoomsData
  rooms.forEach(e => roomsData[e] = [])
  userNames.forEach(name => roomsData[userRooms.get(name) as RoomName].push(name))
  const qualifyTime = qualifyStartTime != null ? Date.now() - qualifyStartTime : null

  const buffer = JSON.stringify({
    timeSent: Date.now(),
    qualifyTime,
    users: userNames.map(name => ({ name, hearts: hearts.get(name) })),
    rooms: roomsData,
    data: queue
  } as ServerPacket)
  wss.clients.forEach(client => {
    if (client.readyState == ws.OPEN) {
      client.send(buffer)
    }
  })
  queue = []
  releaseQueueMutex()
}, 200)