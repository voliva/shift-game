<script lang="ts">
  import type { Room } from './roomTypes'
  import { GATE_DISTANCE_MULTIPLIER } from '../game/constants'

  export let room: Room
  export let boatName: string
  export let isAdmin: boolean
  export let onLeave: () => void
  export let onBoatNameChange: (name: string) => void
  export let onSettingsChange: (gateDistance: number, gatesToWin: number) => void
  export let onStart: () => void

  let editedBoatName = boatName
  let gateDistance = room.gateDistance / GATE_DISTANCE_MULTIPLIER
  let gatesToWin = room.gatesToWin

  function saveName(): void {
    onBoatNameChange(editedBoatName)
  }

  function saveSettings(): void {
    onSettingsChange(gateDistance, gatesToWin)
  }
</script>

<section class="panel lobby-panel">
  <header class="panel-header">
    <div>
      <p class="eyebrow">{room.status === 'ongoing' ? 'ONGOING ROOM' : 'ROOM LOBBY'}</p>
      <h1>{room.name}</h1>
      <p class="room-password">Password: <strong>{room.password}</strong></p>
    </div>
    <button class="text-button" onclick={onLeave}>Leave room</button>
  </header>
  <div class="lobby-grid">
    <section>
      <label class="field-label" style="margin-top: 0; margin-bottom: 15px;">Boat name
        <input bind:value={editedBoatName} onblur={saveName} onkeydown={(event) => event.key === 'Enter' && saveName()} />
      </label>
      <h2>Sailors ({room.players.length})</h2>
      <ul class="players">
        {#each room.players as player (player.id)}
          <li><span class="player-dot"></span>{player.name}{#if player.isAdmin}<small>host</small>{/if}</li>
        {/each}
      </ul>
      {#if room.status === 'ongoing'}
        <p class="hint">Joining an ongoing race places you roughly three quarters of the way from the leader to the last boat.</p>
      {/if}
    </section>
    <section class="settings">
      <h2>Race settings</h2>
      {#if isAdmin}
        <label class="field-label">Gate distance
          <input type="number" min="1" step="1" bind:value={gateDistance} onblur={saveSettings} />
        </label>
        <label class="field-label">Gates to win
          <input type="number" min="1" step="1" bind:value={gatesToWin} onblur={saveSettings} />
        </label>
        <button class="primary" disabled={room.players.length < 2} onclick={onStart}>
          {room.players.length < 2 ? 'Need one more sailor' : 'Start race'}
        </button>
      {:else}
        <p>{Math.round(room.gateDistance / GATE_DISTANCE_MULTIPLIER)} seconds · first to {room.gatesToWin} gates wins</p>
        <p class="hint">Waiting for the host to start the race.</p>
      {/if}
    </section>
  </div>
</section>
