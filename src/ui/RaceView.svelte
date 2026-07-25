<script lang="ts">
  import { onMount } from 'svelte'
  import type { RankingEntry } from '../game/GameSession'
  import { GATE_DISTANCE_MULTIPLIER } from '../game/constants'
  import { finishPosition, language, messages } from '../i18n'

  export let ranking: RankingEntry[]
  export let countdown: number
  export let finishResults: { id: string; name: string; color: string; rank: number }[]
  export let finishedRank: number | undefined
  export let totalSailors: number
  export let onCanvasesReady: (gameCanvas: HTMLCanvasElement, minimapCanvas: HTMLCanvasElement) => void
  export let onTack: () => void
  export let onExit: () => void

  let gameCanvas: HTMLCanvasElement
  let minimapCanvas: HTMLCanvasElement

  onMount(() => onCanvasesReady(gameCanvas, minimapCanvas))
</script>

<main class="race-shell">
  <canvas bind:this={gameCanvas} class="game-canvas" aria-label={messages[$language].gameName} onpointerdown={(event) => { event.preventDefault(); onTack() }}></canvas>
  <canvas bind:this={minimapCanvas} class="minimap" aria-label={messages[$language].courseMinimap}></canvas>
  <aside class="hud" aria-label={messages[$language].ranking}>
    <h2>{messages[$language].ranking}</h2>
    <div class="ranking-list">
      {#each ranking as boat (boat.id)}
        <div class="ranking-row">
          <span class="ranking-marker" style:background-color={boat.color}></span>
          <span>{boat.rank}. {boat.name}</span>
          <span class="ranking-gap">{boat.rank === 1 ? messages[$language].leader : `${Math.round(boat.gap / GATE_DISTANCE_MULTIPLIER)}${messages[$language].secondsBehind}`}</span>
        </div>
      {/each}
    </div>
  </aside>
  <button class="race-exit" onclick={onExit}>{messages[$language].leaveRace}</button>
  {#if countdown > 0}<div class="countdown" aria-live="assertive">{countdown}</div>{/if}
  {#if finishedRank}
    <section class="finish-overlay" aria-live="assertive">
      <h1>{finishedRank <= Math.ceil(totalSailors / 2) ? messages[$language].congratulations : messages[$language].raceComplete}</h1>
      <p>{messages[$language].ended} <strong>{finishPosition($language, finishedRank)}</strong>.</p>
      <ol>
        {#each finishResults as sailor (sailor.id)}
          <li><span style:background-color={sailor.color}></span>{sailor.rank}. {sailor.name}</li>
        {/each}
      </ol>
    </section>
  {/if}
</main>
