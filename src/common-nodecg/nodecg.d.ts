declare global {
  type BracketData = {
    "group-a": {
      players: [string, string, string]
      games: [number, number, number][]
      hearts: [number, number, number]
    }
    "group-b": {
      players: [string, string, string]
      games: [number, number, number][]
      hearts: [number, number, number]
    }
    "bracket": {
      // [top left, bottom left, top right, bottom right, top center, bottom center, grand winner]
      players: [string, string, string, string, string, string, string]
      // [top left, bottom left, top right, bottom right, top center, bottom center]
      scores: [number, number, number, number, number?, number?]
      // [left, right]. -1: empty, 0: top wins, 1: bottom wins
      wins: [-1 | 0 | 1, -1 | 0 | 1]
    }
  }

  type ReplicantMap = {
    "bracketData": BracketData

  }

  type MessageMap = {

  }
}

export {}