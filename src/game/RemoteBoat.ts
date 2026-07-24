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

  protected override adjustMovement(movement: Point): Point {
    if (!this.targetPosition) return movement

    const [c,v] = EFFECT;
    return {
      x: (c * movement.x + v * (Math.trunc(this.targetPosition.x) - Math.trunc(this.position.x))) / (c+v),
      y: (c * movement.y + v * (Math.trunc(this.targetPosition.y) - Math.trunc(this.position.y))) / (c+v),
    }
  }
}
