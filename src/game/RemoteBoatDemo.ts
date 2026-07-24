import { Boat } from './Boat'
import { RemoteBoat } from './RemoteBoat'

export class RemoteBoatDemo {
  private messageCount = 0
  private readonly source: Boat
  private readonly replica: RemoteBoat

  constructor(source: Boat, replica: RemoteBoat) {
    this.source = source
    this.replica = replica
    window.setInterval(() => this.sendState(), 200)
  }

  update(deltaSeconds: number, windDirection: number): void {
    this.source.update(deltaSeconds, windDirection)
  }

  private sendState(): void {
    this.messageCount += 1
    if (Math.random() < 0.05) this.source.tack()
    this.replica.updateState({
      x: this.source.position.x + Math.random() * 20 - 10,
      y: this.source.position.y + Math.random() * 20 - 10,
      tack: this.source.currentTack,
    })
  }
}
