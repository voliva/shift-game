<script lang="ts">
  import type { Room } from './roomTypes'

  export let rooms: Room[]
  export let loading: boolean
  export let externalError = ''
  export let onBack: () => void
  export let onRefresh: () => void
  export let onJoin: (roomId: string, password: string) => Promise<string | undefined>
  export let onCreate: (name: string, password: string) => Promise<void>

  let passwordPromptRoom: Room | undefined
  let roomPassword = ''
  let roomError = ''
  let newRoomName = ''
  let newRoomPassword = ''
  let creatingRoom = false

  function selectRoom(room: Room): void {
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
    if (!newRoomName.trim() || !newRoomPassword) return
    creatingRoom = true
    await onCreate(newRoomName, newRoomPassword)
    creatingRoom = false
  }
</script>

<section class="panel rooms-panel">
  <header class="panel-header">
    <div>
      <p class="eyebrow">ONLINE PLAY</p>
      <h1>Find a room</h1>
    </div>
    <div class="panel-actions">
      <button class="text-button" onclick={onRefresh}>Refresh</button>
      <button class="text-button" onclick={onBack}>Back</button>
    </div>
  </header>
  {#if loading}
    <p class="loading">Looking for rooms...</p>
  {:else}
    <div class="room-list">
      {#each rooms as room (room.id)}
        <button class="room-card" onclick={() => selectRoom(room)}>
          <span>
            <strong>{room.name}</strong>
            <small>{room.players.length} sailors · {room.gateDistance} gate distance</small>
          </span>
          <em class:ongoing={room.status === 'ongoing'}>{room.status}</em>
        </button>
      {/each}
    </div>
    <form class="create-room" autocomplete="off" onsubmit={createRoom}>
      <h2>Create a room</h2>
      <input aria-label="Room name" name="room-name" autocomplete="off" placeholder="Room name" bind:value={newRoomName} />
      <input aria-label="New room password" name="room-password" autocomplete="off" type="text" placeholder="Password" bind:value={newRoomPassword} />
      <button class="secondary" disabled={creatingRoom}>{creatingRoom ? 'Creating...' : 'Create room'}</button>
    </form>
    {#if externalError}<p class="form-error">{externalError}</p>{/if}
    {#if passwordPromptRoom}
      <div class="dialog-backdrop" role="presentation">
        <form class="password-dialog" autocomplete="off" onsubmit={submitJoin}>
          <p class="eyebrow">JOIN ROOM</p>
          <h2>{passwordPromptRoom.name}</h2>
          <label class="field-label">Room password
            <input aria-label="Room password" name="join-room-password" autocomplete="off" type="text" placeholder="Password" bind:value={roomPassword} />
          </label>
          {#if roomError}<p class="form-error">{roomError}</p>{/if}
          <div class="dialog-actions">
            <button type="button" class="secondary" onclick={() => passwordPromptRoom = undefined}>Cancel</button>
            <button class="primary">Join room</button>
          </div>
        </form>
      </div>
    {/if}
  {/if}
</section>
