import type { Boat } from './Boat'
import { DOOR_WIDTH } from './constants'

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

  render(boats: Boat[], gateDistance: number): void {
    this.context.clearRect(0, 0, this.width, this.height)
    const centerX = this.width / 2
    const startY = this.height - 26
    const finishY = 36
    const middleY = (startY + finishY) / 2
    const mapScale = Math.min((this.width - 24) / (gateDistance + DOOR_WIDTH), (startY - finishY) / gateDistance)
    const gateHalfWidth = (DOOR_WIDTH / 2) * mapScale
    const tunnelHalfWidth = (gateDistance / 2 + DOOR_WIDTH / 2) * mapScale

    this.context.save()
    this.context.globalAlpha = 0.8
    this.context.fillStyle = 'rgba(255, 255, 255, 0.86)'
    this.context.fillRect(0, 0, this.width, this.height)
    this.context.strokeStyle = 'rgba(4, 48, 78, 0.18)'
    this.context.strokeRect(0, 0, this.width, this.height)
    this.context.fillStyle = '#063d63'
    this.context.font = '600 12px system-ui, sans-serif'
    this.context.fillText('COURSE', 12, 19)
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
    for (const boat of boats) {
      const segmentStartY = boat.courseSegmentStart()
      const progress = Math.max(0, Math.min(1, (boat.position.y - segmentStartY) / gateDistance))
      const boatY = startY + (finishY - startY) * progress
      const boatX = centerX + Math.max(-tunnelHalfWidth, Math.min(tunnelHalfWidth, boat.position.x * mapScale))
      this.context.fillStyle = boat.color
      this.context.beginPath()
      this.context.arc(boatX, boatY, 5, 0, Math.PI * 2)
      this.context.fill()
    }
    this.context.restore()
  }
}
