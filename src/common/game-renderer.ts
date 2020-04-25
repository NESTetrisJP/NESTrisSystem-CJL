import Renderer from "./renderer"
import AudioManager from "./audio-manager"
import DataProcessor from "./data-processor"
import { CanvasReference } from "./canvas-references"
const r = Renderer.getInstance()
const a = AudioManager.getInstance()

export default class GameRenderer {
  static formatScore(score, hex) {
    const hexStrings = ["A", "B", "C", "D", "E", "F"]
    if (hex) {
      const topDigit = Math.floor(score / 100000)
      const topChar = topDigit >= 10 ? hexStrings[topDigit - 10] : String(topDigit)
      const lowerDigits = score % 100000
      return topChar + String(lowerDigits).padStart(5, "0")
    }
    return String(score).padStart(6, "0")
  }

  static renderIcon(ctx, userName) {
    const icon = r.requestUserIcon(userName)
    if (icon != null) {
      ctx.drawImage(icon, 0, 16, 79, 79)
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
      ctx.fillRect(0, 16, 79, 79)
    }
  }

  static renderFieldBackground(ctx, quadTimers) {
    if (quadTimers % 4 >= 2) {
      ctx.fillStyle = "#FFF"
      ctx.fillRect(0, 0, 80, 160)
    }
  }

  static renderField(ctx, field, blockColor) {
    field.forEach((blockId, i) => {
      const dx = ((i % 10) * 8)
      const dy = (Math.floor(i / 10) * 8)
      if (blockId != 0) {
        ctx.drawImage(r.blocks, (blockId - 1) * 8, blockColor * 8, 8, 8, dx, dy, 8, 8)
      }
    })
  }

  static renderNext(ctx, next, blockColor, size) {
    if (next == null) return
    if (size != 6 && size != 8) return
    const sourceImage = size == 6 ? r.blocks6 : r.blocks
    Renderer.nextPieceRenderingData[next].forEach(e => {
      ctx.drawImage(sourceImage, (e[2] - 1) * size, blockColor * size, size, size, e[0] * size, e[1] * size, size, size)
    })
  }

  static renderHearts(ctx, [active, max], text, rtl) {
    if (text == -1) {
      GameRenderer.renderHearts(ctx, [active, max], max >= 4 ? 1 : 0, rtl)
    } else if (text == 1) {
      ctx.drawImage(r.heart, 8, 0, 8, 8, 0, 0, 8, 8)
      r.drawText(ctx, `${active}/${max}`, rtl ? -24 : 8, 0)
    } else {
      for (let i = 0; i < max; i++) {
        const act = i < active
        ctx.drawImage(r.heart, act ? 8 : 0, 0, 8, 8, i * 8 * (rtl ? -1 : 1), 0, 8, 8)
      }
    }
  }

  static renderPlayerAudio(quadTimer, gameover) {
    if (quadTimer == 1) a.quad.play()
    if (gameover == 1) a.gameover.play()
  }

  static renderRoom(references: CanvasReference[][], dataProcessor: DataProcessor, roomName: string, type: number, mute: boolean, altRanking: boolean = false, rankingData?) {
    if (type == 0) {
      references.forEach(set => {
        const canvasSet = new Set<CanvasRenderingContext2D>()
        set.forEach((reference, i) => {
          canvasSet.add(reference.context)
        })
        canvasSet.forEach(ctx => {
          ctx.clearRect(0, 0, 96, 232)
          ctx.drawImage(r.fieldTiny, 0, 0)
        })
        set.forEach((reference, i) => {
          const userName = dataProcessor.getRoomUsers(roomName)[i]
          const d = dataProcessor.getPlayerState(userName)
          if (d != null) {
            const ctx = reference.context
            r.drawTextCentered(ctx, userName, 48, 216)
            const rank = (rankingData?.userToRankIndex?.get(userName) ?? -1) + 1
            if (altRanking) {
              const rankString = rank.toString()
              if (rank == 1) {
                const topScore = rankingData.ranking[0][1]
                const nextScore = rankingData.ranking[1] != null ? rankingData.ranking[1][1] : topScore
                const diff = this.formatScore(topScore - nextScore, true)
                r.drawText(ctx, `#${rankString}:+${diff}`, 8, 8)
                ctx.globalCompositeOperation = "multiply"
                ctx.fillStyle = "rgb(53, 202, 53)"
                ctx.fillRect(32, 8, 56, 8)
                ctx.globalCompositeOperation = "source-over"
              } else {
                const topScore = rankingData.ranking[0][1]
                const diff = this.formatScore(topScore - d.score, true)
                r.drawText(ctx, `#${rankString}:-${diff}`, 8, 8)
                ctx.globalCompositeOperation = "multiply"
                ctx.fillStyle = "rgb(255, 40, 0)"
                ctx.fillRect(32, 8, 56, 8)
                ctx.globalCompositeOperation = "source-over"
              }
            } else {
              const rankString = rank.toString().padStart(2, "0")
              const bestScoreString = GameRenderer.formatScore(d.bestScore, true)
              r.drawText(ctx, `#${rankString}:${bestScoreString}`, 8, 8)
            }
            const scoreString = GameRenderer.formatScore(d.score, true)
            const levelString = (0).toString().padStart(2, "0")
            const linesString = d.lines.toString().padStart(3, "0")
            r.drawText(ctx, `${scoreString}-${linesString}`, 8, 16)
            const blockColor = d.level % 10
            ctx.save()
            ctx.translate(8, 40)
            GameRenderer.renderFieldBackground(ctx, d.quadTimer)
            GameRenderer.renderIcon(ctx, userName)
            GameRenderer.renderField(ctx, d.field, blockColor)
            GameRenderer.renderHearts(ctx, dataProcessor.getPlayerInfo(userName).hearts, -1, false)
            ctx.restore()
            ctx.save()
            ctx.translate(64, 42)
            GameRenderer.renderNext(ctx, d.next, blockColor, 6)
            ctx.restore()
            if (!mute) GameRenderer.renderPlayerAudio(d.quadTimer, d.gameover)
          }
        })
      })
    } else if (type == 1) {
      references.forEach(set => {
        // Note: (ctxA, 0), (ctxA, 1), (ctxB, 0), (ctxB, 1), ...の順番に並んでいること
        set.forEach((reference, i) => {
          const userName = dataProcessor.getRoomUsers(roomName)[i]
          const ctx = reference.context
          const position = reference.position
          if (position == 0) {
            ctx.clearRect(0, 0, 256, 224)
            ctx.drawImage(r.field2P, 0, 0)
          }
          const d = dataProcessor.getPlayerState(userName)
          if (d != null) {
            if (position == 0) {
              r.drawText(ctx, GameRenderer.formatScore(d.score, false).padEnd(8, " "), 96, 40)
              r.drawText(ctx, String(d.lines).padStart(3, "0"), 96, 88)
              r.drawText(ctx, String(d.level).padStart(2, "0"), 96, 120)
              r.drawTextCentered(ctx, userName, 48, 208)
              const blockColor = d.level % 10
              ctx.save()
              ctx.translate(8, 32)
              GameRenderer.renderFieldBackground(ctx, d.quadTimer)
              GameRenderer.renderIcon(ctx, userName)
              GameRenderer.renderField(ctx, d.field, blockColor)
              ctx.restore()
              ctx.save()
              ctx.translate(32, 8)
              GameRenderer.renderNext(ctx, d.next, blockColor, 8)
              ctx.restore()
              ctx.save()
              ctx.translate(92, 208)
              GameRenderer.renderHearts(ctx, dataProcessor.getPlayerInfo(userName).hearts, -1, false)
              ctx.restore()
            }
            if (position == 1) {
              r.drawText(ctx, GameRenderer.formatScore(d.score, false).padStart(8, " "), 96, 56)
              r.drawText(ctx, String(d.lines).padStart(3, "0"), 136, 88)
              r.drawText(ctx, String(d.level).padStart(2, "0"), 144, 120)
              r.drawTextCentered(ctx, userName, 208, 208)
              const blockColor = d.level % 10
              ctx.save()
              ctx.translate(168, 32)
              GameRenderer.renderFieldBackground(ctx, d.quadTimer)
              GameRenderer.renderIcon(ctx, userName)
              GameRenderer.renderField(ctx, d.field, blockColor)
              ctx.restore()
              ctx.save()
              ctx.translate(192, 8)
              GameRenderer.renderNext(ctx, d.next, blockColor, 8)
              ctx.restore()
              ctx.save()
              ctx.translate(156, 208)
              GameRenderer.renderHearts(ctx, dataProcessor.getPlayerInfo(userName).hearts, -1, true)
              ctx.restore()
            }
            if (!mute) GameRenderer.renderPlayerAudio(d.quadTimer, d.gameover)
          }
        })
        const reference = set[0]
        const ctx = reference.context
        const userName1 = dataProcessor.getRoomUsers(roomName)[0]
        const userName2 = dataProcessor.getRoomUsers(roomName)[1]
        const d1 = dataProcessor.getPlayerState(userName1)
        const d2 = dataProcessor.getPlayerState(userName2)
        if (d1 != null && d2 != null) {
          const p1Char = d1.score > d2.score ? "<" : " "
          const p2Char = d2.score > d1.score ? ">" : " "
          r.drawText(ctx, p1Char + GameRenderer.formatScore(Math.abs(d1.score - d2.score), false) + p2Char, 96, 48)
          ctx.globalCompositeOperation = "multiply"
          if (d1.score == d2.score) {
            ctx.fillStyle = "rgb(250, 245, 0)"
          } else {
            ctx.fillStyle = "rgb(53, 202, 53)"
          }
          ctx.fillRect(96, 48, 64, 8)
          ctx.globalCompositeOperation = "source-over"
        }
      })
    }
  }

  static renderQualifierRanking(references: CanvasReference[], rankingData, time) {
    references.forEach(reference => {
      const ctx = reference.context
      ctx.clearRect(0, 0, 104, 254)
      ctx.drawImage(r.rankingFrame, 0, 0)
      r.drawText(ctx, "RANKING", 24, 8)
      rankingData.ranking.forEach(([userName, score], i) => {
        const rankIndex = rankingData.userToRankIndex.get(userName)
        r.drawText(ctx, `${rankIndex + 1}.${userName}`, 8, 32 + i * 24)
        const scoreString = String(score)
        r.drawText(ctx, scoreString, 96 - scoreString.length * 8, 40 + i * 24)
      })
      if (time != null) {
        const hour = String(Math.floor(time / (1000 * 60 * 60)))
        const minute = String(Math.floor(time / (1000 * 60)) % 60).padStart(2, "0")
        const second = String(Math.floor(time / 1000) % 60).padStart(2, "0")
        r.drawTextCentered(ctx, `${hour}:${minute}:${second}`, 52, 238)
      } else {
        r.drawTextCentered(ctx, "0:00:00", 52, 238)
        ctx.globalCompositeOperation = "multiply"
        ctx.fillStyle = "#888"
        ctx.fillRect(8, 238, 88, 8)
        ctx.globalCompositeOperation = "source-over"
      }
    })
  }

  static renderAward(references: CanvasReference[], userName) {
    references.forEach(reference => {
      const ctx = reference.context
      ctx.clearRect(0, 0, 128, 160)
      ctx.drawImage(r.award, 0, 0)
      const icon = r.requestUserIcon(userName)
      if (icon != null) {
        ctx.drawImage(icon, 24, 48, 79, 79)
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
      }
      r.drawTextCentered(ctx, userName, 64, 144)
    })
  }
}