import gameover from "./audios/gameover.wav"
import quad from "./audios/quad.wav"

export default class AudioManager {
  static instance: AudioManager = null

  static getInstance() {
    if (AudioManager.instance == null) AudioManager.instance = new AudioManager()
    return AudioManager.instance
  }

  loaded = false
  gameover: HTMLAudioElement
  quad: HTMLAudioElement

  constructor() {

  }

  static loadAudio(path: string) {
    return new Promise<HTMLAudioElement>((resolve, reject) => {
      const audio = new Audio()
      audio.onloadeddata = () => resolve(audio)
      audio.onerror = (e) => reject(e)
      audio.src = path
      audio.load()
    })
  }

  async initialize() {
    if (this.loaded) return
    const result = await Promise.all([
      AudioManager.loadAudio(gameover),
      AudioManager.loadAudio(quad)
    ])
    this.gameover = result[0]
    this.quad = result[1]
    this.loaded = true
  }
}