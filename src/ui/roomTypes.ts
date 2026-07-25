import type { Tack } from "../game/types"

export type Player = {
  id: string
  name: string
  isAdmin?: boolean
  color: string
  startX: number
  startTack: Tack
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
