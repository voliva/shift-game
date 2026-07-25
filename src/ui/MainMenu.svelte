<script lang="ts">
  import { language, messages } from '../i18n'

  export let onLocalRace: () => void
  export let onOnlinePlay: () => void
</script>

<section class="panel main-menu">
  <h1 class="game-title">{messages[$language].gameName}</h1>
  <p class="game-tagline">{messages[$language].raceTheWind}</p>
  <button class="primary" onclick={onLocalRace}>{messages[$language].localRace}</button>
  <button class="secondary" onclick={onOnlinePlay}>{messages[$language].onlinePlay}</button>
  <label class="language-picker">{messages[$language].language}
    <select bind:value={$language} aria-label={messages[$language].language}>
      <option value="en">English</option>
      <option value="es">Español</option>
      <option value="ca">Català</option>
    </select>
  </label>
</section>
