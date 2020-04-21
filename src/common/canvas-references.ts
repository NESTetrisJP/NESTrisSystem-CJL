export type CanvasReference = {
  context: CanvasRenderingContext2D,
  position: number
}

export type CanvasReferences = {
  "qualifier": CanvasReference[][]
  "qualifier-ranking": CanvasReference[]
  "1v1a": CanvasReference[][]
  "1v1b": CanvasReference[][]
  "award": CanvasReference[]
}
