declare global {
  type SingleCanvasReference = {
    context: CanvasRenderingContext2D
  }

  type MultipleCanvasReferences = {
    context: CanvasRenderingContext2D
  }[]

  type MultipleCanvasReferencesWithPosition = {
    context: CanvasRenderingContext2D,
    position: number
  }[]

  type CanvasReferences = {
    "default": MultipleCanvasReferences[]
    "qualifier": MultipleCanvasReferences[]
    "qualifier-ranking": SingleCanvasReference[]
    "1v1a": MultipleCanvasReferencesWithPosition[]
    "1v1b": MultipleCanvasReferencesWithPosition[]
    "1v1v1": MultipleCanvasReferences[]
    "award": SingleCanvasReference[]
  }
}

export {}