import { Mutex } from "await-semaphore"

export class BucketProcessor {
  data: ExtendedPlayerFrame[]
  timeOffset: number
  index: number
  constructor(data: ExtendedPlayerFrame[], timeOffset: number) {
    this.data = data
    this.timeOffset = timeOffset
    this.index = 0
  }

  get(time: number): ExtendedPlayerFrame[] {
    let result: ExtendedPlayerFrame[] = []
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

type PlayerState = {
  field: number[]
  score: number
  level: number
  lines: number
  next: Piece
  quadTimer: number
  // 0: playing, 1: just gameover (for playing sound just once), 2: gameover
  gameover: number
  bestScore: number
}

export type RankingData = {
  ranking: [string, number][]
  userToRankIndex: Map<string, number>
}

export default class DataProcessor {
  bucketReceived = 0
  averageDelay = 0
  bucketProcessors = <BucketProcessor[]>[]
  bucketProcessorsAhead = <BucketProcessor[]>[]
  messageMutex = new Mutex()
  playerStates = new Map<string, PlayerState>()
  linesAhead = new Map<string, number>()
  playerInfo = new Map<string, { hearts: [number, number] }>()
  roomUsers = {} as RoomsData
  qualifyTime: number = null

  async onData(data: ServerPacket) {
    const releaseMessageMutex = await this.messageMutex.acquire()
    const serverTime = data.timeSent
    const clientTime = Date.now()
    const thisDelay = clientTime - serverTime
    this.averageDelay = this.averageDelay / (this.bucketReceived + 1) * this.bucketReceived + thisDelay / (this.bucketReceived + 1)
    this.bucketReceived = Math.min(this.bucketReceived + 1, 100)
    this.bucketProcessors.push(new BucketProcessor(data.data, this.averageDelay + 400 + 300))
    this.bucketProcessorsAhead.push(new BucketProcessor(data.data, this.averageDelay + 400))
    this.bucketProcessors = this.bucketProcessors.filter(e => !e.end())
    this.bucketProcessorsAhead = this.bucketProcessorsAhead.filter(e => !e.end())
    this.playerInfo.clear()
    data.users.forEach(({name, hearts}) => this.playerInfo.set(name, { hearts }))
    this.roomUsers = {
      ...data.rooms
    }
    this.qualifyTime = data.qualifyTime
    releaseMessageMutex()
  }

  static isGameOverField(field: number[]) {
    return field.slice(0, 10).every(e => e == 1)
  }

  onRender() {
    this.playerStates.forEach((data, userName) => {
      if (data.quadTimer > 0) data.quadTimer++
      if (data.quadTimer == 19) data.quadTimer = 0
      if (data.gameover == 1) data.gameover = 2
    })

    const time = Date.now()
    this.bucketProcessorsAhead.map(e => e.get(time)).flat().forEach(d => {
      if (d.field != null) {
        const oldLines = this.linesAhead.get(d.userName) ?? 0
        const newLines = d.lines
        if (newLines - oldLines == 4) {
          const state = this.playerStates.get(d.userName)
          if (state != null) {
            state.quadTimer = 1
          }
        }
        this.linesAhead.set(d.userName, newLines)
      }
    })
    this.bucketProcessors.map(e => e.get(time)).flat().forEach(d => {
      if (!this.playerStates.has(d.userName)) this.playerStates.set(d.userName, {
        field: [],
        score: 0,
        level: 0,
        lines: 0,
        next: null,
        bestScore: 0,
        quadTimer: 0,
        gameover: 0
      })
      const data = this.playerStates.get(d.userName)
      if (d.field != null) {
        if (!DataProcessor.isGameOverField(d.field)) {
          data.field = d.field
          data.score = d.score
          data.level = d.level
          data.lines = d.lines
          data.next = d.next
          data.gameover = 0
        } else {
          if (data.gameover == 0) data.gameover = 1
        }
      } else {
      }
      data.bestScore = d.bestScore
    })
  }

  getRoomUsers(roomName: RoomName) {
    return this.roomUsers[roomName] ?? []
  }

  getPlayerInfo(playerName: string) {
    return this.playerInfo.get(playerName)
  }

  getPlayerState(playerName: string) {
    return this.playerStates.get(playerName)
  }

  getRankingOfRoom(roomName: RoomName, topScore: boolean) {
    const data: [string, number][] = []
    this.getRoomUsers(roomName).forEach(userName => {
      const d = this.getPlayerState(userName)
      if (d != null) {
        data.push([userName, topScore ? d.bestScore : d.score])
      }
    })
    return DataProcessor.getRanking(data)
  }

  static getRanking(data: [string, number][]): RankingData {
    const ranking = [...data]
    const userToRankIndex = new Map<string, number>()
    ranking.sort((a, b) => b[1] - a[1])
    ranking.forEach(([name, _], i) => {
      if (i >= 1 && ranking[i][1] == ranking[i-1][1]) { userToRankIndex.set(name, userToRankIndex.get(ranking[i-1][0])) }
      else userToRankIndex.set(name, i)
    })
    return { ranking, userToRankIndex }
  }
}