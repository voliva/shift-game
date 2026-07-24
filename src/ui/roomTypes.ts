export type Player = { id: string; name: string; isAdmin?: boolean }

export type RoomSummary = {
  id: string
  name: string
  status: 'waiting' | 'ongoing'
  players: Player[]
  gateDistance: number
  gatesToWin: number
}

export type Room = RoomSummary & { password: string }
