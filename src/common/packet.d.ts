declare global {
  interface PlayerFrame {
    time: number
    field: number[]
    score: number
    level: number
    lines: number
    next: string
  }

  interface ExtendedPlayerFrame extends PlayerFrame {
    userName: string
    bestScore: number
  }

  type PlayerPacketLogin = {
    userName: string
    key: string
    version: number
  }
  type PlayerPacketData = {
    data: PlayerFrame[]
    timeSent: number
  }

  type PlayerPacket = PlayerPacketLogin | PlayerPacketData

  type CommandPacketSetHearts = {
    command: "setHearts"
    userName: string
    currentHearts: number
    maxHearts: number
  }

  type CommandPacketSetBestScore = {
    command: "setBestScore"
    userName: string
    bestScore: number
  }

  type CommandPacketResetBestScores = {
    command: "resetBestScores"
  }

  type CommandPacketMoveToRoom = {
    command: "moveToRoom"
    userName: string
    room: RoomName
  }

  type CommandPacketStartQualifier = {
    command: "startQualifier"
  }

  type CommandPacketEndQualifier = {
    command: "endQualifier"
  }

  type CommandPacket
    = CommandPacketSetHearts
    | CommandPacketSetBestScore
    | CommandPacketResetBestScores
    | CommandPacketMoveToRoom
    | CommandPacketStartQualifier
    | CommandPacketEndQualifier

  type UserData = {
    name: string
    hearts: [number, number]
  }

  type RoomName = "default" | "qualifier" | "1v1a" | "1v1b" | "1v1v1"
  type RoomsData = {[key in RoomName]: string[]}

  type ServerPacket = {
    timeSent: number
    qualifyTime: number
    users: UserData[]
    rooms: RoomsData
    data: ExtendedPlayerFrame[]
  }
}

export {}