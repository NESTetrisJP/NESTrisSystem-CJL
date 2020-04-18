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
}