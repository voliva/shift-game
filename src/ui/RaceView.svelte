<script lang="ts">
  import { onMount } from 'svelte'
  import type { RankingEntry } from '../game/GameSession'

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
  <canvas bind:this={gameCanvas} class="game-canvas" aria-label="Shift Game" onpointerdown={onTack}></canvas>
  <canvas bind:this={minimapCanvas} class="minimap" aria-label="Course minimap"></canvas>
  <aside class="hud" aria-label="Race ranking">
    <h2>Ranking</h2>
    <div class="ranking-list">
      {#each ranking as boat (boat.id)}
        <div class="ranking-row">
          <span class="ranking-marker" style:background-color={boat.color}></span>
          <span>{boat.rank}. {boat.name}</span>
          <span class="ranking-gap">{boat.rank === 1 ? 'Leader' : `${Math.round(boat.gap)} behind`}</span>
        </div>
      {/each}
    </div>
  </aside>
  <button class="race-exit" onclick={onExit}>Leave race</button>
  {#if countdown > 0}<div class="countdown" aria-live="assertive">{countdown}</div>{/if}
  {#if finishedRank}
    <section class="finish-overlay" aria-live="assertive">
      <h1>{finishedRank <= Math.ceil(totalSailors / 2) ? 'Congratulations!' : 'Race complete'}</h1>
      <p>You ended <strong>{finishedRank}{finishedRank === 1 ? 'st' : finishedRank === 2 ? 'nd' : finishedRank === 3 ? 'rd' : 'th'}</strong>.</p>
      <ol>
        {#each finishResults as sailor (sailor.id)}
          <li><span style:background-color={sailor.color}></span>{sailor.rank}. {sailor.name}</li>
        {/each}
      </ol>
    </section>
  {/if}
</main>
