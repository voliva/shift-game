import './style.css'

const canvas = document.querySelector<HTMLCanvasElement>('#game')!
const context = canvas.getContext('2d')!

if (!canvas || !context) throw new Error('Canvas 2D is not available')

type Point = { x: number; y: number }

const BOAT_SPEED = 120 // world units per second, matching the original 2 pixels/frame at 60 fps
const MAX_TRAIL_POINTS = 1_200
const WIND_TURN_SPEED = 25 // degrees/second: original Stage eases by 0.5 degrees every 20ms
const SHIFT_INTENSITY = 45
const MAX_DEVIATION = 45

let viewport = { width: window.innerWidth, height: window.innerHeight, pixelRatio: 1 }
let lastTime = performance.now()
let tack: 'port' | 'starboard' = 'starboard'
let windDirection = 0
let targetWindDirection = 0
let meanWindDirection = Math.random() * MAX_DEVIATION - MAX_DEVIATION / 2
let deviationDirection = Math.random() < 0.5 ? -1 : 1
let nextShiftAt = performance.now() + shiftDelay()
let nextDeviationAt = performance.now() + 10_000
const boat: Point = { x: 0, y: 0 }
const trail: Point[] = [{ ...boat }]

function resize(): void {
  viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  }

  canvas.width = Math.round(viewport.width * viewport.pixelRatio)
  canvas.height = Math.round(viewport.height * viewport.pixelRatio)
  canvas.style.width = `${viewport.width}px`
  canvas.style.height = `${viewport.height}px`
  context.setTransform(viewport.pixelRatio, 0, 0, viewport.pixelRatio, 0, 0)
}

function switchTack(): void {
  tack = tack === 'starboard' ? 'port' : 'starboard'
}

function shiftDelay(): number {
  return (2 + Math.random() * 4) * 1_000
}

function makeWindShift(): void {
  // This mirrors ServerStage: a random ±22.5° shift around a slowly drifting mean.
  targetWindDirection = meanWindDirection + Math.random() * SHIFT_INTENSITY - SHIFT_INTENSITY / 2
  nextShiftAt = performance.now() + shiftDelay()
}

function update(deltaSeconds: number): void {
  const now = performance.now()
  if (now >= nextShiftAt) makeWindShift()
  if (now >= nextDeviationAt) {
    meanWindDirection += deviationDirection
    if (Math.abs(meanWindDirection) >= MAX_DEVIATION / 2) deviationDirection *= -1
    nextDeviationAt = now + 10_000
  }

  const remainingTurn = targetWindDirection - windDirection
  const turn = Math.sign(remainingTurn) * Math.min(Math.abs(remainingTurn), WIND_TURN_SPEED * deltaSeconds)
  windDirection += turn

  const courseDegrees = windDirection + (tack === 'port' ? 45 : -45)
  const course = (courseDegrees * Math.PI) / 180

  boat.x += Math.sin(course) * BOAT_SPEED * deltaSeconds
  boat.y += Math.cos(course) * BOAT_SPEED * deltaSeconds

  const previous = trail.at(-1)!
  if (Math.hypot(boat.x - previous.x, boat.y - previous.y) >= 2) {
    trail.push({ ...boat })
    if (trail.length > MAX_TRAIL_POINTS) trail.shift()
  }
}

function worldToScreen(point: Point): Point {
  return {
    x: viewport.width / 2 + point.x - boat.x,
    y: viewport.height / 2 - point.y + boat.y,
  }
}

function drawTrail(): void {
  if (trail.length < 2) return

  context.beginPath()
  trail.forEach((point, index) => {
    const screen = worldToScreen(point)
    if (index === 0) context.moveTo(screen.x, screen.y)
    else context.lineTo(screen.x, screen.y)
  })
  context.strokeStyle = 'rgba(5, 61, 99, 0.72)'
  context.lineWidth = 2
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.stroke()
}

function drawBoat(): void {
  const centerX = viewport.width / 2
  const centerY = viewport.height / 2
  const courseDegrees = windDirection + (tack === 'port' ? 45 : -45)

  context.save()
  context.translate(centerX, centerY)
  context.rotate((courseDegrees * Math.PI) / 180)

  // A compact sailboat, pointed in its direction of travel.
  context.beginPath()
  context.moveTo(0, -25)
  context.lineTo(11, 18)
  context.lineTo(0, 24)
  context.lineTo(-11, 18)
  context.closePath()
  context.fillStyle = '#54d981'
  context.fill()
  context.lineWidth = 2
  context.strokeStyle = '#0c4b32'
  context.stroke()

  context.beginPath()
  context.moveTo(0, -20)
  context.lineTo(0, 5)
  context.lineTo(12, 3)
  context.closePath()
  context.fillStyle = '#f4fff7'
  context.fill()
  context.stroke()

  context.restore()
}

function drawHud(): void {
  context.fillStyle = 'rgba(255, 255, 255, 0.86)'
  context.fillRect(18, 18, 250, 68)
  context.strokeStyle = 'rgba(4, 48, 78, 0.18)'
  context.strokeRect(18, 18, 250, 68)
  context.fillStyle = '#063d63'
  context.font = '600 14px system-ui, sans-serif'
  context.fillText('Click or press Space to tack', 32, 40)
  context.font = '12px system-ui, sans-serif'
  context.fillText(`Current tack: ${tack}`, 32, 58)
  context.fillText(`Wind: ${windDirection.toFixed(0)}°  ·  W: force shift`, 32, 76)
}

function render(now: number): void {
  const deltaSeconds = Math.min((now - lastTime) / 1_000, 0.05)
  lastTime = now
  update(deltaSeconds)

  context.clearRect(0, 0, viewport.width, viewport.height)
  context.fillStyle = '#1295d8'
  context.fillRect(0, 0, viewport.width, viewport.height)
  drawTrail()
  drawBoat()
  drawHud()

  requestAnimationFrame(render)
}

canvas.addEventListener('pointerdown', switchTack)
window.addEventListener('keydown', (event) => {
  if (event.repeat) return
  if (event.code === 'Space') {
    event.preventDefault()
    switchTack()
  }
  if (event.code === 'KeyW') makeWindShift()
})
window.addEventListener('resize', resize)

resize()
requestAnimationFrame(render)
