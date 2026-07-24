import type { Player, RoomSummary } from '../ui/roomTypes'

type RoomMessage = { type: 'room-state'; room: RoomSummary }
type JoinedMessage = { type: 'joined'; room: RoomSummary; player: Player }
type ServerMessage = RoomMessage | JoinedMessage | { type: 'error'; error: string }

const httpBaseUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8787'
const websocketBaseUrl = httpBaseUrl.replace(/^http/, 'ws')

export type RoomConnection = {
  socket: WebSocket
  room: RoomSummary
  player: Player
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
  onRoomState: (room: RoomSummary) => void,
): Promise<RoomConnection> {
  const query = new URLSearchParams({ name, password, playerName })
  return connect(`/ws/create?${query}`, onRoomState)
}

export function joinRoom(
  roomId: string,
  password: string,
  playerName: string,
  onRoomState: (room: RoomSummary) => void,
): Promise<RoomConnection> {
  const query = new URLSearchParams({ roomId, password, playerName })
  return connect(`/ws/join?${query}`, onRoomState)
}

function connect(path: string, onRoomState: (room: RoomSummary) => void): Promise<RoomConnection> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${websocketBaseUrl}${path}`)
    let connected = false
    socket.addEventListener('message', (event) => {
      const message = parseMessage(event.data)
      if (!message) return
      if (message.type === 'room-state') onRoomState(message.room)
      if (message.type === 'joined') {
        connected = true
        resolve({ socket, room: message.room, player: message.player })
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
