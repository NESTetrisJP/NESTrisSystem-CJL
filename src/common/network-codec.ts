export const encode = (obj: object) => Buffer.from(JSON.stringify(obj))
export const decode = (buffer: Buffer) => JSON.parse(buffer.toString())