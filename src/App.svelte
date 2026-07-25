<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte'
  import { GameSession, type RankingEntry } from './game/GameSession'
  import type { WindConditions } from './game/Wind'
  import type { RemoteBoatState } from './game/RemoteBoat'
  import Credits from './ui/Credits.svelte'
  import MainMenu from './ui/MainMenu.svelte'
  import { createRoom as createServerRoom, fetchRooms, joinRoom as joinServerRoom, type RoomConnection } from './network/roomApi'
  import RaceView from './ui/RaceView.svelte'
  import RoomBrowser from './ui/RoomBrowser.svelte'
  import RoomLobby from './ui/RoomLobby.svelte'
  import type { Room, RoomSummary } from './ui/roomTypes'

  type Screen = 'menu' | 'rooms' | 'lobby' | 'race'
  type FinishEntry = { id: string; name: string; color: string; rank: number }

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
  let finishResults: FinishEntry[] = []
  let localFinishRank: number | undefined
  let session: GameSession | undefined
  let roomConnection: RoomConnection | undefined
  let onlineWindConditions: WindConditions | undefined
  const remoteBoatStates = new Map<string, RemoteBoatState>()
  let localServerPlayerId: string | undefined
  let countdownToken = 0
  let pendingStart = false

  onMount(async () => {
    boatName = localStorage.getItem('shift-game.boat-name') ?? randomBoatNames[Math.floor(Math.random() * randomBoatNames.length)]
    gateDistance = Number(localStorage.getItem('shift-game.gate-distance')) || gateDistance
    gatesToWin = Number(localStorage.getItem('shift-game.gates-to-win')) || gatesToWin
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
      onlineWindConditions = undefined
      remoteBoatStates.clear()
      const connection = await joinServerRoom(roomId, password, boatName, applyServerRoomState, startOnlineCountdown, applyWindConditions, applyRemoteBoatState, applyRaceFinish)
      roomConnection = connection
      localServerPlayerId = connection.player.id
      currentRoom = { ...connection.room, password }
      updateFinishResults()
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not join room.'
    }
    gateDistance = currentRoom.gateDistance
    gatesToWin = currentRoom.gatesToWin
    updateRoomUrl(currentRoom)
    loadingRooms = false
    if (currentRoom.status === 'ongoing') {
      pendingStart = false
      screen = 'race'
    } else {
      screen = 'lobby'
    }
    return undefined
  }

  async function createRoom(name: string, password: string): Promise<string | undefined> {
    try {
      roomConnection?.socket.close()
      onlineWindConditions = undefined
      remoteBoatStates.clear()
      const connection = await createServerRoom(name.trim(), password, boatName, applyServerRoomState, startOnlineCountdown, applyWindConditions, applyRemoteBoatState, applyRaceFinish)
      roomConnection = connection
      localServerPlayerId = connection.player.id
      currentRoom = { ...connection.room, password }
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not create room.'
    }
    gateDistance = currentRoom.gateDistance
    gatesToWin = currentRoom.gatesToWin
    updateRoomUrl(currentRoom)
    updateRaceSettings(Number(localStorage.getItem('shift-game.gate-distance')) || gateDistance, Number(localStorage.getItem('shift-game.gates-to-win')) || gatesToWin)
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
    localStorage.setItem('shift-game.gate-distance', String(gateDistance))
    localStorage.setItem('shift-game.gates-to-win', String(gatesToWin))
    currentRoom = { ...currentRoom, gateDistance, gatesToWin }
    roomConnection?.socket.send(JSON.stringify({ type: 'race-settings', gateDistance, gatesToWin }))
  }

  function startOnlineRace(): void {
    if (!currentRoom || !localPlayerIsAdmin() || currentRoom.players.length < 2) return
    roomConnection?.socket.send(JSON.stringify({ type: 'start-race' }))
  }

  function startOnlineCountdown(startTimestamp: number, getServerClockOffset: () => number): void {
    const estimatedServerNow = Date.now() + getServerClockOffset()
    void beginCountdown(Date.now() + Math.max(0, startTimestamp - estimatedServerNow))
  }

  function startLocalRace(): void {
    onlineWindConditions = undefined
    void beginCountdown(Date.now() + 3_000)
  }

  function applyWindConditions(conditions: WindConditions): void {
    onlineWindConditions = conditions
    session?.setWindConditions(conditions)
  }

  function applyRemoteBoatState(playerId: string, state: RemoteBoatState): void {
    if (playerId === localServerPlayerId) return
    remoteBoatStates.set(playerId, state)
    session?.updateRemoteBoat(playerId, state)
  }

  function applyRaceFinish(playerId: string, rank: number): void {
    session?.finishBoat(playerId)
    if (currentRoom) {
      currentRoom = { ...currentRoom, players: currentRoom.players.map((player) => player.id === playerId ? { ...player, finishedRank: rank } : player) }
      updateFinishResults()
    }
    if (playerId === localServerPlayerId) localFinishRank = rank
  }

  function finishLocalBoat(): void {
    if (roomConnection?.socket.readyState === WebSocket.OPEN) roomConnection.socket.send(JSON.stringify({ type: 'race-finish' }))
  }

  function updateFinishResults(): void {
    finishResults = (currentRoom?.finishedPlayers ?? [])
      .map((player) => ({ id: player.id, name: player.name, color: player.color, rank: player.rank }))
      .sort((first, second) => first.rank - second.rank)
  }

  async function beginCountdown(startAt = Date.now() + 3_000): Promise<void> {
    stopGame()
    pendingStart = true
    screen = 'race'
    const token = ++countdownToken
    await tick()
    if (token !== countdownToken) return
    while (true) {
      const remaining = startAt - Date.now()
      if (remaining <= 0) break
      countdown = Math.ceil(remaining / 1_000)
      const nextBoundary = startAt - (countdown - 1) * 1_000
      await delay(Math.max(1, nextBoundary - Date.now()))
      if (token !== countdownToken) return
    }
    countdown = 0
    pendingStart = false
    session?.resume()
  }

  function startGame(gameCanvas: HTMLCanvasElement, minimapCanvas: HTMLCanvasElement): void {
    const onlineRace = currentRoom && localServerPlayerId ? {
      localPlayerId: localServerPlayerId,
      players: currentRoom.players.map((player) => ({
        id: player.id, name: player.name, color: player.color ?? '#54d981', start: player.start, tack: player.tack,
      })),
      onLocalBoatState: broadcastLocalBoatState,
    } : undefined
    const course = currentRoom ? { gateDistance: currentRoom.gateDistance, gatesToWin: currentRoom.gatesToWin } : { gateDistance, gatesToWin }
    session = new GameSession(gameCanvas, minimapCanvas, (nextRanking) => ranking = nextRanking, {
      initialWindConditions: onlineWindConditions, onlineRace, course, onLocalBoatFinish: currentRoom ? finishLocalBoat : undefined,
    })
    for (const [playerId, state] of remoteBoatStates) session.updateRemoteBoat(playerId, state)
    session.start(pendingStart)
  }

  function broadcastLocalBoatState(state: RemoteBoatState): void {
    if (currentRoom?.status !== 'ongoing' || roomConnection?.socket.readyState !== WebSocket.OPEN) return
    roomConnection.socket.send(JSON.stringify({ type: 'boat-state', ...state }))
  }

  function stopGame(): void {
    countdownToken += 1
    countdown = 0
    pendingStart = false
    session?.destroy()
    session = undefined
    ranking = []
    finishResults = []
    localFinishRank = undefined
  }

  function applyServerRoomState(room: RoomSummary): void {
    if (!currentRoom) return
    currentRoom = {
      ...room,
      password: currentRoom.password,
    }
    gateDistance = room.gateDistance
    gatesToWin = room.gatesToWin
    updateFinishResults()
    session?.syncOnlinePlayers(room.players.map((player) => ({
      id: player.id, name: player.name, color: player.color ?? '#54d981', start: player.start, tack: player.tack,
    })))
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
    void leaveRoom()
  }

  async function leaveRoom(): Promise<void> {
    if (!currentRoom) return
    roomConnection?.socket.close()
    roomConnection = undefined
    localServerPlayerId = undefined
    onlineWindConditions = undefined
    remoteBoatStates.clear()
    currentRoom = undefined
    clearRoomUrl()
    await openOnline()
  }

  function leaveRace(): void {
    stopGame()
    if (currentRoom) {
      void leaveRoom()
      return
    }
    screen = 'menu'
  }
</script>

{#if screen === 'race'}
  <RaceView {ranking} {countdown} {finishResults} finishedRank={localFinishRank} totalSailors={currentRoom?.players.length ?? 0} onCanvasesReady={startGame} onTack={() => session?.tackPlayer()} onExit={leaveRace} />
{:else}
  <main class="menu-field">
    {#if screen === 'menu'}
      <MainMenu onLocalRace={startLocalRace} onOnlinePlay={openOnline} />
    {:else if screen === 'rooms'}
      <RoomBrowser {rooms} loading={loadingRooms} externalError={roomsError} onBack={() => screen = 'menu'} onRefresh={openOnline} onJoin={joinRoom} onCreate={createRoom} />
    {:else if screen === 'lobby' && currentRoom}
      <RoomLobby room={currentRoom} boatName={boatName} isAdmin={localPlayerIsAdmin()} onLeave={leaveLobby} onBoatNameChange={updateBoatName} onSettingsChange={updateRaceSettings} onStart={startOnlineRace} />
    {/if}
    <Credits />
  </main>
{/if}
