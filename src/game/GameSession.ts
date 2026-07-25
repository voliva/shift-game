import { Boat } from './Boat'
import { CanvasRenderer } from './CanvasRenderer'
import { MinimapRenderer } from './MinimapRenderer'
import { Race } from './Race'
import { RemoteBoat } from './RemoteBoat'
import { RemoteBoatDemo } from './RemoteBoatDemo'
import { SimpleAiController } from './SimpleAiController'
import type { WindConditions } from './Wind'
import type { RemoteBoatState } from './RemoteBoat'
import type { Tack } from './types'

export type RankingEntry = {
  id: string
  name: string
  color: string
  gap: number
  rank: number
}

export type OnlineRaceSetup = {
  localPlayerId: string
  players: { id: string; name: string; color: string; start?: { x: number; y: number }; tack?: Tack }[]
  onLocalBoatState: (state: RemoteBoatState) => void
}

type OnlineRacePlayer = OnlineRaceSetup['players'][number]

export type GameSessionOptions = {
  initialWindConditions?: WindConditions
  onlineRace?: OnlineRaceSetup
  course?: { gateDistance: number; gatesToWin: number }
  onLocalBoatFinish?: () => void
}

export class GameSession {
  private readonly race = new Race()
  private readonly playerOne: Boat
  private readonly remoteBoats = new Map<string, RemoteBoat>()
  private readonly fieldRenderer: CanvasRenderer
  private readonly minimapRenderer: MinimapRenderer
  private readonly aiController: SimpleAiController | undefined
  private readonly remoteAiController: SimpleAiController | undefined
  private readonly remoteBoatDemo: RemoteBoatDemo | undefined
  private readonly onLocalBoatState: ((state: RemoteBoatState) => void) | undefined
  private readonly onlineLocalPlayerId: string | undefined
  private readonly course: { gateDistance: number; gatesToWin: number }
  private readonly onLocalBoatFinish: (() => void) | undefined
  private readonly onRankingChange: (ranking: RankingEntry[]) => void
  private lastTime = performance.now()
  private lastRankingUpdate = 0
  private lastBoatStateUpdate = 0
  private animationFrame = 0
  private paused = false

  constructor(
    gameCanvas: HTMLCanvasElement,
    minimapCanvas: HTMLCanvasElement,
    onRankingChange: (ranking: RankingEntry[]) => void,
    options: GameSessionOptions = {},
  ) {
    const gameContext = gameCanvas.getContext('2d')
    const minimapContext = minimapCanvas.getContext('2d')
    if (!gameContext || !minimapContext) throw new Error('Canvas 2D is not available')

    this.fieldRenderer = new CanvasRenderer(gameCanvas, gameContext)
    this.minimapRenderer = new MinimapRenderer(minimapCanvas, minimapContext)
    this.onRankingChange = onRankingChange
    this.course = options.course ?? { gateDistance: 6_000, gatesToWin: 5 }
    this.onLocalBoatFinish = options.onLocalBoatFinish
    if (options.initialWindConditions) this.race.setWindConditions(options.initialWindConditions)
    this.onLocalBoatState = options.onlineRace?.onLocalBoatState
    if (options.onlineRace) {
      this.onlineLocalPlayerId = options.onlineRace.localPlayerId
      const localPlayer = options.onlineRace.players.find((player) => player.id === options.onlineRace!.localPlayerId)
      this.playerOne = this.createBoat(localPlayer ?? { id: options.onlineRace.localPlayerId, name: 'You', color: '#54d981' }, 0)
      this.race.addBoat(this.playerOne)
      for (const player of options.onlineRace.players) {
        if (player.id === this.playerOne.id) continue
        this.addRemoteBoat(player)
      }
      return
    }

    this.playerOne = new Boat({
      id: 'player-one', name: 'Player One', color: '#54d981', outlineColor: '#0c4b32', start: { x: -70, y: 0 }, tack: 'starboard',
    })
    const playerTwo = new RemoteBoat({
      id: 'player-two', name: 'Remote Demo', color: '#a78bfa', outlineColor: '#4c1d95', start: { x: 70, y: 0 }, tack: 'port',
    })
    const aiBoat = new Boat({
      id: 'ai-boat', name: 'Navigator AI', color: '#f5b84b', outlineColor: '#8a4b08', start: { x: 0, y: -120 }, tack: 'starboard',
    })
    const remoteSource = new Boat({
      id: 'demo-remote-source', name: 'Remote Demo Source', color: '#a78bfa', outlineColor: '#4c1d95', start: { x: 70, y: 0 }, tack: 'port',
    })
    this.race.addBoat(this.playerOne)
    this.race.addBoat(playerTwo)
    this.race.addBoat(aiBoat)
    this.aiController = new SimpleAiController(aiBoat)
    this.remoteAiController = new SimpleAiController(remoteSource)
    this.remoteBoatDemo = new RemoteBoatDemo(remoteSource, playerTwo)
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
    this.remoteBoatDemo?.destroy()
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

  setWindConditions(conditions: WindConditions): void {
    this.race.setWindConditions(conditions)
  }

  updateRemoteBoat(playerId: string, state: RemoteBoatState): void {
    this.remoteBoats.get(playerId)?.updateState(state)
  }

  finishBoat(playerId: string): void {
    const boat = playerId === this.playerOne.id ? this.playerOne : this.remoteBoats.get(playerId)
    boat?.finish()
  }

  syncOnlinePlayers(players: OnlineRacePlayer[]): void {
    if (!this.onlineLocalPlayerId) return
    const playerIds = new Set(players.map((player) => player.id))
    for (const playerId of this.remoteBoats.keys()) {
      if (playerIds.has(playerId)) continue
      this.remoteBoats.delete(playerId)
      this.race.removeBoat(playerId)
    }
    for (const player of players) {
      if (player.id === this.onlineLocalPlayerId || this.remoteBoats.has(player.id)) continue
      this.addRemoteBoat(player)
    }
  }

  private frame = (now: number): void => {
    const deltaSeconds = Math.min((now - this.lastTime) / 1_000, 0.05)
    this.lastTime = now
    if (!this.paused) {
      this.race.updateWind(now, deltaSeconds)
      this.remoteBoatDemo?.update(deltaSeconds, this.race.wind.direction)
      this.aiController?.update(now, this.race.wind.direction, this.race.wind.meanDirection)
      this.remoteAiController?.update(now, this.race.wind.direction, this.race.wind.meanDirection)
      for (const boat of this.race.boats) boat.update(deltaSeconds, this.race.wind.direction)
      if (!this.playerOne.isFinished && this.playerOne.hasFinishedCourse()) {
        this.playerOne.finish()
        this.onLocalBoatFinish?.()
      }
      if (this.onLocalBoatState && now - this.lastBoatStateUpdate >= 100) {
        this.lastBoatStateUpdate = now
        this.onLocalBoatState({ ...this.playerOne.position, tack: this.playerOne.currentTack })
      }
    }

    this.fieldRenderer.render(this.race.boats, this.playerOne, this.race.wind.direction, this.race.wind.meanDirection, this.course.gateDistance)
    this.minimapRenderer.render(this.race.boats, this.course.gateDistance)
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

  private createBoat(player: { id: string; name: string; color: string; start?: { x: number; y: number }; tack?: Tack }, index: number): Boat {
    return new Boat({ ...this.boatOptions(player, index), tack: player.tack ?? 'starboard' })
  }

  private addRemoteBoat(player: OnlineRacePlayer): void {
    const boat = new RemoteBoat({ ...this.boatOptions(player, this.remoteBoats.size + 1), tack: player.tack ?? 'starboard' })
    this.remoteBoats.set(player.id, boat)
    this.race.addBoat(boat)
  }

  private boatOptions(player: { id: string; name: string; color: string; start?: { x: number; y: number } }, index: number): { id: string; name: string; color: string; outlineColor: string; start: { x: number; y: number }; gateDistance: number; gatesToWin: number } {
    return {
      id: player.id,
      name: player.name,
      color: player.color,
      outlineColor: '#082f49',
      start: player.start ?? { x: (index - 1) * 70, y: 0 },
      gateDistance: this.course.gateDistance,
      gatesToWin: this.course.gatesToWin,
    }
  }
}
