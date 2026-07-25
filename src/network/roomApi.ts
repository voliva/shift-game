import type { Player, RoomSummary } from '../ui/roomTypes'
import type { WindConditions } from '../game/Wind'
import type { RemoteBoatState } from '../game/RemoteBoat'

type RoomMessage = { type: 'room-state'; room: RoomSummary }
type JoinedMessage = { type: 'joined'; room: RoomSummary; player: Player }
type PongMessage = { type: 'pong'; clientTimestamp: number; serverTimestamp: number }
type RaceStartMessage = { type: 'race-start'; startTimestamp: number }
type WindConditionsMessage = { type: 'wind-conditions' } & WindConditions
type BoatStateMessage = { type: 'boat-state'; playerId: string } & RemoteBoatState
type RaceFinishMessage = { type: 'race-finish'; playerId: string; rank: number }
type ServerMessage = RoomMessage | JoinedMessage | PongMessage | RaceStartMessage | WindConditionsMessage | BoatStateMessage | RaceFinishMessage | { type: 'error'; error: string }

const httpBaseUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8787'
const websocketBaseUrl = httpBaseUrl.replace(/^http/, 'ws')

export type RoomConnection = {
  socket: WebSocket
  room: RoomSummary
  player: Player
  getServerClockOffset: () => number
}

export async function fetchRooms(): Promise<RoomSummary[]> {
  const response = await fetch(`${httpBaseUrl}/api/rooms`)
  if (!response.ok) throw new Error('Could not fetch rooms')
  const payload = await response.json() as { rooms: RoomSummary[] }
  return payload.rooms
}

export function createRoom(
  name: string,
  password: string,
  playerName: string,
  handlers: Handlers
): Promise<RoomConnection> {
  const query = new URLSearchParams({ name, password, playerName })
  return connect(`/ws/create?${query}`, handlers)
}

export type Handlers = {
    onRoomState: (room: RoomSummary) => void,
    onRaceStart: (startTimestamp: number, getServerClockOffset: () => number) => void,
    onWindConditions: (conditions: WindConditions) => void,
    onBoatState: (playerId: string, state: RemoteBoatState) => void,
    onRaceFinish: (playerId: string, rank: number) => void,
  }
export function joinRoom(
  roomId: string,
  password: string,
  playerName: string,
  handlers: Handlers
): Promise<RoomConnection> {
  const query = new URLSearchParams({ roomId, password, playerName })
  return connect(`/ws/join?${query}`, handlers)
}

function connect(
  path: string,
  handlers: Handlers
): Promise<RoomConnection> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${websocketBaseUrl}${path}`)
    let connected = false
    let serverClockOffset = 0
    const getServerClockOffset = () => serverClockOffset
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'ping', clientTimestamp: Date.now() }))
    })
    socket.addEventListener('message', (event) => {
      const message = parseMessage(event.data)
      if (!message) return
      if (message.type === 'room-state') handlers.onRoomState(message.room)
      if (message.type === 'pong') {
        const roundTripTime = Date.now() - message.clientTimestamp
        serverClockOffset = message.serverTimestamp - (message.clientTimestamp + roundTripTime / 2)
      }
      if (message.type === 'race-start') handlers.onRaceStart(message.startTimestamp, getServerClockOffset)
      if (message.type === 'wind-conditions') handlers.onWindConditions(message)
      if (message.type === 'boat-state') handlers.onBoatState(message.playerId, message)
      if (message.type === 'race-finish') handlers.onRaceFinish(message.playerId, message.rank)
      if (message.type === 'joined') {
        connected = true
        resolve({ socket, room: message.room, player: message.player, getServerClockOffset })
      }
      if (message.type === 'error' && !connected) reject(new Error(message.error))
    })
    socket.addEventListener('error', () => {
      if (!connected) reject(new Error('Could not connect to the room server'))
    })
    socket.addEventListener('close', () => {
      if (!connected) reject(new Error('Room server rejected the connection'))
    })
  })
}

function parseMessage(data: unknown): ServerMessage | undefined {
  if (typeof data !== 'string') return undefined
  try {
    return JSON.parse(data) as ServerMessage
  } catch {
    return undefined
  }
}
