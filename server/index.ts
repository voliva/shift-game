import { createServer, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { WebSocket, WebSocketServer } from 'ws'

type Player = {
  id: string
  name: string
  isAdmin: boolean
  color?: string
  start?: { x: number; y: number }
  tack?: 'port' | 'starboard'
  position?: { x: number; y: number }
  finishedRank?: number
}

type FinishedPlayer = {
  id: string
  name: string
  color: string
  rank: number
}

type Room = {
  id: string
  name: string
  password: string
  status: 'waiting' | 'ongoing'
  gateDistance: number
  gatesToWin: number
  wind: ServerWind
  players: Map<WebSocket, Player>
  finishedPlayers: FinishedPlayer[]
}

type WindConditions = {
  targetDirection: number
  meanDirection: number
}

type ServerWind = WindConditions & {
  deviationDirection: number
  nextShiftAt: number
  nextDeviationAt: number
}

type PublicPlayer = {
  id: string
  name: string
  isAdmin: boolean
  color: string
  startX: number
  startTack: 'port' | 'starboard'
  finishedRank?: number
}

type PublicRoom = Omit<Room, 'password' | 'players' | 'wind'> & { players: PublicPlayer[] }

const port = Number.parseInt(process.env.PORT ?? '8787', 10)
const rooms = new Map<string, Room>()
const websocketServer = new WebSocketServer({ noServer: true })
const SHIFT_INTENSITY = Math.PI / 4
const MAX_DEVIATION = Math.PI / 4
const BOAT_COLORS = ['#54d981', '#a78bfa', '#f5b84b', '#fb7185', '#38bdf8', '#f97316', '#e879f9', '#2dd4bf']
const LATE_JOIN_DISTANCE = 200
const GATE_DISTANCE_MULTIPLIER = 120 * Math.cos(Math.PI / 4)

setInterval(() => {
  const now = Date.now()
  for (const room of rooms.values()) updateRoomWind(room, now)
}, 100)

const httpServer = createServer((request, response) => {
  setCorsHeaders(response)
  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  if (request.method === 'GET' && url.pathname === '/api/rooms') {
    sendJson(response, 200, {
      rooms: [...rooms.values()]
        .filter((room) => room.finishedPlayers.length === 0)
        .map(toPublicRoom),
    })
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
  const now = Date.now()
  const room: Room = {
    id: randomUUID(),
    name,
    password,
    status: 'waiting',
    gateDistance: 60 * GATE_DISTANCE_MULTIPLIER,
    gatesToWin: 3,
    wind: createWind(now),
    players: new Map(),
    finishedPlayers: [],
  }
  rooms.set(room.id, room)
  return room
}

function addPlayer(room: Room, connection: WebSocket, name: string, isAdmin: boolean): void {
  const player: Player = { id: randomUUID(), name, isAdmin }
  const existingSailors = [...room.players.values()]
  if (room.status === 'ongoing') assignLateJoinState(player, existingSailors)
  room.players.set(connection, player)
  connection.on('message', (data) => handleMessage(room, connection, data.toString()))
  connection.on('close', () => removePlayer(room, connection))
  send(connection, { type: 'joined', room: toPublicRoom(room), player: toPublicPlayer(player) })
  sendWindConditions(connection, room.wind)
  if (room.status === 'ongoing') sendBoatStateSnapshots(connection, existingSailors)
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
  if (isRaceSettingsMessage(message)) updateRaceSettings(room, player, message)
  if (isBoatStateMessage(message)) broadcastBoatState(room, connection, player, message)
  if (isRaceFinishMessage(message)) finishRace(room, player)
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

function isBoatStateMessage(message: unknown): message is { type: 'boat-state'; x: number; y: number; tack: 'port' | 'starboard' } {
  if (!message || typeof message !== 'object') return false
  const candidate = message as { type?: unknown; x?: unknown; y?: unknown; tack?: unknown }
  return candidate.type === 'boat-state' && Number.isFinite(candidate.x) && Number.isFinite(candidate.y) && (candidate.tack === 'port' || candidate.tack === 'starboard')
}

function isRaceSettingsMessage(message: unknown): message is { type: 'race-settings'; gateDistance: number; gatesToWin: number } {
  if (!message || typeof message !== 'object') return false
  const candidate = message as { type?: unknown; gateDistance?: unknown; gatesToWin?: unknown }
  return candidate.type === 'race-settings' && Number.isFinite(candidate.gateDistance) && Number.isFinite(candidate.gatesToWin)
}

function isRaceFinishMessage(message: unknown): message is { type: 'race-finish' } {
  return Boolean(message && typeof message === 'object' && (message as { type?: unknown }).type === 'race-finish')
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

  assignBoatColors(room)
  assignStartingPositions(room)
  room.status = 'ongoing'
  const startTimestamp = Date.now() + 3_000
  broadcastRoomState(room)
  broadcast(room, { type: 'race-start', startTimestamp })
}

function updateRaceSettings(
  room: Room,
  player: Player,
  settings: { gateDistance: number; gatesToWin: number },
): void {
  if (!player.isAdmin || room.status !== 'waiting') return
  room.gateDistance = Math.max(GATE_DISTANCE_MULTIPLIER, Math.round(settings.gateDistance))
  room.gatesToWin = Math.max(1, Math.round(settings.gatesToWin))
  broadcastRoomState(room)
}

function finishRace(room: Room, player: Player): void {
  if (room.status !== 'ongoing' || player.finishedRank) return
  player.finishedRank = room.finishedPlayers.length + 1
  room.finishedPlayers.push({
    id: player.id,
    name: player.name,
    color: player.color ?? '#54d981',
    rank: player.finishedRank,
  })
  broadcastRoomState(room)
  broadcast(room, { type: 'race-finish', playerId: player.id, rank: player.finishedRank })
}

function assignBoatColors(room: Room): void {
  const colors = [...BOAT_COLORS].sort(() => Math.random() - 0.5)
  let index = 0
  for (const sailor of room.players.values()) {
    sailor.color = colors[index % colors.length]
    index += 1
  }
}

function assignLateJoinState(player: Player, sailors: Player[]): void {
  const usedColors = new Set(sailors.map((sailor) => sailor.color).filter((color): color is string => Boolean(color)))
  const availableColors = BOAT_COLORS.filter((color) => !usedColors.has(color))
  const colors = availableColors.length > 0 ? availableColors : BOAT_COLORS
  player.color = colors[Math.floor(Math.random() * colors.length)]
  player.tack = Math.random() < 0.5 ? 'port' : 'starboard'

  const positions = sailors.map((sailor) => sailor.position ?? sailor.start ?? { x: 0, y: 0 })
  if (positions.length === 1) {
    player.start = { x: positions[0].x, y: positions[0].y - LATE_JOIN_DISTANCE }
    return
  }
  const first = positions.reduce((leader, position) => position.y > leader.y ? position : leader)
  const last = positions.reduce((trailer, position) => position.y < trailer.y ? position : trailer)
  const progress = 0.75
  player.start = {
    x: first.x + (last.x - first.x) * progress,
    y: first.y + (last.y - first.y) * progress,
  }
}

function assignStartingPositions(room: Room): void {
  const sailors = [...room.players.values()]
  sailors.forEach((sailor, index) => {
    sailor.start = { x: (index - (sailors.length - 1) / 2) * 100, y: 0 }
    sailor.tack = Math.random() < 0.5 ? 'port' : 'starboard'
  })
}

function broadcastBoatState(
  room: Room,
  sender: WebSocket,
  player: Player,
  state: { x: number; y: number; tack: 'port' | 'starboard' },
): void {
  if (room.status !== 'ongoing') return
  player.position = { x: state.x, y: state.y }
  const message = { type: 'boat-state', playerId: player.id, x: state.x, y: state.y, tack: state.tack }
  for (const connection of room.players.keys()) {
    if (connection !== sender) send(connection, message)
  }
}

function sendBoatStateSnapshots(connection: WebSocket, sailors: Player[]): void {
  for (const sailor of sailors) {
    const position = sailor.position ?? sailor.start
    if (!position || !sailor.tack) continue
    send(connection, { type: 'boat-state', playerId: sailor.id, x: position.x, y: position.y, tack: sailor.tack })
  }
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

function createWind(now: number): ServerWind {
  const meanDirection = Math.random() * MAX_DEVIATION - MAX_DEVIATION / 2
  return {
    meanDirection,
    targetDirection: 0,
    deviationDirection: Math.random() < 0.5 ? -1 : 1,
    nextShiftAt: now + shiftDelay(),
    nextDeviationAt: now + 10_000,
  }
}

function updateRoomWind(room: Room, now: number): void {
  const wind = room.wind
  while (now >= wind.nextDeviationAt) {
    wind.meanDirection += wind.deviationDirection
    if (Math.abs(wind.meanDirection) >= MAX_DEVIATION / 2) wind.deviationDirection *= -1
    wind.nextDeviationAt += 10_000
  }
  if (now < wind.nextShiftAt) return

  wind.targetDirection = wind.meanDirection + Math.random() * SHIFT_INTENSITY - SHIFT_INTENSITY / 2
  wind.nextShiftAt = now + shiftDelay()
  broadcast(room, { type: 'wind-conditions', ...toWindConditions(wind) })
}

function shiftDelay(): number {
  return (2 + Math.random() * 4) * 1_000
}

function toWindConditions(wind: ServerWind): WindConditions {
  return { targetDirection: wind.targetDirection, meanDirection: wind.meanDirection }
}

function sendWindConditions(connection: WebSocket, wind: ServerWind): void {
  send(connection, { type: 'wind-conditions', ...toWindConditions(wind) })
}

function toPublicRoom(room: Room): PublicRoom {
  return {
    id: room.id,
    name: room.name,
    status: room.status,
    gateDistance: room.gateDistance,
    gatesToWin: room.gatesToWin,
    players: [...room.players.values()].map(toPublicPlayer),
    finishedPlayers: room.finishedPlayers,
  }
}

function toPublicPlayer(player: Player): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    isAdmin: player.isAdmin,
    color: player.color ?? '#54d981',
    startX: player.start?.x ?? 0,
    startTack: player.tack ?? 'starboard',
    finishedRank: player.finishedRank,
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
