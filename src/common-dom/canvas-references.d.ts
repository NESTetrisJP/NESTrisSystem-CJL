declare global {
  type CanvasReference = {
    context: CanvasRenderingContext2D,
    position: number
  }

  type CanvasReferences = {
    "default": CanvasReference[][]
    "qualifier": CanvasReference[][]
    "qualifier-ranking": CanvasReference[]
    "1v1a": CanvasReference[][]
    "1v1b": CanvasReference[][]
    "1v1v1": CanvasReference[][]
    "award": CanvasReference[]
  }
}

export {}