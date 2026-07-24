<script lang="ts">
  import { onMount } from 'svelte'
  import { GameSession, type RankingEntry } from './game/GameSession'

  let gameCanvas: HTMLCanvasElement
  let minimapCanvas: HTMLCanvasElement
  let ranking: RankingEntry[] = []
  let session: GameSession | undefined

  onMount(() => {
    session = new GameSession(gameCanvas, minimapCanvas, (nextRanking) => {
      ranking = nextRanking
    })
    session.start()
    return () => session?.destroy()
  })
</script>

<main class="game-shell">
  <canvas
    bind:this={gameCanvas}
    class="game-canvas"
    aria-label="Shift Game"
    onpointerdown={() => session?.tackPlayer()}
  ></canvas>
  <canvas bind:this={minimapCanvas} class="minimap" aria-label="Course minimap"></canvas>
  <aside class="hud" aria-label="Race ranking">
    <h2>Ranking</h2>
    {#each ranking as boat (boat.id)}
      <div class="ranking-row">
        <span class="ranking-marker" style:background-color={boat.color}></span>
        <span>{boat.rank}. {boat.name}</span>
        <span class="ranking-gap">{boat.rank === 1 ? 'Leader' : `${Math.round(boat.gap)} behind`}</span>
      </div>
    {/each}
  </aside>
</main>
