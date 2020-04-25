import net from "net"
import readline from "readline"
import { encode, decodeStr } from "../../common/network-codec"

export = function (nodecg: NodeCG) {
	const serverActive = nodecg.Replicant("serverActive", { defaultValue: false })

	const connectToServer = () => {
		const socket = net.createConnection({ port: 5043 }, () => {
			nodecg.log.info("Connected to NESTrisServer.")
			serverActive.value = true
			const rl = readline.createInterface(socket)

			const onData = data => {
				if (data.type == "commandResponse") {
					nodecg.sendMessage("serverCommandResponse", { type: "server", message: data.message })
				}
			}

			rl.on("line", data => {
				try {
					onData(decodeStr(data))
				} catch {
					nodecg.log.error("NESTrisServer responded invalid data: " + data)
				}
			})

			/*
			socket.setTimeout(10000)
			socket.on("timeout", () => {
				nodecg.log.error("Connection to NESTrisSystem Server timed out")
				socket.end()
			})
			*/
			socket.removeAllListeners("error")
			socket.on("error", err => {
				nodecg.log.error("Connection to NESTrisSystem Server emit an error: " + err)
			})
			socket.on("close", hadError => {
				nodecg.log.error("Connection to NESTrisSystem Server closed")
			})
		})
		socket.on("error", err => {
			nodecg.log.error("Connection to NESTrisSystem failed: " + err)
		})
		return socket
	}

	const isSocketActive = () => socket != null && !socket.destroyed

	let socket = connectToServer()
	nodecg.log.info("Connecting to NESTrisServer...")

	setInterval(() => {
    if (isSocketActive()) {
			socket.write(encode({}))
		} else {
			serverActive.value = false
			nodecg.log.info("Trying to reconnect to NESTrisServer...")
			socket = connectToServer()
		}
	}, 1000)

	nodecg.listenFor("serverCommand", (data) => {
		const split = (data.match(/(\\.|[^ ])+/g) ?? []).map(s => s.replace(/\\ /g, " ").replace(/\\\\/g, "\\"))
		const response = (message) => nodecg.sendMessage("serverCommandResponse", { type: "nodecg", message })
		const command = (argNames, process) => {
			if (split.length - 1 == argNames.length) {
				const args = {}
				argNames.forEach((name, i) => args[name] = split[i + 1])
				process(args)
			} else {
				response(`Arguments: ${argNames.map(e => `[${e}]`).join(" ")}`)
			}
		}
		switch (split[0]) {
		case "setHearts":
			command(["userName", "currentHearts", "maxHearts"], args => {
				socket.write(encode({
					command: "setHearts",
					userName: args.userName,
					currentHearts: Number(args.currentHearts),
					maxHearts: Number(args.maxHearts)
				}))
				response("setHearts sent.")
			})
			break
		case "setBestScore":
			command(["userName", "bestScore"], args => {
				socket.write(encode({
					command: "setBestScore",
					userName: args.userName,
					bestScore: Number(args.bestScore)
				}))
				response("setBestScore sent.")
			})
			break
		case "resetBestScores":
			command([], () => {
				socket.write(encode({
					command: "resetBestScores"
				}))
				response("resetBestScores sent.")
			})
			break
		case "moveToRoom":
			command(["userName", "room"], args => {
				socket.write(encode({
					command: "moveToRoom",
					userName: args.userName,
					room: args.room
				}))
				response("moveToRoom sent.")
			})
			break
		case "startQualifier":
			command([], () => {
				socket.write(encode({
					command: "startQualifier"
				}))
				response("startQualifier sent.")
			})
			break
		case "endQualifier":
			command([], () => {
				socket.write(encode({
					command: "endQualifier"
				}))
				response("endQualifier sent.")
			})
			break
		default:
			response("Unknown command.")
		}

	})
}