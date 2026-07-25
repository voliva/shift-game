import { DOOR_WIDTH, LAYLINE_LENGTH } from './constants'
import type { Boat } from './Boat'
import type { Point } from './types'

type Viewport = { width: number; height: number; pixelRatio: number }

export class CanvasRenderer {
  private viewport: Viewport = { width: 0, height: 0, pixelRatio: 1 }
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    this.canvas = canvas
    this.context = context
  }

  resize(): void {
    this.viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    }
    this.canvas.width = Math.round(this.viewport.width * this.viewport.pixelRatio)
    this.canvas.height = Math.round(this.viewport.height * this.viewport.pixelRatio)
    this.context.setTransform(this.viewport.pixelRatio, 0, 0, this.viewport.pixelRatio, 0, 0)
  }

  render(boats: Boat[], camera: Boat, windDirection: number, meanWindDirection: number, gateDistance: number): void {
    this.context.clearRect(0, 0, this.viewport.width, this.viewport.height)
    this.context.fillStyle = '#1295d8'
    this.context.fillRect(0, 0, this.viewport.width, this.viewport.height)
    this.drawLaylines(camera, meanWindDirection, gateDistance)
    this.drawTrails(boats, camera)
    this.drawDoors(camera, gateDistance)
    for (const boat of boats) this.drawBoat(boat, camera, windDirection)
  }

  private worldToScreen(point: Point, camera: Boat): Point {
    return {
      x: this.viewport.width / 2 + point.x - camera.position.x,
      y: this.viewport.height / 2 - point.y + camera.position.y,
    }
  }

  private drawTrails(boats: Boat[], camera: Boat): void {
    for (const boat of boats) {
      if (boat.trail.length < 2) continue
      this.context.beginPath()
      boat.trail.forEach((point, index) => {
        const screen = this.worldToScreen(point, camera)
        if (index === 0) this.context.moveTo(screen.x, screen.y)
        else this.context.lineTo(screen.x, screen.y)
      })
      this.context.strokeStyle = boat.outlineColor
      this.context.globalAlpha = 0.55
      this.context.lineWidth = 2
      this.context.lineCap = 'round'
      this.context.lineJoin = 'round'
      this.context.stroke()
      this.context.globalAlpha = 1
    }
  }

  private drawBoat(boat: Boat, camera: Boat, windDirection: number): void {
    const screen = this.worldToScreen(boat.position, camera)
    this.context.save()
    this.context.translate(screen.x, screen.y)
    this.context.rotate(boat.visualCourse(windDirection))
    this.context.beginPath()
    this.context.moveTo(0, -25)
    this.context.lineTo(11, 18)
    this.context.lineTo(0, 24)
    this.context.lineTo(-11, 18)
    this.context.closePath()
    this.context.fillStyle = boat.color
    this.context.fill()
    this.context.lineWidth = 2
    this.context.strokeStyle = boat.outlineColor
    this.context.stroke()
    this.context.beginPath()
    this.context.moveTo(0, -20)
    this.context.lineTo(0, 5)
    this.context.lineTo(12, 3)
    this.context.closePath()
    this.context.fillStyle = '#f4fff7'
    this.context.fill()
    this.context.stroke()
    this.context.restore()
  }

  private drawDoors(camera: Boat, gateDistance: number): void {
    const currentDoorY = Math.floor(camera.position.y / gateDistance) * gateDistance
    for (const doorY of [currentDoorY, currentDoorY + gateDistance]) {
      const left = this.worldToScreen({ x: -DOOR_WIDTH / 2, y: doorY }, camera)
      const right = this.worldToScreen({ x: DOOR_WIDTH / 2, y: doorY }, camera)
      this.context.strokeStyle = 'rgba(255, 127, 10, 0.55)'
      this.context.lineWidth = 3
      this.context.beginPath()
      this.context.moveTo(left.x, left.y)
      this.context.lineTo(right.x, right.y)
      this.context.stroke()
      this.context.fillStyle = this.context.strokeStyle
      this.context.beginPath()
      this.context.arc(left.x, left.y, 6, 0, Math.PI * 2)
      this.context.arc(right.x, right.y, 6, 0, Math.PI * 2)
      this.context.fill()
    }
  }

  private drawLaylines(camera: Boat, meanWindDirection: number, gateDistance: number): void {
    const currentDoorY = Math.floor(camera.position.y / gateDistance) * gateDistance
    const windRadians = (meanWindDirection * Math.PI) / 180
    const laylines = [
      { x: -DOOR_WIDTH / 2, heading: windRadians + Math.PI / 4 },
      { x: DOOR_WIDTH / 2, heading: windRadians - Math.PI / 4 },
    ]
    this.context.strokeStyle = 'rgba(220, 45, 45, 0.65)'
    this.context.lineWidth = 2
    this.context.setLineDash([8, 8])
    this.context.beginPath()
    for (const gateY of [currentDoorY, currentDoorY + gateDistance]) {
      for (const layline of laylines) {
        const start = this.worldToScreen({ x: layline.x, y: gateY }, camera)
        const end = this.worldToScreen({
          x: layline.x - Math.sin(layline.heading) * LAYLINE_LENGTH,
          y: gateY - Math.cos(layline.heading) * LAYLINE_LENGTH,
        }, camera)
        this.context.moveTo(start.x, start.y)
        this.context.lineTo(end.x, end.y)
      }
    }
    this.context.stroke()
    this.context.setLineDash([])
  }
}
