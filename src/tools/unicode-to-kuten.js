const fs = require("fs")

const data = fs.readFileSync("kuten.in").toString()
const result = []

data.split("\n").forEach(row => {
  if (row[0].match(/[0-9]/)) {
    const codes = row.split("\t")
    const utf16 = parseInt(codes[6], 16)
    const ku = parseInt(codes[0], 10)
    const ten = parseInt(codes[1], 10)
    if (!isNaN(utf16)) {
      result.push([utf16, ku, ten])
    }
  }
})
fs.writeFileSync("unicode-to-kuten.json", JSON.stringify(result))