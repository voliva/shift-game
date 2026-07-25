import { createServer, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { WebSocket, WebSocketServer } from 'ws'

type Player = {
  id: string
  name: string
  isAdmin: boolean
}

type Room = {
  id: string
  name: string
  password: string
  status: 'waiting' | 'ongoing'
  gateDistance: number
  gatesToWin: number
  players: Map<WebSocket, Player>
}

type PublicRoom = Omit<Room, 'password' | 'players'> & { players: Player[] }

const port = Number.parseInt(process.env.PORT ?? '8787', 10)
const rooms = new Map<string, Room>()
const websocketServer = new WebSocketServer({ noServer: true })

const httpServer = createServer((request, response) => {
  setCorsHeaders(response)
  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  if (request.method === 'GET' && url.pathname === '/api/rooms') {
    sendJson(response, 200, { rooms: [...rooms.values()].map(toPublicRoom) })
    return
  }
  sendJson(response, 404, { error: 'Not found' })
})

httpServer.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  if (url.pathname === '/ws/create') {
    const name = url.searchParams.get('name')?.trim()
    const password = url.searchParams.get('password')
    if (!name || !password) return rejectWebSocket(request, socket, head, 'Room name and password are required.')
    return websocketServer.handleUpgrade(request, socket, head, (connection) => {
      const room = createRoom(name, password)
      addPlayer(room, connection, url.searchParams.get('playerName')?.trim() || 'Host', true)
    })
  }

  if (url.pathname === '/ws/join') {
    const room = rooms.get(url.searchParams.get('roomId') ?? '')
    const password = url.searchParams.get('password')
    if (!room) return rejectWebSocket(request, socket, head, 'This room no longer exists.')
    if (password !== room.password) return rejectWebSocket(request, socket, head, 'Incorrect room password.')
    return websocketServer.handleUpgrade(request, socket, head, (connection) => {
      addPlayer(room, connection, url.searchParams.get('playerName')?.trim() || 'Sailor', false)
    })
  }

  rejectWebSocket(request, socket, head, 'WebSocket endpoint not found.')
})

httpServer.listen(port, () => {
  console.log(`Shift Game server listening on http://localhost:${port}`)
})

function createRoom(name: string, password: string): Room {
  const room: Room = {
    id: randomUUID(),
    name,
    password,
    status: 'waiting',
    gateDistance: 6_000,
    gatesToWin: 5,
    players: new Map(),
  }
  rooms.set(room.id, room)
  return room
}

function addPlayer(room: Room, connection: WebSocket, name: string, isAdmin: boolean): void {
  const player: Player = { id: randomUUID(), name, isAdmin }
  room.players.set(connection, player)
  connection.on('message', (data) => handleMessage(room, connection, data.toString()))
  connection.on('close', () => removePlayer(room, connection))
  send(connection, { type: 'joined', room: toPublicRoom(room), player })
  broadcastRoomState(room)
}

function handleMessage(room: Room, connection: WebSocket, rawMessage: string): void {
  let message: unknown
  try {
    message = JSON.parse(rawMessage)
  } catch {
    send(connection, { type: 'error', error: 'invalid JSON message' })
    return
  }

  if (isPingMessage(message)) {
    send(connection, { type: 'pong', clientTimestamp: message.clientTimestamp, serverTimestamp: Date.now() })
    return
  }

  const player = room.players.get(connection)
  if (!player) return
  if (isRenameMessage(message)) {
    player.name = message.name.trim().slice(0, 40) || player.name
    broadcastRoomState(room)
    return
  }

  if (isStartRaceMessage(message)) startRace(room, connection, player)
}

function isRenameMessage(message: unknown): message is { type: 'set-name'; name: string } {
  if (!message || typeof message !== 'object') return false
  const candidate = message as { type?: unknown; name?: unknown }
  return candidate.type === 'set-name' && typeof candidate.name === 'string'
}

function isPingMessage(message: unknown): message is { type: 'ping'; clientTimestamp: number } {
  if (!message || typeof message !== 'object') return false
  const candidate = message as { type?: unknown; clientTimestamp?: unknown }
  return candidate.type === 'ping' && typeof candidate.clientTimestamp === 'number'
}

function isStartRaceMessage(message: unknown): message is { type: 'start-race' } {
  return Boolean(message && typeof message === 'object' && (message as { type?: unknown }).type === 'start-race')
}

function startRace(room: Room, connection: WebSocket, player: Player): void {
  if (!player.isAdmin) {
    send(connection, { type: 'error', error: 'Only the host can start the race.' })
    return
  }
  if (room.players.size < 2) {
    send(connection, { type: 'error', error: 'At least two sailors are needed to start.' })
    return
  }
  if (room.status === 'ongoing') return

  room.status = 'ongoing'
  const startTimestamp = Date.now() + 3_000
  broadcastRoomState(room)
  broadcast(room, { type: 'race-start', startTimestamp })
}

function removePlayer(room: Room, connection: WebSocket): void {
  const departingPlayer = room.players.get(connection)
  room.players.delete(connection)
  if (room.players.size === 0) {
    rooms.delete(room.id)
    return
  }

  if (departingPlayer?.isAdmin) {
    const remainingPlayers = [...room.players.values()]
    const replacement = remainingPlayers[Math.floor(Math.random() * remainingPlayers.length)]
    for (const player of remainingPlayers) player.isAdmin = player.id === replacement.id
  }
  broadcastRoomState(room)
}

function broadcastRoomState(room: Room): void {
  broadcast(room, { type: 'room-state', room: toPublicRoom(room) })
}

function broadcast(room: Room, message: unknown): void {
  for (const connection of room.players.keys()) send(connection, message)
}

function toPublicRoom(room: Room): PublicRoom {
  return {
    id: room.id,
    name: room.name,
    status: room.status,
    gateDistance: room.gateDistance,
    gatesToWin: room.gatesToWin,
    players: [...room.players.values()],
  }
}

function send(connection: WebSocket, message: unknown): void {
  if (connection.readyState === WebSocket.OPEN) connection.send(JSON.stringify(message))
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

function setCorsHeaders(response: ServerResponse): void {
  response.setHeader('access-control-allow-origin', '*')
  response.setHeader('access-control-allow-methods', 'GET, OPTIONS')
}

function rejectWebSocket(request: import('node:http').IncomingMessage, socket: import('node:stream').Duplex, head: Buffer, error: string): void {
  websocketServer.handleUpgrade(request, socket, head, (connection) => {
    send(connection, { type: 'error', error })
    connection.close(1008, error)
  })
}
