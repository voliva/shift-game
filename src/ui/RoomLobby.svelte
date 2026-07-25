<script lang="ts">
  import type { Room } from './roomTypes'
  import { GATE_DISTANCE_MULTIPLIER } from '../game/constants'
  import { language, messages } from '../i18n'

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

  function saveName(): void { onBoatNameChange(editedBoatName) }
  function saveSettings(): void { onSettingsChange(gateDistance, gatesToWin) }
</script>

<section class="panel lobby-panel">
  <header class="panel-header">
    <div>
      <p class="eyebrow">{room.status === 'ongoing' ? messages[$language].ongoingRoom : messages[$language].roomLobby}</p>
      <h1>{room.name}</h1>
      <p class="room-password">{messages[$language].password}: <strong>{room.password}</strong></p>
    </div>
    <button class="text-button" onclick={onLeave}>{messages[$language].leaveRoom}</button>
  </header>
  <div class="lobby-grid">
    <section>
      <label class="field-label" style="margin-top: 0; margin-bottom: 15px;">{messages[$language].boatName}
        <input bind:value={editedBoatName} onblur={saveName} onkeydown={(event) => event.key === 'Enter' && saveName()} />
      </label>
      <h2>{messages[$language].sailors} ({room.players.length})</h2>
      <ul class="players">
        {#each room.players as player (player.id)}
          <li><span class="player-dot"></span>{player.name}{#if player.isAdmin}<small>{messages[$language].host}</small>{/if}</li>
        {/each}
      </ul>
      {#if room.status === 'ongoing'}
        <p class="hint">{messages[$language].joinOngoingHint}</p>
      {/if}
    </section>
    <section class="settings">
      <h2>{messages[$language].raceSettings}</h2>
      {#if isAdmin}
        <label class="field-label">{messages[$language].gateDistance}
          <input type="number" min="1" step="1" bind:value={gateDistance} onblur={saveSettings} />
        </label>
        <label class="field-label">{messages[$language].gatesToWin}
          <input type="number" min="1" step="1" bind:value={gatesToWin} onblur={saveSettings} />
        </label>
        <button class="primary" disabled={room.players.length < 2} onclick={onStart}>
          {room.players.length < 2 ? messages[$language].needSailor : messages[$language].startRace}
        </button>
      {:else}
        <p>{Math.round(room.gateDistance / GATE_DISTANCE_MULTIPLIER)} {messages[$language].secondsToGate} · {messages[$language].firstTo} {room.gatesToWin} {messages[$language].gatesWins}</p>
        <p class="hint">{messages[$language].waitingForHost}</p>
      {/if}
    </section>
  </div>
</section>
