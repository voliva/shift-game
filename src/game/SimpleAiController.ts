import { Boat } from './Boat'
import { DOOR_WIDTH } from './constants'
import type { Tack } from './types'

const WIND_TACK_THRESHOLD = 2 * Math.PI / 180
const MIN_LAYLINE_HOLD_MS = 3_000
const MAX_LAYLINE_HOLD_MS = 7_000

export class SimpleAiBoat extends Boat {
  private holdUntil = 0
  private wasOutsideLayline = false

  override update(deltaSeconds: number, now: number): void {
    super.update(deltaSeconds, now);
    if (!this.race) return;

    const laylineTack = this.crossedLayline(this.race.wind.meanDirection)
    if (laylineTack) {
      this.setTack(laylineTack)
      this.holdUntil = now + this.laylineHoldDuration(laylineTack, this.race.wind.direction)
      return
    }
    if (now < this.holdUntil) return

    if (this.race.wind.direction > WIND_TACK_THRESHOLD) this.setTack('starboard')
    if (this.race.wind.direction < -WIND_TACK_THRESHOLD) this.setTack('port')
  }

  private crossedLayline(meanWindDirection: number): Tack | undefined {
    if (!this.position || !this.race) return;

    const nextGateY = (Math.floor(this.position.y / this.race.gateDistance) + 1) * this.race.gateDistance
    const distanceToGate = nextGateY - this.position.y
    const windRadians = meanWindDirection
    const portHeading = windRadians + Math.PI / 4
    const starboardHeading = windRadians - Math.PI / 4

    if (distanceToGate <= 0 || Math.cos(portHeading) <= 0.05 || Math.cos(starboardHeading) <= 0.05) {
      this.wasOutsideLayline = false
      return undefined
    }

    const leftLaylineX = -DOOR_WIDTH / 2 - Math.tan(portHeading) * distanceToGate
    const rightLaylineX = DOOR_WIDTH / 2 - Math.tan(starboardHeading) * distanceToGate
    const outsideLayline = this.position.x <= leftLaylineX || this.position.x >= rightLaylineX

    if (!outsideLayline || this.wasOutsideLayline) {
      this.wasOutsideLayline = outsideLayline
      return undefined
    }

    this.wasOutsideLayline = true
    return this.position.x <= leftLaylineX ? 'port' : 'starboard'
  }

  private laylineHoldDuration(tack: Tack, windDirection: number): number {
    const heading = windDirection + (tack === 'port' ? Math.PI / 4 : -Math.PI / 4)
    const forwardProgress = Math.max(0, Math.cos(heading) / Math.cos(Math.PI / 4))
    return MIN_LAYLINE_HOLD_MS + (MAX_LAYLINE_HOLD_MS - MIN_LAYLINE_HOLD_MS) * Math.min(1, forwardProgress)
  }
}
