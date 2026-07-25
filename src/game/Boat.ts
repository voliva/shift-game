import {
  BEAM_SPEED_FACTOR,
  BOAT_SPEED,
  DOOR_WIDTH,
  FORCED_BEAM_SPEED_FACTOR,
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
  targetHeading: number

  constructor(options: BoatOptions) {
    this.id = options.id
    this.name = options.name
    this.color = options.color
    this.trail = []
    this.currentTack = 'starboard'
    this.heading = -Math.PI / 4
    this.targetHeading = this.heading
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
    this.targetHeading = this.heading
  }

  tack(): void {
    this.setTack(this.currentTack === 'starboard' ? 'port' : 'starboard')
  }

  // A future remote controller can call this with the tack received from the network.
  setTack(tack: Tack): void {
    if (this.currentTack === tack) return
    this.currentTack = tack
    this.targetHeading = this.tackHeading()
  }

  update(deltaSeconds: number, _now: number): void {
    if (this.isFinished || !this.race || !this.position) return

    const nextDoorY = (Math.floor(this.position.y / this.race.gateDistance) + 1) * this.race.gateDistance
    this.targetHeading = this.tackHeading()
    const gateHeading = this.headingToGateSide(nextDoorY)
    const turnsFurtherOutward =
      (this.currentTack === 'starboard' && gateHeading < -Math.PI / 4) ||
      (this.currentTack === 'port' && gateHeading > Math.PI / 4)
    if (turnsFurtherOutward) this.targetHeading = gateHeading
    this.updateHeading(deltaSeconds)

    const course = this.race.wind.direction + this.heading
    const speedMultiplier = Math.abs(this.heading) <= Math.PI / 4
      ? (UPWIND_SPEED + (1 - UPWIND_SPEED) * 16 * this.heading * this.heading / Math.PI / Math.PI) /
        (Math.sqrt(2) * Math.cos(this.heading))
      : 1 + (BEAM_SPEED_FACTOR - 1) * Math.min(1, (Math.abs(this.heading) - Math.PI / 4) / (Math.PI / 4))
    const regularMovement = {
      x: Math.sin(course) * BOAT_SPEED * speedMultiplier * deltaSeconds,
      y: Math.cos(course) * BOAT_SPEED * speedMultiplier * deltaSeconds,
    }

    const distanceToDoor = nextDoorY - this.position.y
    const crossesDoor = regularMovement.y > 0 && distanceToDoor > 0 && regularMovement.y >= distanceToDoor
    const xAtDoor = crossesDoor
      ? this.position.x + regularMovement.x * distanceToDoor / regularMovement.y
      : this.position.x
    const isBeaming =
      (crossesDoor && Math.abs(xAtDoor) >= DOOR_WIDTH / 2) ||
      (this.isAtGate() && Math.abs(this.position.x) >= DOOR_WIDTH / 2)

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
    const isBeaming = this.isAtGate() && Math.abs(this.position.x) >= DOOR_WIDTH / 2;

    if (isBeaming) return -Math.sign(this.position.x) * Math.PI / 2
    return this.race.wind.direction + this.heading
  }

  private updateHeading(deltaSeconds: number): void {
    const difference = this.normalizeAngle(this.targetHeading - this.heading)
    const rotationSpeed = (Math.PI / 2) / TACK_DURATION_SECONDS
    this.heading += Math.sign(difference) * Math.min(Math.abs(difference), rotationSpeed * deltaSeconds)
  }

  private headingToGateSide(gateY: number): number {
    if (!this.position || !this.race) return this.tackHeading()
    const gateX = this.currentTack === 'port' ? -DOOR_WIDTH / 2 : DOOR_WIDTH / 2
    const courseToGate = Math.atan2(gateX - this.position.x, gateY - this.position.y)
    return this.normalizeAngle(courseToGate - this.race.wind.direction)
  }

  private tackHeading(): number {
    return this.currentTack === 'port' ? Math.PI / 4 : -Math.PI / 4
  }

  private normalizeAngle(angle: number): number {
    return Math.atan2(Math.sin(angle), Math.cos(angle))
  }

  private updateBeam(deltaSeconds: number): void {
    if (!this.position || !this.race) return;

    const nearestDoorY = Math.round(this.position.y / this.race.gateDistance) * this.race.gateDistance
    const nextDoorY = (Math.floor(this.position.y / this.race.gateDistance) + 1) * this.race.gateDistance
    this.position.y = this.isAtGate() ? nearestDoorY : nextDoorY
    this.position.x -= Math.sign(this.position.x) * BOAT_SPEED * FORCED_BEAM_SPEED_FACTOR * deltaSeconds
  }

  private isAtGate(): boolean {
    if (!this.position || !this.race) return false
    const nearestDoorY = Math.round(this.position.y / this.race.gateDistance) * this.race.gateDistance
    return Math.abs(this.position.y - nearestDoorY) < 0.001
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
