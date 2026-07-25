import { Boat } from './Boat'
import { Wind, type WindConditions } from './Wind'

export class Race {
  readonly gateDistance: number
  readonly gatesToWin: number
  readonly wind = new Wind()
  readonly boats: Boat[] = []

  constructor(
    gateDistance: number,
    gatesToWin: number
  ) {
    this.gateDistance = gateDistance;
    this.gatesToWin = gatesToWin;
  }

  addBoat(boat: Boat): void {
    this.boats.push(boat)
  }

  removeBoat(id: string): void {
    const index = this.boats.findIndex((boat) => boat.id === id)
    if (index >= 0) this.boats.splice(index, 1)
  }

  update(deltaSeconds: number, now: number): void {
    this.wind.update(deltaSeconds, now)
  }

  forceWindShift(now: number): void {
    this.wind.forceShift(now)
  }

  setWindConditions(conditions: WindConditions): void {
    this.wind.setConditions(conditions)
  }
}
