import { h, app } from "hyperapp"
import ReplicantManager from "../common-nodecg-dom/replicant-manager"

const replicantManager = new ReplicantManager()
const { updateFromInput, sendMessage } = replicantManager.getHelperFunctions()

Promise.all([
  replicantManager.initialize()
]).then(([replicantInitialStates]) => {
  app({
    init: [
      { nodecg: replicantInitialStates }
    ],
    view: state => (
      <div>
        <div>
          <div>
            タイトルメッセージ:
            <input id="titleMessage" value={state.nodecg.titleMessage}></input>
            <button id="updateTitleMessage" onclick={[updateFromInput, ["titleMessage", "titleMessage"]]}>更新</button>
          </div>
          <hr></hr>
          <div>
            ゲーム画面フッター:
            <input id="footer" value={state.nodecg.footer}></input>
            <button id="updateFooter" onclick={[updateFromInput, ["footer", "footer"]]}>更新</button>
          </div>
          <hr></hr>
          <div>
            表彰プレイヤー名:
            <input id="awardedPlayer" value={state.nodecg.awardedPlayer}></input>
            <button id="updateAwardedPlayer" onclick={[updateFromInput, ["awardedPlayer", "awardedPlayer"]]}>更新</button>
          </div>
          <hr></hr>
          <div>
            画面切り替え:
            <button onclick={[sendMessage, ["changeScene", "title"]]}>タイトル画面</button>
            <button onclick={[sendMessage, ["changeScene", "game-qualifier"]]}>予選画面</button>
            <button onclick={[sendMessage, ["changeScene", "game-1v1"]]}>1v1画面</button>
            <button onclick={[sendMessage, ["changeScene", "game-1v1-1v1"]]}>1v1画面x2</button>
            <button onclick={[sendMessage, ["changeScene", "game-1v1v1"]]}>1v1v1画面</button>
            <button onclick={[sendMessage, ["changeScene", "bracket-group-a"]]}>グループA</button>
            <button onclick={[sendMessage, ["changeScene", "bracket-group-b"]]}>グループB</button>
            <button onclick={[sendMessage, ["changeScene", "bracket-bracket"]]}>準決勝・決勝トーナメント</button>
            <button onclick={[sendMessage, ["changeScene", "game-award"]]}>表彰画面</button>
          </div>
          <hr></hr>
          <div>
            その他:
            <button onclick={[sendMessage, ["updateCanvasContexts"]]}>Canvas再検出</button>
            <button onclick={[sendMessage, ["reloadIcons"]]}>アイコン再読み込み</button>
          </div>
        </div>
      </div>
    ),
    subscriptions: state => [
      ...replicantManager.getSubscriptions()
    ],
    node: document.querySelector("#root")
  })
})
