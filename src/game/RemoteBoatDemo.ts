import { Boat } from './Boat'
import { RemoteBoat } from './RemoteBoat'

export class RemoteBoatDemo {
  private messageCount = 0
  private readonly source: Boat
  private readonly replica: RemoteBoat
  private readonly timer: number

  constructor(source: Boat, replica: RemoteBoat) {
    this.source = source
    this.replica = replica
    this.timer = window.setInterval(() => this.sendState(), 200)
  }

  update(deltaSeconds: number, windDirection: number): void {
    this.source.update(deltaSeconds, windDirection)
  }

  destroy(): void {
    window.clearInterval(this.timer)
  }

  private sendState(): void {
    this.messageCount += 1
    this.replica.updateState({
      x: this.source.position.x + Math.random() * 20 - 10,
      y: this.source.position.y + Math.random() * 20 - 10,
      tack: this.source.currentTack,
    })
  }
}
