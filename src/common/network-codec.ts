export const encode = (obj: object) => Buffer.from(JSON.stringify(obj) + "\n")
export const decode = (buffer: Buffer) => JSON.parse(buffer.toString())
export const decodeStr = (str: string) => JSON.parse(str)