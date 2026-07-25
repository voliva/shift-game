import { Boat } from './Boat'
import type { Point, Tack } from './types'

export type RemoteBoatState = Point & { tack: Tack }

// How much effect per frame has on the actual movement. 0 -> current position, 1 -> distance to last update
const EFFECT = [40,1];
export class RemoteBoat extends Boat {
  private targetPosition: Point | undefined

  updateState(state: RemoteBoatState): void {
    this.targetPosition = { x: state.x, y: state.y }
    this.setTack(state.tack)
  }

  protected override updateSailing(movementX: number, movementY: number) {
    if (!this.targetPosition || !this.position) return super.updateSailing(movementX, movementY);

    const [c,v] = EFFECT;
    super.updateSailing(
      (c * movementX + v * (Math.trunc(this.targetPosition.x) - Math.trunc(this.position.x))) / (c+v),
      (c * movementY + v * (Math.trunc(this.targetPosition.y) - Math.trunc(this.position.y))) / (c+v)
    )
  }
}
