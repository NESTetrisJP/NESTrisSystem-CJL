import md5 from "md5"

import asciiFont from "./images/asciifont.png"
import misakiFont from "./images/misaki_gothic.png"
import blocks from "./images/blocks.png"
import blocks6 from "./images/blocks6.png"
import fieldTiny from "./images/field_tiny.png"
import field2P from "./images/field_2p.png"
import rankingFrame from "./images/ranking_frame.png"
import heart from "./images/heart.png"
import award from "./images/award.png"

import unicodeToKuten from "../unicode-to-kuten.json"

class UserIconLoader {
  name: string
  image: HTMLImageElement
  timeout: boolean
  notFound: boolean
  constructor(name: string) {
    this.name = name
    this.timeout = false
  }
  load() {
    Renderer.loadImage(`http://localhost:1234/icons/${md5(this.name)}.png`).then(e => {
      this.image = e
    }).catch(err => {
      console.error(err)
    })
    setTimeout(() => this.timeout = true, 10000)
  }
  getImage() {
    return this.image
  }
}

export default class Renderer {
  static asciiFont: HTMLImageElement
  static misakiFont: HTMLImageElement
  static blocks: HTMLImageElement
  static blocks6: HTMLImageElement
  static fieldTiny: HTMLImageElement
  static field2P: HTMLImageElement
  static rankingFrame: HTMLImageElement
  static heart: HTMLImageElement
  static award: HTMLImageElement

  static fontMap = new Map<number, [number, number]>()

  static nextPieceRenderingData = {
    "I": [
      [0, 0.5, 1],
      [1, 0.5, 1],
      [2, 0.5, 1],
      [3, 0.5, 1],
    ],
    "J": [
      [0.5, 0, 2],
      [1.5, 0, 2],
      [2.5, 0, 2],
      [2.5, 1, 2],
    ],
    "L": [
      [0.5, 0, 3],
      [0.5, 1, 3],
      [1.5, 0, 3],
      [2.5, 0, 3],
    ],
    "O": [
      [1, 0, 1],
      [1, 1, 1],
      [2, 0, 1],
      [2, 1, 1],
    ],
    "S": [
      [0.5, 1, 2],
      [1.5, 0, 2],
      [1.5, 1, 2],
      [2.5, 0, 2],
    ],
    "T": [
      [0.5, 0, 1],
      [1.5, 0, 1],
      [1.5, 1, 1],
      [2.5, 0, 1],
    ],
    "Z": [
      [0.5, 0, 3],
      [1.5, 0, 3],
      [1.5, 1, 3],
      [2.5, 1, 3],
    ]
  }

  static userIcons = new Map<string, UserIconLoader>()

  static loadImage(path: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = (e) => reject(e)
      img.src = path
    })
  }
  static async loadImages() {
    unicodeToKuten.forEach(e => Renderer.fontMap.set(e[0], [e[1] - 1, e[2] - 1]))

    const result = await Promise.all([
      Renderer.loadImage(asciiFont),
      Renderer.loadImage(misakiFont),
      Renderer.loadImage(blocks),
      Renderer.loadImage(blocks6),
      Renderer.loadImage(fieldTiny),
      Renderer.loadImage(field2P),
      Renderer.loadImage(rankingFrame),
      Renderer.loadImage(heart),
      Renderer.loadImage(award),
    ])
    Renderer.asciiFont = result[0]
    Renderer.misakiFont = result[1]
    Renderer.blocks = result[2]
    Renderer.blocks6 = result[3]
    Renderer.fieldTiny = result[4]
    Renderer.field2P = result[5]
    Renderer.rankingFrame = result[6]
    Renderer.heart = result[7]
    Renderer.award = result[8]
  }

  static init() {
    setInterval(() => {
      /*
      Renderer.userIcons.forEach((value, key) => {
        if (value.timeout && !value.notFound && value.getImage() == null) Renderer.userIcons.delete(key)
      })
      */
    }, 1000)
  }

  static drawText(ctx, str, dx, dy) {
    let x = 0
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i)
      if (0x20 <= code && code < 0x80) {
          ctx.drawImage(Renderer.asciiFont, ((code - 0x20) % 16) * 8, Math.floor((code - 0x20) / 16) * 8, 8, 8, dx + x, dy, 8, 8)
          x += 8
      } else {
        const kuten = Renderer.fontMap.get(str.charCodeAt(i))
        if (kuten != null) {
          ctx.drawImage(Renderer.misakiFont, kuten[1] * 8, kuten[0] * 8, 8, 8, dx + x, dy, 8, 8)
          x += 8
        }
      }
    }
  }

  static drawTextCentered(ctx, str, dx, dy) {
    Renderer.drawText(ctx, str, dx - str.length * 4, dy)
  }

  static requestUserIcon(name: string) {
    const iconLoader = Renderer.userIcons.get(name)
    if (iconLoader != null) {
      const icon = iconLoader.getImage()
      return icon
    } else {
      const loader = new UserIconLoader(name)
      loader.load()
      Renderer.userIcons.set(name, loader)
      return null
    }
  }
}