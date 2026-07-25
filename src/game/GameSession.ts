import { Boat } from './Boat'
import { CanvasRenderer } from './CanvasRenderer'
import { MinimapRenderer } from './MinimapRenderer'
import { Race } from './Race'
import type { RemoteBoatState } from './RemoteBoat'
import { RemoteBoat } from './RemoteBoat'
import { SimpleAiBoat } from './SimpleAiController'
import type { Tack } from './types'
import { get } from 'svelte/store'
import { language, messages } from '../i18n'

export type RankingEntry = {
  id: string
  name: string
  color: string
  gap: number
  rank: number
}

export type OnlineRaceSetup = {
  localPlayerId: string
  players: { id: string; name: string; color: string; startX: number; startY: number; startTack: Tack }[]
  deferRemoteBoats?: boolean
  onLocalBoatState?: (state: RemoteBoatState) => void
}

type OnlineRacePlayer = OnlineRaceSetup['players'][number]

export type GameSessionOptions = {
  onlineRace?: OnlineRaceSetup
  course?: { gateDistance: number; gatesToWin: number }
}

export class GameSession {
  readonly race;
  readonly localPlayer: Boat
  private readonly remoteBoats = new Map<string, RemoteBoat>()
  private readonly onlinePlayers = new Map<string, OnlineRacePlayer>()
  private readonly fieldRenderer: CanvasRenderer
  private readonly minimapRenderer: MinimapRenderer

  private lastTime = performance.now()
  private animationFrame = 0
  private paused = true
  private readonly onLocalBoatState: ((state: RemoteBoatState) => void) | undefined
  private lastBoatStateAt = 0

  constructor(
    gameCanvas: HTMLCanvasElement,
    minimapCanvas: HTMLCanvasElement,
    course: { gateDistance: number; gatesToWin: number },
    onlineRace?: OnlineRaceSetup
  ) {
    this.race = new Race(course.gateDistance, onlineRace ? course.gatesToWin : Number.POSITIVE_INFINITY);

    const gameContext = gameCanvas.getContext('2d')
    const minimapContext = minimapCanvas.getContext('2d')
    if (!gameContext || !minimapContext) throw new Error('Canvas 2D is not available')

    this.fieldRenderer = new CanvasRenderer(gameCanvas, gameContext)
    this.minimapRenderer = new MinimapRenderer(minimapCanvas, minimapContext)
    if (onlineRace) {
      this.onLocalBoatState = onlineRace.onLocalBoatState
      this.localPlayer = undefined as any;

      for (const player of onlineRace.players) {
        this.onlinePlayers.set(player.id, player)
        if (player.id === onlineRace.localPlayerId) {
          this.localPlayer = new Boat(player)
          this.localPlayer.placeInField(this.race, { x: player.startX, y: player.startY }, player.startTack);
          this.race.addBoat(this.localPlayer)
        } else if (!onlineRace.deferRemoteBoats) {
          const boat = new RemoteBoat(player)
          boat.placeInField(this.race, { x: player.startX, y: player.startY }, player.startTack)
          this.race.addBoat(boat)
          this.remoteBoats.set(player.id, boat)
        }
      }

      if (!this.localPlayer) {
        throw new Error("Missing local player in online setup")
      }
    } else {
      const localMessages = messages[get(language)]
      this.localPlayer = new Boat({
        id: 'local', name: localMessages.localPlayer, color: '#54d981'
      })
      this.localPlayer.placeInField(this.race, { x: -70, y: 0 }, 'starboard');
      this.race.addBoat(this.localPlayer)

      
      const aiBoat = new SimpleAiBoat({
        id: 'ai-boat', name: localMessages.aiPlayer, color: '#f5b84b'
      })
      aiBoat.placeInField(this.race, { x: -120, y: 0 }, 'starboard');
      this.race.addBoat(aiBoat)
    }
  }

  start(paused = false): void {
    this.paused = paused
    this.resize()
    window.addEventListener('resize', this.resize)
    this.lastTime = performance.now()
    this.animationFrame = requestAnimationFrame(this.frame)
  }

  resume(): void {
    this.paused = false
    this.lastTime = performance.now()
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrame)
    window.removeEventListener('resize', this.resize)
  }

  updateRemoteBoat(playerId: string, state: RemoteBoatState): void {
    let boat = this.remoteBoats.get(playerId)
    if (!boat) {
      const player = this.onlinePlayers.get(playerId)
      if (!player) return
      boat = new RemoteBoat(player)
      boat.placeInField(this.race, { x: state.x, y: state.y }, state.tack)
      this.race.addBoat(boat)
      this.remoteBoats.set(playerId, boat)
    }
    boat.updateState(state)
  }

  finishBoat(playerId: string): void {
    const boat = playerId === this.localPlayer.id ? this.localPlayer : this.remoteBoats.get(playerId)
    boat?.finish()
  }

  // After the race has already started
  addRemotePlayer(player: OnlineRacePlayer) {
    this.onlinePlayers.set(player.id, player)
  }

  removeRemotePlayer(playerId: string) {
    this.onlinePlayers.delete(playerId)
    this.remoteBoats.delete(playerId)
    this.race.removeBoat(playerId)
  }

  private frame = (now: number): void => {
    const deltaSeconds = Math.min((now - this.lastTime) / 1_000, 0.05)
    this.lastTime = now
    if (!this.paused) {
      this.race.update(deltaSeconds, now)
      for (const boat of this.race.boats) boat.update(deltaSeconds, now)
      if (this.onLocalBoatState && this.localPlayer.position && now - this.lastBoatStateAt >= 100) {
        this.lastBoatStateAt = now
        this.onLocalBoatState({ ...this.localPlayer.position, tack: this.localPlayer.currentTack })
      }
    }

    this.fieldRenderer.render(this.race.boats, this.localPlayer, this.race)
    this.minimapRenderer.render(this.race.boats, this.localPlayer, this.race, messages[get(language)].course)
    this.animationFrame = requestAnimationFrame(this.frame)
  }

  private resize = (): void => {
    this.fieldRenderer.resize()
    this.minimapRenderer.resize()
  }
}
