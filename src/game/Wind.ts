import { MAX_DEVIATION, SHIFT_INTENSITY, WIND_TURN_SPEED } from './constants'

export type WindConditions = {
  targetDirection: number
  meanDirection: number
}

export class Wind {
  direction = 0
  meanDirection = Math.random() * MAX_DEVIATION - MAX_DEVIATION / 2
  private targetDirection = 0
  private deviationDirection = Math.random() < 0.5 ? -1 : 1
  private nextShiftAt = this.shiftDelay()
  private nextDeviationAt = 10_000
  private authoritative = false

  update(deltaSeconds: number, now: number): void {
    if (!this.authoritative) {
      if (now >= this.nextShiftAt) this.makeShift(now)
      if (now >= this.nextDeviationAt) {
        this.meanDirection += this.deviationDirection
        if (Math.abs(this.meanDirection) >= MAX_DEVIATION / 2) this.deviationDirection *= -1
        this.nextDeviationAt = now + 10_000
      }
    }

    const difference = this.targetDirection - this.direction
    this.direction += Math.sign(difference) * Math.min(Math.abs(difference), WIND_TURN_SPEED * deltaSeconds)
  }

  forceShift(now: number): void {
    if (this.authoritative) return
    this.makeShift(now)
  }

  setConditions(conditions: WindConditions): void {
    this.authoritative = true
    this.meanDirection = conditions.meanDirection
    this.targetDirection = conditions.targetDirection
  }

  private makeShift(now: number): void {
    this.targetDirection = this.meanDirection + Math.random() * SHIFT_INTENSITY - SHIFT_INTENSITY / 2
    this.nextShiftAt = now + this.shiftDelay()
  }

  private shiftDelay(): number {
    return (2 + Math.random() * 4) * 1_000
  }
}
