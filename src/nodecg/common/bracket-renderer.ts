import groupBackground from "./images/group-background.png"
import bracketBackground from "./images/bracket-background.png"
import Renderer from "../../common/renderer"
import GameRenderer from "../../common/game-renderer"
import DataProcessor from "../../common/data-processor"
const r = Renderer.getInstance()

export default class BracketRenderer {
  static rankColors = [
    "rgb(53, 202, 53)",
    "rgb(250, 245, 0)",
    "rgb(255, 40, 0)"
  ]
  bracketDataReplicant: Replicant
  data = null
  /*
  {
    "group-a": {
      players: ["ABCDEFG", "1", "2"],
      games: [
        [1000000, 0, 0],
        [1000000, 0, 0],
        [0, 0, 0],
        [1000000, 1000000, 0],
        [1000000, 5000, 0],
        [1000000, null, 0],
        [1000000, null, null]
      ],
      hearts: [3, 0, 0]
    },
    "group-b": {
      players: ["3", "AA", "う！"],
      games: [
        [1000000, 0, 0],
        [1000000, 0, 0],
        [1000000, 0, 0],
        [1000000, 0, 100000],
        [1000000, 0, 0],
        [1000000, 0, 0],
        [1000000, 0, null]
      ],
      hearts: [3, 0, 0]
    },
    "bracket": {
      players: ["aaaa", "bbbbbb", "ccccccc", "ddddddd", "eeeee", "ffffff", "ggggg"],
      scores: [0, 0, 0, 0, null, null],
      wins: [-1, -1]
    }
  }
  */
  backgrounds = {
    "group-a": null,
    "group-b": null,
    "bracket": null
  }

  constructor() {
    this.bracketDataReplicant = nodecg.Replicant("bracketData")
    this.bracketDataReplicant.on("change", (value, _) => {
      try {
        const parsed = JSON.parse(value)
        this.data = parsed
      } catch {}
    })
  }

  async initialize() {
    const result = await Promise.all([
      Renderer.loadImage(groupBackground),
      Renderer.loadImage(bracketBackground),
    ])
    this.backgrounds["group-a"] = result[0]
    this.backgrounds["group-b"] = result[0]
    this.backgrounds["bracket"] = result[1]
  }

  render(ctx: CanvasRenderingContext2D, type: string) {
    if (ctx == null) return
    if (this.data == null) return
    ctx.drawImage(this.backgrounds[type], 0, 0)
    const data = this.data[type]
    if (type == "group-a" || type == "group-b") {
      ;[0, 1, 2].forEach(i => {
        r.drawTextCentered(ctx, data.players[i], 44 + i * 72, 16)
      })
      data.games.forEach((scores, i) => {
        const scoreData = []
        scores.forEach((score, j) => {
          if (score != null) scoreData.push([String(j), score])
        })
        const ranking = DataProcessor.getRanking(scoreData)
        scores.forEach((score, j) => {
          if (score != null) {
            r.drawTextCentered(ctx, String(score), 44 + j * 72, 40 + 16 * i)
            ctx.globalCompositeOperation = "multiply"
            ctx.fillStyle = BracketRenderer.rankColors[ranking.userToRankIndex.get(String(j))]
            ctx.fillRect(16 + j * 72, 40 + 16 * i, 56, 8)
            ctx.globalCompositeOperation = "source-over"
          }
        })
      })
      data.hearts.forEach((hearts, i) => {
        ctx.save()
        ctx.translate(16 + i * 72, 160)
        GameRenderer.renderHearts(ctx, [hearts, 7], 0, false)
        ctx.restore()
      })
    } else if (type == "bracket") {
      if (data.players[0] != null) r.drawText(ctx, data.players[0], 8, 8)
      if (data.players[1] != null) r.drawText(ctx, data.players[1], 8, 56)
      if (data.players[2] != null) r.drawTextRTL(ctx, data.players[2], 264, 88)
      if (data.players[3] != null) r.drawTextRTL(ctx, data.players[3], 264, 136)
      if (data.players[4] != null) r.drawTextCentered(ctx, data.players[4], 136, 40)
      if (data.players[5] != null) r.drawTextCentered(ctx, data.players[5], 136, 104)
      if (data.players[6] != null) r.drawTextCentered(ctx, data.players[6], 136, 72)

      if (data.scores[0] != null) r.drawText(ctx, String(data.scores[0]), 80, 8)
      if (data.scores[1] != null) r.drawText(ctx, String(data.scores[1]), 80, 56)
      if (data.scores[2] != null) r.drawText(ctx, String(data.scores[2]), 184, 88)
      if (data.scores[3] != null) r.drawText(ctx, String(data.scores[3]), 184, 136)
      if (data.scores[4] != null) r.drawText(ctx, String(data.scores[4]), 176, 32)
      if (data.scores[5] != null) r.drawText(ctx, String(data.scores[5]), 88, 112)

      ctx.strokeStyle = "#9CFCF0"
      if (data.wins[0] == 0) {
        ctx.beginPath()
        ctx.moveTo(8.5, 19.5)
        ctx.lineTo(83.5, 19.5)
        ctx.lineTo(83.5, 35.5)
        ctx.lineTo(170.5, 35.5)
        ctx.stroke()
      } else if (data.wins[0] == 1) {
        ctx.beginPath()
        ctx.moveTo(8.5, 51.5)
        ctx.lineTo(83.5, 51.5)
        ctx.lineTo(83.5, 35.5)
        ctx.lineTo(170.5, 35.5)
        ctx.stroke()
      }
      if (data.wins[1] == 0) {
        ctx.beginPath()
        ctx.moveTo(263.5, 99.5)
        ctx.lineTo(187.5, 99.5)
        ctx.lineTo(187.5, 115.5)
        ctx.lineTo(100.5, 115.5)
        ctx.stroke()
      } else if (data.wins[1] == 1) {
        ctx.beginPath()
        ctx.moveTo(263.5, 131.5)
        ctx.lineTo(187.5, 131.5)
        ctx.lineTo(187.5, 115.5)
        ctx.lineTo(100.5, 115.5)
        ctx.stroke()
      }
    }
  }
}