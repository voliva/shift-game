import { Boat } from './Boat'
import { DOOR_DISTANCE, DOOR_WIDTH } from './constants'
import type { Tack } from './types'

const WIND_TACK_THRESHOLD = 2
const MIN_LAYLINE_HOLD_MS = 3_000
const MAX_LAYLINE_HOLD_MS = 7_000

export class SimpleAiController {
  private readonly boat: Boat
  private holdUntil = 0
  private wasOutsideLayline = false

  constructor(boat: Boat) {
    this.boat = boat
  }

  update(now: number, windDirection: number, meanWindDirection: number): void {
    const laylineTack = this.crossedLayline(meanWindDirection)
    if (laylineTack) {
      this.boat.setTack(laylineTack)
      this.holdUntil = now + this.laylineHoldDuration(laylineTack, windDirection)
      return
    }
    if (now < this.holdUntil) return

    if (windDirection > WIND_TACK_THRESHOLD) this.boat.setTack('starboard')
    if (windDirection < -WIND_TACK_THRESHOLD) this.boat.setTack('port')
  }

  private crossedLayline(meanWindDirection: number): Tack | undefined {
    const nextGateY = (Math.floor(this.boat.position.y / DOOR_DISTANCE) + 1) * DOOR_DISTANCE
    const distanceToGate = nextGateY - this.boat.position.y
    const windRadians = (meanWindDirection * Math.PI) / 180
    const portHeading = windRadians + Math.PI / 4
    const starboardHeading = windRadians - Math.PI / 4

    if (distanceToGate <= 0 || Math.cos(portHeading) <= 0.05 || Math.cos(starboardHeading) <= 0.05) {
      this.wasOutsideLayline = false
      return undefined
    }

    const leftLaylineX = -DOOR_WIDTH / 2 - Math.tan(portHeading) * distanceToGate
    const rightLaylineX = DOOR_WIDTH / 2 - Math.tan(starboardHeading) * distanceToGate
    const outsideLayline = this.boat.position.x <= leftLaylineX || this.boat.position.x >= rightLaylineX

    if (!outsideLayline || this.wasOutsideLayline) {
      this.wasOutsideLayline = outsideLayline
      return undefined
    }

    this.wasOutsideLayline = true
    return this.boat.position.x <= leftLaylineX ? 'port' : 'starboard'
  }

  private laylineHoldDuration(tack: Tack, windDirection: number): number {
    const heading = (windDirection * Math.PI) / 180 + (tack === 'port' ? Math.PI / 4 : -Math.PI / 4)
    const forwardProgress = Math.max(0, Math.cos(heading) / Math.cos(Math.PI / 4))
    return MIN_LAYLINE_HOLD_MS + (MAX_LAYLINE_HOLD_MS - MIN_LAYLINE_HOLD_MS) * Math.min(1, forwardProgress)
  }
}
