import type { Boat } from './Boat'
import { DOOR_WIDTH } from './constants'
import type { Race } from './Race'

export class MinimapRenderer {
  private width = 0
  private height = 0
  private pixelRatio = 1
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    this.canvas = canvas
    this.context = context
  }

  resize(): void {
    this.width = this.canvas.clientWidth
    this.height = this.canvas.clientHeight
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(this.width * this.pixelRatio)
    this.canvas.height = Math.round(this.height * this.pixelRatio)
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
  }

  render(boats: Boat[], localBoat: Boat, race: Race, title: string): void {
    this.context.clearRect(0, 0, this.width, this.height)
    const centerX = this.width / 2
    const startY = this.height - 26
    const finishY = 36
    const middleY = (startY + finishY) / 2
    const mapScale = Math.min((this.width - 24) / (race.gateDistance + DOOR_WIDTH), (startY - finishY) / race.gateDistance)
    const gateHalfWidth = (DOOR_WIDTH / 2) * mapScale
    const tunnelHalfWidth = (race.gateDistance / 2 + DOOR_WIDTH / 2) * mapScale

    this.context.save()
    this.context.globalAlpha = 0.8
    this.context.fillStyle = 'rgba(255, 255, 255, 0.86)'
    this.context.fillRect(0, 0, this.width, this.height)
    this.context.strokeStyle = 'rgba(4, 48, 78, 0.18)'
    this.context.strokeRect(0, 0, this.width, this.height)
    this.context.fillStyle = '#063d63'
    this.context.font = '600 12px system-ui, sans-serif'
    this.context.fillText(title, 12, 19)
    this.context.strokeStyle = 'rgba(5, 61, 99, 0.42)'
    this.context.lineWidth = 2
    this.context.beginPath()
    this.context.moveTo(centerX - gateHalfWidth, startY)
    this.context.lineTo(centerX - tunnelHalfWidth, middleY)
    this.context.lineTo(centerX - gateHalfWidth, finishY)
    this.context.moveTo(centerX + gateHalfWidth, startY)
    this.context.lineTo(centerX + tunnelHalfWidth, middleY)
    this.context.lineTo(centerX + gateHalfWidth, finishY)
    this.context.stroke()
    this.context.strokeStyle = '#ff7f0a'
    this.context.lineWidth = 3
    this.context.beginPath()
    this.context.moveTo(centerX - gateHalfWidth, startY)
    this.context.lineTo(centerX + gateHalfWidth, startY)
    this.context.moveTo(centerX - gateHalfWidth, finishY)
    this.context.lineTo(centerX + gateHalfWidth, finishY)
    this.context.stroke()
    const localGate = this.gateIndex(localBoat, race)
    for (const boat of boats) {
      if (!boat.position) continue;
      if (boat !== localBoat && this.gateIndex(boat, race) !== localGate) continue

      const lapY = boat.position.y % race.gateDistance;
      const progress = lapY === 0 ? 1 : Math.max(0, Math.min(1, lapY / race.gateDistance));
      const boatY = startY + (finishY - startY) * progress
      const boatX = centerX + Math.max(-tunnelHalfWidth, Math.min(tunnelHalfWidth, boat.position.x * mapScale))
      this.context.fillStyle = boat.color
      this.context.beginPath()
      this.context.arc(boatX, boatY, 5, 0, Math.PI * 2)
      this.context.fill()
    }
    this.context.restore()
  }

  private gateIndex(boat: Boat, race: Race): number {
    if (!boat.position) return 0
    const gate = Math.floor(boat.position.y / race.gateDistance)
    return boat.isBeaming() ? gate - 1 : gate
  }
}
