<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte'
  import { GameSession, type RankingEntry } from './game/GameSession'
  import Credits from './ui/Credits.svelte'
  import MainMenu from './ui/MainMenu.svelte'
  import { createRoom as createServerRoom, fetchRooms, joinRoom as joinServerRoom, type RoomConnection } from './network/roomApi'
  import RaceView from './ui/RaceView.svelte'
  import RoomBrowser from './ui/RoomBrowser.svelte'
  import RoomLobby from './ui/RoomLobby.svelte'
  import type { Room, RoomSummary } from './ui/roomTypes'

  type Screen = 'menu' | 'rooms' | 'lobby' | 'race'

  const randomBoatNames = ['Sea Biscuit', 'Windward', 'Blue Comet', 'Tidal Pixel', 'North Star']
  const delay = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

  let screen: Screen = 'menu'
  let rooms: RoomSummary[] = []
  let loadingRooms = false
  let roomsError = ''
  let currentRoom: Room | undefined
  let boatName = ''
  let gateDistance = 6_000
  let gatesToWin = 5
  let countdown = 0
  let ranking: RankingEntry[] = []
  let session: GameSession | undefined
  let roomConnection: RoomConnection | undefined
  let localServerPlayerId: string | undefined
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
    try {
      rooms = await fetchRooms()
    } catch {
      roomsError = 'Room server is unavailable. Start it with pnpm server.'
    }
    loadingRooms = false
  }

  async function joinFromUrl(roomId: string, password: string): Promise<void> {
    stopGame()
    screen = 'rooms'
    loadingRooms = true
    roomsError = ''
    try {
      rooms = await fetchRooms()
    } catch {
      roomsError = 'Room server is unavailable. Start it with pnpm server.'
      loadingRooms = false
      return
    }
    const error = await joinRoom(roomId, password)
    if (error) {
      roomsError = error
      loadingRooms = false
    }
  }

  async function joinRoom(roomId: string, password: string): Promise<string | undefined> {
    if (!password) return 'Enter the room password to join.'
    try {
      roomConnection?.socket.close()
      const connection = await joinServerRoom(roomId, password, boatName, applyServerRoomState)
      roomConnection = connection
      localServerPlayerId = connection.player.id
      currentRoom = { ...connection.room, password }
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not join room.'
    }
    gateDistance = currentRoom.gateDistance
    gatesToWin = currentRoom.gatesToWin
    updateRoomUrl(currentRoom)
    loadingRooms = false
    screen = 'lobby'
    return undefined
  }

  async function createRoom(name: string, password: string): Promise<string | undefined> {
    try {
      roomConnection?.socket.close()
      const connection = await createServerRoom(name.trim(), password, boatName, applyServerRoomState)
      roomConnection = connection
      localServerPlayerId = connection.player.id
      currentRoom = { ...connection.room, password }
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not create room.'
    }
    gateDistance = currentRoom.gateDistance
    gatesToWin = currentRoom.gatesToWin
    updateRoomUrl(currentRoom)
    screen = 'lobby'
    return undefined
  }

  function updateBoatName(name: string): void {
    boatName = name.trim() || randomBoatNames[Math.floor(Math.random() * randomBoatNames.length)]
    localStorage.setItem('shift-game.boat-name', boatName)
    roomConnection?.socket.send(JSON.stringify({ type: 'set-name', name: boatName }))
    if (currentRoom) currentRoom = { ...currentRoom, players: currentRoom.players.map((player) => player.id === localServerPlayerId ? { ...player, name: boatName } : player) }
  }

  function localPlayerIsAdmin(): boolean {
    return currentRoom?.players.some((player) => player.id === localServerPlayerId && player.isAdmin) ?? false
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

  function applyServerRoomState(room: RoomSummary): void {
    if (!currentRoom) return
    currentRoom = {
      ...room,
      password: currentRoom.password,
      gateDistance: currentRoom.gateDistance,
      gatesToWin: currentRoom.gatesToWin,
    }
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
    roomConnection?.socket.close()
    roomConnection = undefined
    localServerPlayerId = undefined
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
