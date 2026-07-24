import './style.css'

const canvas = document.querySelector<HTMLCanvasElement>('#game')!
const context = canvas.getContext('2d')!

if (!canvas || !context) throw new Error('Canvas 2D is not available')

type Point = { x: number; y: number }

const BOAT_SPEED = 120
const MAX_TRAIL_POINTS = 1_200
const TACK_DURATION_SECONDS = 0.5
const UPWIND_SPEED = 0.8
const DOOR_DISTANCE = 6_000
const DOOR_WIDTH = 400
const BEAM_SPEED_FACTOR = 1.5
const LAYLINE_LENGTH = 12_000
const WIND_TURN_SPEED = 25
const SHIFT_INTENSITY = 45
const MAX_DEVIATION = 45

let viewport = { width: window.innerWidth, height: window.innerHeight, pixelRatio: 1 }
let lastTime = performance.now()
let tack: 'port' | 'starboard' = 'starboard'
let heading = -Math.PI / 4
let tackStartHeading = heading
let tackElapsed = TACK_DURATION_SECONDS
let windDirection = 0
let targetWindDirection = 0
let meanWindDirection = Math.random() * MAX_DEVIATION - MAX_DEVIATION / 2
let deviationDirection = Math.random() < 0.5 ? -1 : 1
let nextShiftAt = performance.now() + shiftDelay()
let nextDeviationAt = performance.now() + 10_000
let beaming = false
let blockedDoorY = 0
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
  tackStartHeading = heading
  tackElapsed = 0
}

function shiftDelay(): number {
  return (2 + Math.random() * 4) * 1_000
}

function makeWindShift(): void {
  // Original ServerStage chooses a random shift around a slowly drifting mean.
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
  windDirection += Math.sign(remainingTurn) * Math.min(Math.abs(remainingTurn), WIND_TURN_SPEED * deltaSeconds)

  const targetHeading = tack === 'port' ? Math.PI / 4 : -Math.PI / 4
  if (tackElapsed < TACK_DURATION_SECONDS) {
    tackElapsed = Math.min(tackElapsed + deltaSeconds, TACK_DURATION_SECONDS)
    const progress = tackElapsed / TACK_DURATION_SECONDS
    heading = tackStartHeading + (targetHeading - tackStartHeading) * progress
  } else {
    heading = targetHeading
  }

  const course = (windDirection * Math.PI) / 180 + heading
  const speedMultiplier =
    (UPWIND_SPEED + (1 - UPWIND_SPEED) * 16 * heading * heading / Math.PI / Math.PI) /
    (Math.sqrt(2) * Math.cos(heading))

  const movementX = Math.sin(course) * BOAT_SPEED * speedMultiplier * deltaSeconds
  const movementY = Math.cos(course) * BOAT_SPEED * speedMultiplier * deltaSeconds

  if (beaming) {
    // Stage.java pins a missed boat to the door, then moves it sideways to the opening.
    boat.y = blockedDoorY + 1
    if (Math.abs(boat.x) < DOOR_WIDTH / 2) {
      beaming = false
      boat.x += movementX
      boat.y += movementY
    } else {
      boat.x -= Math.sign(boat.x) * BOAT_SPEED * BEAM_SPEED_FACTOR * deltaSeconds
    }
  } else {
    const nextDoorY = (Math.floor(boat.y / DOOR_DISTANCE) + 1) * DOOR_DISTANCE
    const crossesDoor = movementY > 0 && boat.y < nextDoorY && boat.y + movementY >= nextDoorY

    if (crossesDoor && Math.abs(boat.x) >= DOOR_WIDTH / 2) {
      blockedDoorY = nextDoorY
      beaming = true
      boat.y = blockedDoorY + 1
      boat.x -= Math.sign(boat.x) * BOAT_SPEED * BEAM_SPEED_FACTOR * deltaSeconds
    } else {
      boat.x += movementX
      boat.y += movementY
    }
  }

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
  const course = beaming
    ? -Math.sign(boat.x) * Math.PI / 2
    : (windDirection * Math.PI) / 180 + heading
  context.save()
  context.translate(viewport.width / 2, viewport.height / 2)
  context.rotate(course)

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

function drawDoors(): void {
  const currentDoorY = Math.floor(boat.y / DOOR_DISTANCE) * DOOR_DISTANCE
  const doorYs = [currentDoorY, currentDoorY + DOOR_DISTANCE]

  for (const doorY of doorYs) {
    const left = worldToScreen({ x: -DOOR_WIDTH / 2, y: doorY })
    const right = worldToScreen({ x: DOOR_WIDTH / 2, y: doorY })

    context.strokeStyle = '#ff7f0a'
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(left.x, left.y)
    context.lineTo(right.x, right.y)
    context.stroke()
    context.fillStyle = context.strokeStyle
    context.beginPath()
    context.arc(left.x, left.y, 6, 0, Math.PI * 2)
    context.arc(right.x, right.y, 6, 0, Math.PI * 2)
    context.fill()
  }
}

function drawLaylines(): void {
  const currentDoorY = Math.floor(boat.y / DOOR_DISTANCE) * DOOR_DISTANCE
  const gateYs = [currentDoorY, currentDoorY + DOOR_DISTANCE]
  const windRadians = (meanWindDirection * Math.PI) / 180
  const laylines = [
    { x: -DOOR_WIDTH / 2, inboundHeading: windRadians + Math.PI / 4 },
    { x: DOOR_WIDTH / 2, inboundHeading: windRadians - Math.PI / 4 },
  ]

  context.strokeStyle = 'rgba(220, 45, 45, 0.65)'
  context.lineWidth = 2
  context.setLineDash([8, 8])
  context.beginPath()
  for (const gateY of gateYs) {
    for (const { x, inboundHeading } of laylines) {
      const start = worldToScreen({ x, y: gateY })
      const end = worldToScreen({
        x: x - Math.sin(inboundHeading) * LAYLINE_LENGTH,
        y: gateY - Math.cos(inboundHeading) * LAYLINE_LENGTH,
      })
      context.moveTo(start.x, start.y)
      context.lineTo(end.x, end.y)
    }
  }
  context.stroke()
  context.setLineDash([])
}

function drawCourseNavigator(): void {
  const width = 164
  const height = 214
  const left = viewport.width - width - 18
  const top = 18
  const centerX = left + width / 2
  const startY = top + height - 26
  const finishY = top + 36
  const middleY = (startY + finishY) / 2
  const mapScale = Math.min(
    (width - 24) / (DOOR_DISTANCE + DOOR_WIDTH),
    (startY - finishY) / DOOR_DISTANCE,
  )
  const gateHalfWidth = (DOOR_WIDTH / 2) * mapScale
  const tunnelHalfWidth = (DOOR_DISTANCE / 2 + DOOR_WIDTH / 2) * mapScale
  // Stage keeps the boat numerically just beyond a missed gate while it beams sideways.
  // Keep it on the completed segment in the navigator until it is actually released.
  const segmentStartY = beaming
    ? blockedDoorY - DOOR_DISTANCE
    : Math.floor(boat.y / DOOR_DISTANCE) * DOOR_DISTANCE
  const progress = Math.max(0, Math.min(1, (boat.y - segmentStartY) / DOOR_DISTANCE))
  const boatY = startY + (finishY - startY) * progress
  const boatX = centerX + Math.max(-tunnelHalfWidth, Math.min(tunnelHalfWidth, boat.x * mapScale))

  context.save()
  context.globalAlpha = 0.8
  context.fillStyle = 'rgba(255, 255, 255, 0.86)'
  context.fillRect(left, top, width, height)
  context.strokeStyle = 'rgba(4, 48, 78, 0.18)'
  context.strokeRect(left, top, width, height)
  context.fillStyle = '#063d63'
  context.font = '600 12px system-ui, sans-serif'
  context.fillText('COURSE', left + 12, top + 19)

  context.strokeStyle = 'rgba(5, 61, 99, 0.42)'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(centerX - gateHalfWidth, startY)
  context.lineTo(centerX - tunnelHalfWidth, middleY)
  context.lineTo(centerX - gateHalfWidth, finishY)
  context.moveTo(centerX + gateHalfWidth, startY)
  context.lineTo(centerX + tunnelHalfWidth, middleY)
  context.lineTo(centerX + gateHalfWidth, finishY)
  context.stroke()

  context.strokeStyle = '#ff7f0a'
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(centerX - gateHalfWidth, startY)
  context.lineTo(centerX + gateHalfWidth, startY)
  context.moveTo(centerX - gateHalfWidth, finishY)
  context.lineTo(centerX + gateHalfWidth, finishY)
  context.stroke()

  context.fillStyle = beaming ? '#ff7f0a' : '#54d981'
  context.beginPath()
  context.arc(boatX, boatY, 5, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function drawHud(): void {
  context.fillStyle = 'rgba(255, 255, 255, 0.86)'
  context.fillRect(18, 18, 250, 86)
  context.strokeStyle = 'rgba(4, 48, 78, 0.18)'
  context.strokeRect(18, 18, 250, 86)
  context.fillStyle = '#063d63'
  context.font = '600 14px system-ui, sans-serif'
  context.fillText('Click or press Space to tack', 32, 40)
  context.font = '12px system-ui, sans-serif'
  context.fillText(`Current tack: ${tack}`, 32, 58)
  context.fillText(`Wind: ${windDirection.toFixed(0)} deg  |  W: force shift`, 32, 76)
  context.fillText(beaming ? 'Missed gate: returning to opening' : 'Next gate: 400-unit opening', 32, 94)
}

function render(now: number): void {
  const deltaSeconds = Math.min((now - lastTime) / 1_000, 0.05)
  lastTime = now
  update(deltaSeconds)
  context.clearRect(0, 0, viewport.width, viewport.height)
  context.fillStyle = '#1295d8'
  context.fillRect(0, 0, viewport.width, viewport.height)
  drawLaylines()
  drawTrail()
  drawDoors()
  drawBoat()
  drawHud()
  drawCourseNavigator()
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
