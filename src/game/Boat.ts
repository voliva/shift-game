import {
  BEAM_SPEED_FACTOR,
  BOAT_SPEED,
  DOOR_DISTANCE,
  DOOR_WIDTH,
  MAX_TRAIL_POINTS,
  TACK_DURATION_SECONDS,
  UPWIND_SPEED,
} from './constants'
import type { Point, Tack } from './types'

export type BoatOptions = {
  id: string
  color: string
  outlineColor: string
  start: Point
  tack?: Tack
}

export class Boat {
  readonly id: string
  readonly color: string
  readonly outlineColor: string
  readonly position: Point
  readonly trail: Point[]
  currentTack: Tack
  heading: number
  isBeaming = false
  private tackStartHeading: number
  private tackElapsed = TACK_DURATION_SECONDS
  private blockedDoorY = 0

  constructor(options: BoatOptions) {
    this.id = options.id
    this.color = options.color
    this.outlineColor = options.outlineColor
    this.position = { ...options.start }
    this.trail = [{ ...options.start }]
    this.currentTack = options.tack ?? 'starboard'
    this.heading = this.currentTack === 'port' ? Math.PI / 4 : -Math.PI / 4
    this.tackStartHeading = this.heading
  }

  tack(): void {
    this.setTack(this.currentTack === 'starboard' ? 'port' : 'starboard')
  }

  // A future remote controller can call this with the tack received from the network.
  setTack(tack: Tack): void {
    if (this.currentTack === tack) return
    this.currentTack = tack
    this.tackStartHeading = this.heading
    this.tackElapsed = 0
  }

  update(deltaSeconds: number, windDirection: number): void {
    this.updateHeading(deltaSeconds)
    const course = (windDirection * Math.PI) / 180 + this.heading
    const speedMultiplier =
      (UPWIND_SPEED + (1 - UPWIND_SPEED) * 16 * this.heading * this.heading / Math.PI / Math.PI) /
      (Math.sqrt(2) * Math.cos(this.heading))
    const movementX = Math.sin(course) * BOAT_SPEED * speedMultiplier * deltaSeconds
    const movementY = Math.cos(course) * BOAT_SPEED * speedMultiplier * deltaSeconds

    if (this.isBeaming) {
      this.updateBeam(movementX, movementY, deltaSeconds)
    } else {
      this.updateSailing(movementX, movementY, deltaSeconds)
    }
    this.recordTrailPoint()
  }

  visualCourse(windDirection: number): number {
    if (this.isBeaming) return -Math.sign(this.position.x) * Math.PI / 2
    return (windDirection * Math.PI) / 180 + this.heading
  }

  courseSegmentStart(): number {
    return this.isBeaming
      ? this.blockedDoorY - DOOR_DISTANCE
      : Math.floor(this.position.y / DOOR_DISTANCE) * DOOR_DISTANCE
  }

  private updateHeading(deltaSeconds: number): void {
    const targetHeading = this.currentTack === 'port' ? Math.PI / 4 : -Math.PI / 4
    if (this.tackElapsed >= TACK_DURATION_SECONDS) {
      this.heading = targetHeading
      return
    }
    this.tackElapsed = Math.min(this.tackElapsed + deltaSeconds, TACK_DURATION_SECONDS)
    const progress = this.tackElapsed / TACK_DURATION_SECONDS
    this.heading = this.tackStartHeading + (targetHeading - this.tackStartHeading) * progress
  }

  private updateBeam(movementX: number, movementY: number, deltaSeconds: number): void {
    this.position.y = this.blockedDoorY + 1
    if (Math.abs(this.position.x) < DOOR_WIDTH / 2) {
      this.isBeaming = false
      this.position.x += movementX
      this.position.y += movementY
    } else {
      this.position.x -= Math.sign(this.position.x) * BOAT_SPEED * BEAM_SPEED_FACTOR * deltaSeconds
    }
  }

  private updateSailing(movementX: number, movementY: number, deltaSeconds: number): void {
    const nextDoorY = (Math.floor(this.position.y / DOOR_DISTANCE) + 1) * DOOR_DISTANCE
    const crossesDoor = movementY > 0 && this.position.y < nextDoorY && this.position.y + movementY >= nextDoorY
    if (crossesDoor && Math.abs(this.position.x) >= DOOR_WIDTH / 2) {
      this.blockedDoorY = nextDoorY
      this.isBeaming = true
      this.position.y = this.blockedDoorY + 1
      this.position.x -= Math.sign(this.position.x) * BOAT_SPEED * BEAM_SPEED_FACTOR * deltaSeconds
      return
    }
    this.position.x += movementX
    this.position.y += movementY
  }

  private recordTrailPoint(): void {
    const previous = this.trail.at(-1)!
    if (Math.hypot(this.position.x - previous.x, this.position.y - previous.y) < 2) return
    this.trail.push({ ...this.position })
    if (this.trail.length > MAX_TRAIL_POINTS) this.trail.shift()
  }
}
