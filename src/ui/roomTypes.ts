export type Player = { id: string; name: string; isAdmin?: boolean }

export type Room = {
  id: string
  name: string
  password: string
  status: 'waiting' | 'ongoing'
  players: Player[]
  gateDistance: number
  gatesToWin: number
}
