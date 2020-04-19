import { Mutex } from "await-semaphore"

export class BucketProcessor {
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

type UserState = any

export default class DataProcessor {
  bucketReceived = 0
  averageDelay = 0
  bucketProcessors: BucketProcessor[] = []
  messageMutex = new Mutex()
  playerStates = new Map<string, UserState>()
  playerInfo = new Map<string, { hearts: [number, number] }>()
  roomUsers = {}

  async onData(data) {
    const releaseMessageMutex = await this.messageMutex.acquire()
    const serverTime = data.timeSent
    const clientTime = Date.now()
    const thisDelay = clientTime - serverTime
    this.averageDelay = this.averageDelay / (this.bucketReceived + 1) * this.bucketReceived + thisDelay / (this.bucketReceived + 1)
    this.bucketReceived = Math.min(this.bucketReceived + 1, 100)
    this.bucketProcessors.push(new BucketProcessor(data.data, this.averageDelay + 500))
    this.bucketProcessors = this.bucketProcessors.filter(e => !e.end())
    this.playerInfo.clear()
    data.users.forEach(({name, hearts}) => this.playerInfo.set(name, { hearts }))
    this.roomUsers = {
      all: data.users.map(e => e.name),
      ...data.rooms
    }
    releaseMessageMutex()
  }

  onRender() {
    const time = Date.now()
    this.bucketProcessors.map(e => e.get(time)).flat().forEach(d => {
      if (d.field != null && !d.field.slice(0, 10).every(e => e == 1)) {
        this.playerStates.set(d.userName, d)
      }
    })
  }

  getRoomUsers(roomName) {
    return this.roomUsers[roomName] ?? []
  }

  getPlayerInfo(playerName) {
    return this.playerInfo.get(playerName)
  }

  getPlayerState(playerName) {
    return this.playerStates.get(playerName)
  }
}