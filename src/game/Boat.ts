import {
  BEAM_SPEED_FACTOR,
  BOAT_SPEED,
  DOOR_WIDTH,
  MAX_TRAIL_POINTS,
  TACK_DURATION_SECONDS,
  UPWIND_SPEED,
} from './constants'
import type { Race } from './Race'
import type { Point, Tack } from './types'

// const OUTLINE_COLOR = "#082f49";

export type BoatOptions = {
  id: string
  name: string
  color: string
}

export class Boat {
  readonly id: string
  readonly name: string
  readonly color: string
  readonly outlineColor = '#082f49'
  position?: Point
  race?: Race
  trail: Point[]
  currentTack: Tack
  heading: number
  private tackStartHeading: number
  private tackElapsed = TACK_DURATION_SECONDS

  constructor(options: BoatOptions) {
    this.id = options.id
    this.name = options.name
    this.color = options.color
    this.trail = []
    this.currentTack = 'starboard'
    this.heading = -Math.PI / 4
    this.tackStartHeading = this.heading
  }

  placeInField(
    race: Race,
    position: Point,
    tack: Tack
  ) {
    this.race = race;
    this.position = { ...position };
    this.trail = [{ ...position }];
    this.currentTack = tack;
    this.heading = this.currentTack === 'port' ? Math.PI / 4 : -Math.PI / 4
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

  update(deltaSeconds: number, _now: number): void {
    if (this.isFinished || !this.race || !this.position) return

    this.updateHeading(deltaSeconds)
    const course = (this.race.wind.direction * Math.PI) / 180 + this.heading
    const speedMultiplier =
      (UPWIND_SPEED + (1 - UPWIND_SPEED) * 16 * this.heading * this.heading / Math.PI / Math.PI) /
      (Math.sqrt(2) * Math.cos(this.heading))
    const regularMovement = {
      x: Math.sin(course) * BOAT_SPEED * speedMultiplier * deltaSeconds,
      y: Math.cos(course) * BOAT_SPEED * speedMultiplier * deltaSeconds,
    }

    const nextDoorY = (Math.floor(this.position.y / this.race.gateDistance) + 1) * this.race.gateDistance
    const crossesDoor = this.position.y < nextDoorY && this.position.y + regularMovement.y >= nextDoorY;
    const isBeaming =
      (crossesDoor || this.position.y % this.race.gateDistance === 0) && Math.abs(this.position.x) >= DOOR_WIDTH / 2;

    if (isBeaming) {
      this.updateBeam(deltaSeconds)
    } else {
      this.updateSailing(regularMovement.x, regularMovement.y)
    }
    this.recordTrailPoint()
  }

  finish() {
    if (!this.race || !this.position) return;

    this.position.y = this.race.gatesToWin * this.race.gateDistance;
  }
  get isFinished() {
    if (!this.race || !this.position) return false;

    return this.position.y >= this.race.gatesToWin * this.race.gateDistance && Math.abs(this.position.x) < DOOR_WIDTH / 2;
  }

  visualCourse(): number {
    if (!this.position || !this.race) return 0;
    const isBeaming = this.position.y % this.race.gateDistance === 0 && Math.abs(this.position.x) >= DOOR_WIDTH / 2;

    if (isBeaming) return -Math.sign(this.position.x) * Math.PI / 2
    return (this.race.wind.direction * Math.PI) / 180 + this.heading
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

  private updateBeam(deltaSeconds: number): void {
    if (!this.position || !this.race) return;

    const nextDoorY = (Math.floor(this.position.y / this.race.gateDistance) + 1) * this.race.gateDistance
    this.position.y = this.position.y % this.race.gateDistance === 0 ? this.position.y : nextDoorY
    this.position.x -= Math.sign(this.position.x) * BOAT_SPEED * BEAM_SPEED_FACTOR * deltaSeconds
  }

  protected updateSailing(movementX: number, movementY: number): void {
    if (!this.position) return;

    this.position.x += movementX
    this.position.y += movementY
  }

  private recordTrailPoint(): void {
    if (!this.position) return;

    const previous = this.trail.at(-1)!
    if (Math.hypot(this.position.x - previous.x, this.position.y - previous.y) < 2) return
    this.trail.push({ ...this.position })
    if (this.trail.length > MAX_TRAIL_POINTS) this.trail.shift()
  }
}
