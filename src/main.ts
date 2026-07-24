import './style.css'
import { Boat } from './game/Boat'
import { CanvasRenderer } from './game/CanvasRenderer'
import { Race } from './game/Race'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
const context = canvas?.getContext('2d')

if (!canvas || !context) throw new Error('Canvas 2D is not available')

const race = new Race()
const playerOne = new Boat({
  id: 'player-one',
  color: '#54d981',
  outlineColor: '#0c4b32',
  start: { x: -70, y: 0 },
  tack: 'starboard',
})
const playerTwo = new Boat({
  id: 'player-two',
  color: '#a78bfa',
  outlineColor: '#4c1d95',
  start: { x: 70, y: 0 },
  tack: 'port',
})
race.addBoat(playerOne)
race.addBoat(playerTwo)
const renderer = new CanvasRenderer(canvas, context)
let lastTime = performance.now()

function render(now: number): void {
  const deltaSeconds = Math.min((now - lastTime) / 1_000, 0.05)
  lastTime = now
  race.updateWind(now, deltaSeconds)
  for (const boat of race.boats) boat.update(deltaSeconds, race.wind.direction)
  renderer.render(race, playerOne)
  requestAnimationFrame(render)
}

canvas.addEventListener('pointerdown', () => playerOne.tack())
window.addEventListener('keydown', (event) => {
  if (event.repeat) return
  if (event.code === 'Space') {
    event.preventDefault()
    playerOne.tack()
  }
  if (event.code === 'KeyT') playerTwo.tack()
  if (event.code === 'KeyW') race.forceWindShift(performance.now())
})
window.addEventListener('resize', () => renderer.resize())

renderer.resize()
requestAnimationFrame(render)
