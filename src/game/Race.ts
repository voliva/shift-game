import { Boat } from './Boat'
import { Wind, type WindConditions } from './Wind'

export class Race {
  readonly wind = new Wind()
  readonly boats: Boat[] = []

  addBoat(boat: Boat): void {
    this.boats.push(boat)
  }

  removeBoat(id: string): void {
    const index = this.boats.findIndex((boat) => boat.id === id)
    if (index >= 0) this.boats.splice(index, 1)
  }

  updateWind(now: number, deltaSeconds: number): void {
    this.wind.update(now, deltaSeconds)
  }

  forceWindShift(now: number): void {
    this.wind.forceShift(now)
  }

  setWindConditions(conditions: WindConditions): void {
    this.wind.setConditions(conditions)
  }
}
