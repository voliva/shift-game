<script lang="ts">
  import type { RoomSummary } from './roomTypes'
  import { GATE_DISTANCE_MULTIPLIER } from '../game/constants'
  import { language, messages, optionalLabel } from '../i18n'

  export let rooms: RoomSummary[]
  export let loading: boolean
  export let externalError = ''
  export let onBack: () => void
  export let onRefresh: () => void
  export let onJoin: (roomId: string, password: string) => Promise<string | void>
  export let onCreate: (name: string, password: string) => Promise<string | void>

  let passwordPromptRoom: RoomSummary | undefined
  let roomPassword = ''
  let roomError = ''
  let newRoomName = ''
  let newRoomPassword = ''
  let creatingRoom = false
  let joinError = ''

  async function selectRoom(room: RoomSummary): Promise<void> {
    joinError = ''
    if (!room.hasPassword) {
      joinError = (await onJoin(room.id, '')) ?? ''
      return
    }
    passwordPromptRoom = room
    roomPassword = ''
    roomError = ''
  }

  async function submitJoin(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    if (!passwordPromptRoom) return
    roomError = (await onJoin(passwordPromptRoom.id, roomPassword)) ?? ''
    if (!roomError) passwordPromptRoom = undefined
  }

  async function createRoom(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    if (!newRoomName.trim()) return
    creatingRoom = true
    roomError = (await onCreate(newRoomName, newRoomPassword)) ?? ''
    creatingRoom = false
  }
</script>

<section class="panel rooms-panel">
  <header class="panel-header">
    <div>
      <p class="eyebrow">{messages[$language].onlinePlayLabel}</p>
      <h1>{messages[$language].findRoom}</h1>
    </div>
    <div class="panel-actions">
      <button class="text-button" onclick={onRefresh}>{messages[$language].refresh}</button>
      <button class="text-button" onclick={onBack}>{messages[$language].back}</button>
    </div>
  </header>
  {#if loading}
    <p class="loading">{messages[$language].lookingForRooms}</p>
  {:else if externalError}
    <section class="online-unavailable" aria-live="polite">
      <h2>{messages[$language].onlineUnavailable}</h2>
      <p>{externalError}</p>
      <button class="secondary" onclick={onRefresh}>{messages[$language].tryAgain}</button>
    </section>
  {:else}
    <div class="room-list">
      {#each rooms as room (room.id)}
        <button class="room-card" onclick={() => selectRoom(room)}>
          <span>
            <strong>{room.name}</strong>
            <small>{room.players.length} {messages[$language].sailors} · {Math.round(room.gateDistance / GATE_DISTANCE_MULTIPLIER)} {messages[$language].secondsToGate}</small>
          </span>
          <em class:ongoing={room.status === 'ongoing'}>{room.status === 'ongoing' ? messages[$language].ongoing : messages[$language].waiting}</em>
        </button>
      {/each}
    </div>
    {#if joinError}<p class="form-error">{joinError}</p>{/if}
    <form class="create-room" autocomplete="off" onsubmit={createRoom}>
      <h2>{messages[$language].createRoom}</h2>
      <input aria-label={messages[$language].roomName} name="room-name" autocomplete="off" placeholder={messages[$language].roomName} bind:value={newRoomName} />
      <input aria-label={`${messages[$language].password} ${optionalLabel($language)}`} name="room-password" autocomplete="off" type="text" placeholder={`${messages[$language].password} ${optionalLabel($language)}`} bind:value={newRoomPassword} />
      <button class="secondary" disabled={creatingRoom}>{creatingRoom ? messages[$language].creating : messages[$language].create}</button>
    </form>
    {#if passwordPromptRoom}
      <div class="dialog-backdrop" role="presentation">
        <form class="password-dialog" autocomplete="off" onsubmit={submitJoin}>
          <p class="eyebrow">{messages[$language].joinRoom}</p>
          <h2>{passwordPromptRoom.name}</h2>
          <label class="field-label">{messages[$language].password}
            <input aria-label={messages[$language].password} name="join-room-password" autocomplete="off" type="text" placeholder={messages[$language].password} bind:value={roomPassword} />
          </label>
          {#if roomError}<p class="form-error">{roomError}</p>{/if}
          <div class="dialog-actions">
            <button type="button" class="secondary" onclick={() => passwordPromptRoom = undefined}>{messages[$language].cancel}</button>
            <button class="primary">{messages[$language].join}</button>
          </div>
        </form>
      </div>
    {/if}
  {/if}
</section>
