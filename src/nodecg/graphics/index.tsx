import { h, app } from "hyperapp"
import r from "../../common/renderer"
import { Mutex } from "await-semaphore"
import ReplicantManager from "../../common/replicant-manager"

const replicantManager = new ReplicantManager({
  messages: {
    "changeScene": (dispatch, to) => {
      dispatch(startTransition, to)
    },
    "reloadIcons": (dispatch) => {
      dispatch(reloadIcons)
    },
    "updateCanvasContexts": (dispatch) => {
      dispatch(updateCanvasContexts)
    }
  }
})

const updateTransition = (state, phase) => {
  if (phase == 8) {
    return {
      ...state,
      currentView: state.transitionTo,
      transitionTo: null,
      transitionPhase: -1,
    }
  }
  return {
    ...state,
    transitionPhase: phase
  }
}

let canvasContexts = {
  singlePlayers: new Array<CanvasRenderingContext2D[]>(),
  doublePlayers: new Array<CanvasRenderingContext2D[]>(),
  ranking: new Array<CanvasRenderingContext2D>(),
  award: new Array<CanvasRenderingContext2D>()
}

const reloadIcons = (state) => {
  r.userIcons.clear()
  return state
}

const updateCanvasContexts = (state) => {
  const result = {
    singlePlayers: [],
    doublePlayers: [],
    ranking: [],
    award: []
  }

  ;[state.currentView, state.transitionTo].forEach(view => {
    switch (view) {
      case "game-qualifier":
        const sp = Array.from(document.querySelectorAll(`#${view}>.game-container>canvas`)).map(e => (e as HTMLCanvasElement).getContext("2d"))
        result.singlePlayers.push(sp)
        const ranking = (document.querySelector(`#${view}>.ranking`) as HTMLCanvasElement).getContext("2d")
        result.ranking.push(ranking)
        break
      case "game-1v1":
      case "game-1v1-1v1":
        const dp = Array.from(document.querySelectorAll(`#${view}>.game-container>canvas`)).map(e => (e as HTMLCanvasElement).getContext("2d"))
        result.doublePlayers.push(dp)
        break
      case "game-award":
        const award = (document.querySelector(`#${view}>.award`) as HTMLCanvasElement).getContext("2d")
        result.award.push(award)
    }
  })

  canvasContexts = result
  return state
}

const updateCanvasContextsEffect = dispatch => {
  setTimeout(() => dispatch(updateCanvasContexts), 100)
}

const transitionEffect = dispatch => {
  updateCanvasContextsEffect(dispatch)
  let phase = 0
  const fun = () => {
    phase++
    dispatch(updateTransition, phase)
    if (phase < 8) setTimeout(fun, 50)
    else updateCanvasContextsEffect(dispatch)
  }
  setTimeout(fun, 50)
}

const startTransition = (state, to) => {
  if (state.currentView == to || state.transitionPhase != -1) return state
  return [{
    ...state,
    transitionTo: to,
    transitionPhase: 0
  }, [transitionEffect]]
}

const updateNumPlayers = (state, d) => {
  return [{
    ...state,
    numPlayers: state.numPlayers + d
  }, [updateCanvasContextsEffect]]
}

const calculateClip = (state, viewName) => {
  const b = -120 + state.transitionPhase * 270 + 135
  if (state.currentView == viewName) {
    return {
      "clip-path": `polygon(${b}px 0px, 1920px 0px, 1920px 1080px, ${b}px 1080px)`
    }
  }
  if (state.transitionTo == viewName) {
    return {
      "clip-path": `polygon(0px 0px, ${b}px 0px, ${b}px 1080px, 0px 1080px)`
    }
  }
  return {
    "clip-path": "polygon(0 0)"
  }
}

const constructGameElement = (state, type) => {
  const id = `game-${type}`
  const inner = () => {
    switch(type) {
    case "qualifier":
      const shrink = state.numPlayers <= 5 ? 0
                  : state.numPlayers <= 6 ? 400
                  : state.numPlayers <= 8 ? 300
                  : state.numPlayers <= 10 ? 150
                  : 0
      return [
        <div class="game-container game-container-qualifier" style={{ padding: `0 ${shrink}px` }}>
          {[...Array(state.numPlayers)].map((e, i) => {
            const className = state.numPlayers <= 3 ? "game-large" :
                              state.numPlayers <= 4 ? "game-medium": "game-small"
            return <canvas class={className} width="96" height="232"></canvas>
          })}
        </div>,
        <canvas class="ranking" width="104" height="254"></canvas>
      ]
    case "1v1":
      return [
        <div class="game-container">
          <canvas class="game-1v1-large" width="256" height="224"></canvas>
        </div>,
      ]
    case "1v1-1v1":
      return [
        <div class="game-container">
          <canvas class="game-1v1-medium" width="256" height="224"></canvas>
          <canvas class="game-1v1-medium" width="256" height="224"></canvas>
        </div>,
      ]
    case "award":
      return [
        <canvas class="award" width="128" height="160"></canvas>
      ]
    }
  }
  return <div id={id} style={{ ...calculateClip(state, id) }}>
    {(state.currentView == id || state.transitionTo == id) && [
      inner(),
      <div class="game-footer">CTWC Japan Lite <span class="game-footer-variable">{state.nodecg.footer}</span></div>
    ]}
  </div>
}

r.init()
let currentState = {}

Promise.all([
  replicantManager.initialize(),
]).then(([replicantInitialStates]) => {
  app({
    init: [
      {
        nodecg: replicantInitialStates,
        currentView: "title",
        transitionTo: "game",
        transitionPhase: -1,
        footer: "予選スコアアタック",
        numPlayers: 1
      }
    ],
    view: state => (
      <div id="root">
        <div id="title" style={{ ...calculateClip(state, "title") }}>
          <div class="title-message">{state.nodecg.titleMessage}</div>
        </div>
        { constructGameElement(state, "qualifier") }
        { constructGameElement(state, "1v1") }
        { /*constructGameElement(state, "1v1v1")*/ }
        { /*constructGameElement(state, "1v1v1v1")*/ }
        { constructGameElement(state, "1v1-1v1") }
        { constructGameElement(state, "award") }
        <div id="transition" style={{ left: (-120 + state.transitionPhase * 270) + "px" }}></div>
        {
          false && <div id="debug">
            <button onClick={[startTransition, "title"]}>title</button>
            <button onClick={[startTransition, "game-qualifier"]}>qual</button>
            <button onClick={[startTransition, "game-1v1"]}>2</button>
            {/*<button onClick={[startTransition, "game-1v1v1"]}>3</button>*/}
            {/*<button onClick={[startTransition, "game-1v1v1v1"]}>4</button>*/}
            <button onClick={[startTransition, "game-1v1-1v1"]}>22</button>
            <button onClick={[startTransition, "game-award"]}>award</button>
            <button onClick={[updateNumPlayers, -1]}>-</button>
            <button onClick={[updateNumPlayers, 1]}>+</button>
          </div>
        }
          { /* Expose current state */ () => { currentState = state; return null } }
        </div>
    ),
    subscriptions: state => [
      ...replicantManager.getSubscriptions(),
    ],
    node: document.querySelector("#root")
  })
})

r.loadImages().then(() => {
  const onFrame = () => {
    canvasContexts.singlePlayers.forEach(set => {
      set.forEach(ctx => {
        ctx.clearRect(0, 0, 96, 232)
        ctx.drawImage(r.fieldTiny, 0, 0)
        r.drawText(ctx, "Player1あいう", 8, 216)
        const rankString = (1).toString().padStart(2, "0")
        const scoreString = (0).toString().padStart(6, "0")
        const levelString = (0).toString().padStart(2, "0")
        const linesString = (0).toString().padStart(3, "0")
        r.drawText(ctx, `#${rankString}:${scoreString}`, 8, 8)
        r.drawText(ctx, `${scoreString}-${linesString}`, 8, 16)
        const icon = r.requestUserIcon("コーリャン")
        if (icon != null) {
          ctx.drawImage(icon, 8, 56, 79, 79)
          ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
          ctx.fillRect(7, 55, 81, 81)
        }
      })
    })
    canvasContexts.doublePlayers.forEach(set => {
      set.forEach(ctx => {
        ctx.clearRect(0, 0, 256, 224)
        ctx.drawImage(r.field2P, 0, 0)
        r.drawText(ctx, "000000  ", 96, 40)
        r.drawText(ctx, "<000000>", 96, 48)
        r.drawText(ctx, "  000000", 96, 56)
        ctx.globalCompositeOperation = "multiply"
        ctx.fillStyle = "rgb(53, 202, 53)"
        ctx.fillStyle = "rgb(250, 245, 0)"
        ctx.fillRect(96, 48, 64, 8)
        ctx.globalCompositeOperation = "source-over"
        r.drawText(ctx, "000", 96, 88)
        r.drawText(ctx, "000", 136, 88)
        r.drawText(ctx, "00", 96, 120)
        r.drawText(ctx, "00", 144, 120)
        r.drawTextCentered(ctx, "Player1あいう", 48, 208)
        r.drawTextCentered(ctx, "Player2えお", 208, 208)
        ctx.drawImage(r.heart, 8, 0, 8, 8, 96, 208, 8, 8)
        ctx.drawImage(r.heart, 8, 0, 8, 8, 104, 208, 8, 8)
        ctx.drawImage(r.heart, 0, 0, 8, 8, 112, 208, 8, 8)
        ctx.drawImage(r.heart, 0, 0, 8, 8, 136, 208, 8, 8)
        ctx.drawImage(r.heart, 8, 0, 8, 8, 144, 208, 8, 8)
        ctx.drawImage(r.heart, 8, 0, 8, 8, 152, 208, 8, 8)
      })
    })
    canvasContexts.ranking.forEach(ctx => {
      ctx.clearRect(0, 0, 104, 254)
      ctx.drawImage(r.rankingFrame, 0, 0)
      r.drawText(ctx, "RANKING", 24, 8)
      ;[...Array(7)].forEach((_, i) => {
        r.drawText(ctx, `${i + 1}.プレイヤー名`, 8, 32 + i * 24)
        r.drawText(ctx, "999999", 48, 40 + i * 24)
      })
    })
    canvasContexts.award.forEach(ctx => {
      ctx.clearRect(0, 0, 128, 160)
      ctx.drawImage(r.award, 0, 0)
      const icon = r.requestUserIcon("コーリャン")
      if (icon != null) {
        ctx.drawImage(icon, 24, 48, 79, 79)
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
      }
      r.drawTextCentered(ctx, "コーリャン", 64, 144)
    })
  }

  const _onFrame = () => {
    onFrame()
    requestAnimationFrame(_onFrame)
  }
  requestAnimationFrame(_onFrame)
})