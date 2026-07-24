import './style.css'
import { Boat } from './game/Boat'
import { CanvasRenderer } from './game/CanvasRenderer'
import { MinimapRenderer } from './game/MinimapRenderer'
import { Race } from './game/Race'
import { RemoteBoat } from './game/RemoteBoat'
import { RemoteBoatDemo } from './game/RemoteBoatDemo'
import { RankingHud } from './ui/RankingHud'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
const context = canvas?.getContext('2d')
const minimapCanvas = document.querySelector<HTMLCanvasElement>('#minimap')
const minimapContext = minimapCanvas?.getContext('2d')
const hudElement = document.querySelector<HTMLElement>('#hud')

if (!canvas || !context || !minimapCanvas || !minimapContext || !hudElement) {
  throw new Error('Game UI could not be initialized')
}

const race = new Race()
const playerOne = new Boat({
  id: 'player-one',
  name: 'Player One',
  color: '#54d981',
  outlineColor: '#0c4b32',
  start: { x: -70, y: 0 },
  tack: 'starboard',
})
const playerTwo = new RemoteBoat({
  id: 'player-two',
  name: 'Remote Demo',
  color: '#a78bfa',
  outlineColor: '#4c1d95',
  start: { x: 70, y: 0 },
  tack: 'port',
})
race.addBoat(playerOne)
race.addBoat(playerTwo)
const remoteSource = new Boat({
  id: 'demo-remote-source',
  name: 'Remote Demo Source',
  color: playerTwo.color,
  outlineColor: playerTwo.outlineColor,
  start: { x: 70, y: 0 },
  tack: 'port',
})
const remoteBoatDemo = new RemoteBoatDemo(remoteSource, playerTwo)
const renderer = new CanvasRenderer(canvas, context)
const minimapRenderer = new MinimapRenderer(minimapCanvas, minimapContext)
const rankingHud = new RankingHud(hudElement)
let lastTime = performance.now()

function render(now: number): void {
  const deltaSeconds = Math.min((now - lastTime) / 1_000, 0.05)
  lastTime = now
  race.updateWind(now, deltaSeconds)
  remoteBoatDemo.update(deltaSeconds, race.wind.direction)
  for (const boat of race.boats) boat.update(deltaSeconds, race.wind.direction)
  renderer.render(race.boats, playerOne, race.wind.direction, race.wind.meanDirection)
  minimapRenderer.render(race.boats)
  rankingHud.render(race.boats)
  requestAnimationFrame(render)
}

canvas.addEventListener('pointerdown', () => playerOne.tack())
window.addEventListener('keydown', (event) => {
  if (event.repeat) return
  if (event.code === 'Space') {
    event.preventDefault()
    playerOne.tack()
  }
  if (event.code === 'KeyW') race.forceWindShift(performance.now())
})
window.addEventListener('resize', () => {
  renderer.resize()
  minimapRenderer.resize()
})

renderer.resize()
minimapRenderer.resize()
requestAnimationFrame(render)
