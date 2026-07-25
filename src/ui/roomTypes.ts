export type Player = {
  id: string
  name: string
  isAdmin?: boolean
  color?: string
  start?: { x: number; y: number }
  tack?: 'port' | 'starboard'
  finishedRank?: number
}

export type RoomSummary = {
  id: string
  name: string
  status: 'waiting' | 'ongoing'
  players: Player[]
  finishedPlayers: { id: string; name: string; color: string; rank: number }[]
  gateDistance: number
  gatesToWin: number
}

export type Room = RoomSummary & { password: string }
