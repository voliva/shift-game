export type Player = {
  id: string
  name: string
  isAdmin?: boolean
  color?: string
  start?: { x: number; y: number }
  tack?: 'port' | 'starboard'
}

export type RoomSummary = {
  id: string
  name: string
  status: 'waiting' | 'ongoing'
  players: Player[]
  gateDistance: number
  gatesToWin: number
}

export type Room = RoomSummary & { password: string }
