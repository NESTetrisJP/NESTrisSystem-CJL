import { GroupRenderingData, BracketRenderingData } from "./bracket-rendering-data"
import groupBackground from "./images/group-background.png"
import bracketBackground from "./images/bracket-background.png"
import Renderer from "../../common/renderer"
import GameRenderer from "../../common/game-renderer"
const r = Renderer.getInstance()

export default class BracketRenderer {
  renderingData = {
    "group-a": GroupRenderingData,
    "group-b": GroupRenderingData,
    "bracket": BracketRenderingData,
  }
  data = {
    "group-a": {
      players: ["ABCDEFG", "1", "2"],
      games: [
        [1000000, 0, 0],
        [1000000, 0, 0],
        [1000000, 0, 0],
        [1000000, 0, 0],
        [1000000, 0, 0],
        [1000000, 0, 0],
        [1000000, 0, null]
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
      scores: [0, 0, 0, 0, 0, 0]
    }
  }
  backgrounds = {
    "group-a": null,
    "group-b": null,
    "bracket": null
  }

  constructor() {
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
        scores.forEach((score, j) => {
          if (score != null) {
            r.drawTextCentered(ctx, String(score), 44 + j * 72, 40 + 16 * i)
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
      r.drawText(ctx, data.players[0], 8, 8)
      r.drawText(ctx, data.players[1], 8, 56)
      r.drawTextRTL(ctx, data.players[2], 264, 88)
      r.drawTextRTL(ctx, data.players[3], 264, 136)
      r.drawTextCentered(ctx, data.players[4], 136, 40)
      r.drawTextCentered(ctx, data.players[5], 136, 104)
      r.drawTextCentered(ctx, data.players[6], 136, 72)

      r.drawText(ctx, String(data.scores[0]), 80, 8)
      r.drawText(ctx, String(data.scores[1]), 80, 56)
      r.drawText(ctx, String(data.scores[2]), 184, 88)
      r.drawText(ctx, String(data.scores[3]), 184, 136)
      r.drawText(ctx, String(data.scores[4]), 176, 32)
      r.drawText(ctx, String(data.scores[5]), 88, 112)
    }
    return
    this.renderingData[type].forEach(data => {
      const applied = { ...data }
      if (data.params != null) {
        // data.params.forEach(([paramName, applyTo]) => applied[applyTo] = )
      }
      if (applied.visible ?? true) {
        switch (data.type) {
          case "image": {
            // ctx.drawImage()
          }
          break
          case "line": {
            ctx.strokeStyle = data.color
            ctx.moveTo(data.x1 + 0.5, data.y1 + 0.5)
            ctx.lineTo(data.x2 + 0.5, data.y2 + 0.5)
            ctx.stroke()
          }
          break
          case "text": {
            data.text = "debug00"
            if (data.align == "left") r.drawText(ctx, data.text, data.x, data.y)
            if (data.align == "center") r.drawTextCentered(ctx, data.text, data.x, data.y)
            if (data.align == "right") r.drawTextRTL(ctx, data.text, data.x, data.y)
          }
          break
        }
      }
    })
  }
}