<script lang="ts">
  export let onLocalRace: () => void
  export let onOnlinePlay: () => void
</script>

<section class="panel main-menu">
  <p class="eyebrow">SHIFT GAME</p>
  <h1>Race the wind.</h1>
  <p class="intro">Pick a local endless race or gather a crew online.</p>
  <button class="primary" onclick={onLocalRace}>Race locally against AI</button>
  <button class="secondary" onclick={onOnlinePlay}>Online play</button>
</section>
