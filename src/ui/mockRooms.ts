import type { Room } from './roomTypes'

export function getMockRooms(): Room[] {
  return [
    {
      id: 'harbor-cup', name: 'Harbor Cup', password: 'sail', status: 'waiting',
      players: [{ id: 'marta', name: 'Marta', isAdmin: true }], gateDistance: 6_000, gatesToWin: 5,
    },
    {
      id: 'night-shift', name: 'Night Shift', password: 'wind', status: 'ongoing',
      players: [{ id: 'jules', name: 'Jules', isAdmin: true }, { id: 'sam', name: 'Sam' }, { id: 'ana', name: 'Ana' }],
      gateDistance: 4_000, gatesToWin: 8,
    },
    {
      id: 'lazy-sunday', name: 'Lazy Sunday', password: 'sea', status: 'waiting',
      players: [{ id: 'leo', name: 'Leo', isAdmin: true }, { id: 'rhea', name: 'Rhea' }], gateDistance: 8_000, gatesToWin: 3,
    },
  ]
}
