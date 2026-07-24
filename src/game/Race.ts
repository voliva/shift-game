import { Boat } from './Boat'
import { Wind } from './Wind'

export class Race {
  readonly wind = new Wind()
  readonly boats: Boat[] = []

  addBoat(boat: Boat): void {
    this.boats.push(boat)
  }

  updateWind(now: number, deltaSeconds: number): void {
    this.wind.update(now, deltaSeconds)
  }

  forceWindShift(now: number): void {
    this.wind.forceShift(now)
  }
}
