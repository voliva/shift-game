<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte'
  import { GameSession, type RankingEntry } from './game/GameSession'
  import Credits from './ui/Credits.svelte'
  import MainMenu from './ui/MainMenu.svelte'
  import { getMockRooms } from './ui/mockRooms'
  import RaceView from './ui/RaceView.svelte'
  import RoomBrowser from './ui/RoomBrowser.svelte'
  import RoomLobby from './ui/RoomLobby.svelte'
  import type { Player, Room } from './ui/roomTypes'

  type Screen = 'menu' | 'rooms' | 'lobby' | 'race'

  const PLAYER_ID = 'local-player'
  const randomBoatNames = ['Sea Biscuit', 'Windward', 'Blue Comet', 'Tidal Pixel', 'North Star']
  const delay = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

  let screen: Screen = 'menu'
  let rooms: Room[] = []
  let loadingRooms = false
  let roomsError = ''
  let currentRoom: Room | undefined
  let boatName = ''
  let gateDistance = 6_000
  let gatesToWin = 5
  let countdown = 0
  let ranking: RankingEntry[] = []
  let session: GameSession | undefined
  let countdownToken = 0
  let pendingStart = false

  onMount(async () => {
    boatName = localStorage.getItem('shift-game.boat-name') ?? randomBoatNames[Math.floor(Math.random() * randomBoatNames.length)]
    const params = new URLSearchParams(window.location.search)
    const roomId = params.get('roomId')
    const password = params.get('password')
    if (roomId && password) {
      await joinFromUrl(roomId, password)
    }
  })

  onDestroy(stopGame)

  async function openOnline(): Promise<void> {
    stopGame()
    screen = 'rooms'
    loadingRooms = true
    roomsError = ''
    rooms = []
    rooms = await fetchRooms()
    loadingRooms = false
  }

  async function joinFromUrl(roomId: string, password: string): Promise<void> {
    stopGame()
    screen = 'rooms'
    loadingRooms = true
    roomsError = ''
    rooms = await fetchRooms()
    const error = await joinRoom(roomId, password)
    if (error) {
      roomsError = error
      loadingRooms = false
    }
  }

  async function fetchRooms(): Promise<Room[]> {
    await delay(550)
    return getMockRooms()
  }

  async function joinRoom(roomId: string, password: string): Promise<string | undefined> {
    const room = rooms.find((candidate) => candidate.id === roomId)
    if (!room) return 'That mock room does not exist.'
    if (!password) return 'Enter the room password to join.'
    await delay(350)
    if (room.password !== password) return 'Incorrect password.'
    const localPlayer: Player = { id: PLAYER_ID, name: boatName }
    currentRoom = { ...room, players: [...room.players.filter((player) => player.id !== PLAYER_ID), localPlayer] }
    gateDistance = currentRoom.gateDistance
    gatesToWin = currentRoom.gatesToWin
    updateRoomUrl(currentRoom)
    loadingRooms = false
    screen = 'lobby'
    return undefined
  }

  async function createRoom(name: string, password: string): Promise<void> {
    await delay(350)
    const room: Room = {
      id: `room-${Math.random().toString(36).slice(2, 8)}`, name: name.trim(), password, status: 'waiting',
      players: [{ id: PLAYER_ID, name: boatName, isAdmin: true }], gateDistance: 6_000, gatesToWin: 5,
    }
    rooms = [room, ...rooms]
    currentRoom = room
    gateDistance = room.gateDistance
    gatesToWin = room.gatesToWin
    updateRoomUrl(room)
    screen = 'lobby'
    window.setTimeout(() => {
      if (currentRoom?.id === room.id) currentRoom = { ...currentRoom, players: [...currentRoom.players, { id: 'mock-sailor', name: 'Mock Sailor' }] }
    }, 900)
  }

  function updateBoatName(name: string): void {
    boatName = name.trim() || randomBoatNames[Math.floor(Math.random() * randomBoatNames.length)]
    localStorage.setItem('shift-game.boat-name', boatName)
    if (currentRoom) currentRoom = { ...currentRoom, players: currentRoom.players.map((player) => player.id === PLAYER_ID ? { ...player, name: boatName } : player) }
  }

  function localPlayerIsAdmin(): boolean {
    return currentRoom?.players.some((player) => player.id === PLAYER_ID && player.isAdmin) ?? false
  }

  function updateRaceSettings(distance: number, gates: number): void {
    if (!currentRoom || !localPlayerIsAdmin()) return
    gateDistance = Math.max(500, distance)
    gatesToWin = Math.max(1, gates)
    currentRoom = { ...currentRoom, gateDistance, gatesToWin }
  }

  async function startOnlineRace(): Promise<void> {
    if (!currentRoom || !localPlayerIsAdmin() || currentRoom.players.length < 2) return
    currentRoom = { ...currentRoom, status: 'ongoing' }
    await beginCountdown()
  }

  async function beginCountdown(): Promise<void> {
    stopGame()
    pendingStart = true
    screen = 'race'
    const token = ++countdownToken
    await tick()
    if (token !== countdownToken) return
    for (let value = 3; value > 0; value -= 1) {
      countdown = value
      await delay(1_000)
      if (token !== countdownToken) return
    }
    countdown = 0
    pendingStart = false
    session?.resume()
  }

  function startGame(gameCanvas: HTMLCanvasElement, minimapCanvas: HTMLCanvasElement): void {
    session = new GameSession(gameCanvas, minimapCanvas, (nextRanking) => ranking = nextRanking)
    session.start(pendingStart)
  }

  function stopGame(): void {
    countdownToken += 1
    countdown = 0
    pendingStart = false
    session?.destroy()
    session = undefined
    ranking = []
  }

  function updateRoomUrl(room: Room): void {
    const url = new URL(window.location.href)
    url.searchParams.set('roomId', room.id)
    url.searchParams.set('password', room.password)
    window.history.replaceState({}, '', url)
  }

  function clearRoomUrl(): void {
    const url = new URL(window.location.href)
    url.searchParams.delete('roomId')
    url.searchParams.delete('password')
    window.history.replaceState({}, '', url)
  }

  function leaveLobby(): void {
    if (!currentRoom) return
    const remainingPlayers = currentRoom.players.filter((player) => player.id !== PLAYER_ID)
    if (remainingPlayers.length === 0) rooms = rooms.filter((room) => room.id !== currentRoom?.id)
    else if (localPlayerIsAdmin()) {
      const nextAdmin = remainingPlayers[Math.floor(Math.random() * remainingPlayers.length)]
      currentRoom = { ...currentRoom, players: remainingPlayers.map((player) => ({ ...player, isAdmin: player.id === nextAdmin.id })) }
    }
    currentRoom = undefined
    clearRoomUrl()
    screen = 'rooms'
  }

  function leaveRace(): void {
    stopGame()
    screen = currentRoom ? 'lobby' : 'menu'
  }
</script>

{#if screen === 'race'}
  <RaceView {ranking} {countdown} onCanvasesReady={startGame} onTack={() => session?.tackPlayer()} onExit={leaveRace} />
{:else}
  <main class="menu-field">
    {#if screen === 'menu'}
      <MainMenu onLocalRace={beginCountdown} onOnlinePlay={openOnline} />
    {:else if screen === 'rooms'}
      <RoomBrowser {rooms} loading={loadingRooms} externalError={roomsError} onBack={() => screen = 'menu'} onRefresh={openOnline} onJoin={joinRoom} onCreate={createRoom} />
    {:else if screen === 'lobby' && currentRoom}
      <RoomLobby room={currentRoom} boatName={boatName} isAdmin={localPlayerIsAdmin()} onLeave={leaveLobby} onBoatNameChange={updateBoatName} onSettingsChange={updateRaceSettings} onStart={startOnlineRace} />
    {/if}
    <Credits />
  </main>
{/if}
