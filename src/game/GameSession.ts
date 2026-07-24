import { Boat } from './Boat'
import { CanvasRenderer } from './CanvasRenderer'
import { MinimapRenderer } from './MinimapRenderer'
import { Race } from './Race'
import { RemoteBoat } from './RemoteBoat'
import { RemoteBoatDemo } from './RemoteBoatDemo'
import { SimpleAiController } from './SimpleAiController'

export type RankingEntry = {
  id: string
  name: string
  color: string
  gap: number
  rank: number
}

export class GameSession {
  private readonly race = new Race()
  private readonly playerOne = new Boat({
    id: 'player-one', name: 'Player One', color: '#54d981', outlineColor: '#0c4b32', start: { x: -70, y: 0 }, tack: 'starboard',
  })
  private readonly playerTwo = new RemoteBoat({
    id: 'player-two', name: 'Remote Demo', color: '#a78bfa', outlineColor: '#4c1d95', start: { x: 70, y: 0 }, tack: 'port',
  })
  private readonly aiBoat = new Boat({
    id: 'ai-boat', name: 'Navigator AI', color: '#f5b84b', outlineColor: '#8a4b08', start: { x: 0, y: -120 }, tack: 'starboard',
  })
  private readonly remoteSource = new Boat({
    id: 'demo-remote-source', name: 'Remote Demo Source', color: '#a78bfa', outlineColor: '#4c1d95', start: { x: 70, y: 0 }, tack: 'port',
  })
  private readonly fieldRenderer: CanvasRenderer
  private readonly minimapRenderer: MinimapRenderer
  private readonly aiController = new SimpleAiController(this.aiBoat)
  private readonly remoteAiController = new SimpleAiController(this.remoteSource)
  private readonly remoteBoatDemo: RemoteBoatDemo
  private readonly onRankingChange: (ranking: RankingEntry[]) => void
  private lastTime = performance.now()
  private lastRankingUpdate = 0
  private animationFrame = 0
  private paused = false

  constructor(
    gameCanvas: HTMLCanvasElement,
    minimapCanvas: HTMLCanvasElement,
    onRankingChange: (ranking: RankingEntry[]) => void,
  ) {
    const gameContext = gameCanvas.getContext('2d')
    const minimapContext = minimapCanvas.getContext('2d')
    if (!gameContext || !minimapContext) throw new Error('Canvas 2D is not available')

    this.fieldRenderer = new CanvasRenderer(gameCanvas, gameContext)
    this.minimapRenderer = new MinimapRenderer(minimapCanvas, minimapContext)
    this.onRankingChange = onRankingChange
    this.race.addBoat(this.playerOne)
    this.race.addBoat(this.playerTwo)
    this.race.addBoat(this.aiBoat)
    this.remoteBoatDemo = new RemoteBoatDemo(this.remoteSource, this.playerTwo)
  }

  start(paused = false): void {
    this.paused = paused
    this.resize()
    window.addEventListener('resize', this.resize)
    window.addEventListener('keydown', this.handleKeydown)
    this.animationFrame = requestAnimationFrame(this.frame)
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrame)
    this.remoteBoatDemo.destroy()
    window.removeEventListener('resize', this.resize)
    window.removeEventListener('keydown', this.handleKeydown)
  }

  tackPlayer(): void {
    if (this.paused) return
    this.playerOne.tack()
  }

  resume(): void {
    this.paused = false
    this.lastTime = performance.now()
  }

  private frame = (now: number): void => {
    const deltaSeconds = Math.min((now - this.lastTime) / 1_000, 0.05)
    this.lastTime = now
    if (!this.paused) {
      this.race.updateWind(now, deltaSeconds)
      this.remoteBoatDemo.update(deltaSeconds, this.race.wind.direction)
      this.aiController.update(now, this.race.wind.direction, this.race.wind.meanDirection)
      this.remoteAiController.update(now, this.race.wind.direction, this.race.wind.meanDirection)
      for (const boat of this.race.boats) boat.update(deltaSeconds, this.race.wind.direction)
    }

    this.fieldRenderer.render(this.race.boats, this.playerOne, this.race.wind.direction, this.race.wind.meanDirection)
    this.minimapRenderer.render(this.race.boats)
    if (now - this.lastRankingUpdate >= 100) this.publishRanking(now)
    this.animationFrame = requestAnimationFrame(this.frame)
  }

  private resize = (): void => {
    this.fieldRenderer.resize()
    this.minimapRenderer.resize()
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (this.paused || event.repeat) return
    if (event.code === 'Space') {
      event.preventDefault()
      this.tackPlayer()
    }
    if (event.code === 'KeyW') this.race.forceWindShift(performance.now())
  }

  private publishRanking(now: number): void {
    this.lastRankingUpdate = now
    const ranked = [...this.race.boats].sort((first, second) => second.position.y - first.position.y)
    const leader = ranked[0]
    this.onRankingChange(ranked.map((boat, index) => ({
      id: boat.id,
      name: boat.name,
      color: boat.color,
      gap: leader.position.y - boat.position.y,
      rank: index + 1,
    })))
  }
}
