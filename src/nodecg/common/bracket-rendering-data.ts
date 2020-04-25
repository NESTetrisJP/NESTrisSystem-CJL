export const GroupRenderingData = [
  { type: "text", x: 44, y: 16, align: "center", color: "#FFF", params: ["name-1", "text"] },
  { type: "text", x: 116, y: 16, align: "center", color: "#FFF", params: ["name-2", "text"] },
  { type: "text", x: 188, y: 16, align: "center", color: "#FFF", params: ["name-3", "text"] },

  { type: "text", x: 44, y: 40, align: "center", color: "#FFF", params: ["1-score-1", "text"] },
  { type: "text", x: 116, y: 16, align: "center", color: "#FFF", params: ["1-score-2", "text"] },
  { type: "text", x: 188, y: 16, align: "center", color: "#FFF", params: ["1-score-3", "text"] },

  { type: "text", x: 44, y: 40, align: "center", params: ["1-score-1", "text"] },
  { type: "text", x: 116, y: 16, align: "center", params: ["1-score-2", "text"] },
  { type: "text", x: 188, y: 16, align: "center", params: ["1-score-3", "text"] },

]

export const BracketRenderingData = [
  // SF Left
  // { type: "line", x1: 8, y1: 19, x2: 83, y2: 19, color: "#747474" },
  // { type: "line", x1: 8, y1: 51, x2: 83, y2: 51, color: "#747474" },
  // { type: "line", x1: 83, y1: 19, x2: 83, y2: 51, color: "#747474" },

  { type: "line", x1: 8, y1: 19, x2: 83, y2: 19, color: "#9CFCF0", params: ["a1-win", "visible"] },
  { type: "line", x1: 8, y1: 51, x2: 83, y2: 51, color: "#9CFCF0", params: ["a1-win", "visible"] },

  { type: "line", x1: 83, y1: 19, x2: 83, y2: 35, color: "#9CFCF0", params: ["a2-win", "visible"] },
  { type: "line", x1: 83, y1: 35, x2: 83, y2: 51, color: "#9CFCF0", params: ["a2-win", "visible"] },

  // SF Right
  // { type: "line", x1: 187, y1: 99, x2: 263, y2: 99, color: "#747474" },
  // { type: "line", x1: 187, y1: 131, x2: 263, y2: 131, color: "#747474" },
  // { type: "line", x1: 187, y1: 99, x2: 187, y2: 131, color: "#747474" },

  { type: "line", x1: 187, y1: 99, x2: 263, y2: 99, color: "#9CFCF0", params: ["b1-win", "visible"] },
  { type: "line", x1: 187, y1: 99, x2: 187, y2: 115, color: "#9CFCF0", params: ["b1-win", "visible"] },

  { type: "line", x1: 187, y1: 131, x2: 263, y2: 131, color: "#9CFCF0", params: ["b2-win", "visible"] },
  { type: "line", x1: 187, y1: 115, x2: 187, y2: 131, color: "#9CFCF0", params: ["b2-win", "visible"] },

  // Finals
  // { type: "line", x1: 83, y1: 35, x2: 171, y2: 35, color: "#747474" },
  // { type: "line", x1: 100, y1: 115, x2: 187, y2: 115, color: "#747474" },

  { type: "line", x1: 83, y1: 35, x2: 171, y2: 35, color: "#747474", params: ["a1-win", "visible"] },
  { type: "line", x1: 83, y1: 35, x2: 171, y2: 35, color: "#747474", params: ["a2-win", "visible"] },
  { type: "line", x1: 100, y1: 115, x2: 187, y2: 115, color: "#747474", params: ["b1-win", "visible"] },
  { type: "line", x1: 100, y1: 115, x2: 187, y2: 115, color: "#747474", params: ["b2-win", "visible"] },
]