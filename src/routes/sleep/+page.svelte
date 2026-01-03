<script lang="ts">
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';
  import { addActivity, activities, updateActivityApi, type SleepData, type Activity } from '$lib/stores/activities';
  import { formatTimerDisplay } from '$lib/utils/formatters';

  let location = '';
  let quality = 3;
  let notes = '';
  
  let isTimerRunning = false;
  let timerStarted: number | null = null;
  let elapsed = 0;
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let activeActivityId: string | null = null;
  
  let isSaving = false;

  // Check for active sleep session
  $: {
    const activeSleep = $activities.find(
      (a: Activity) => a.type === 'sleep' && !a.ended_at
    );
    if (activeSleep && !isTimerRunning) {
      activeActivityId = activeSleep.id;
      timerStarted = activeSleep.started_at;
      isTimerRunning = true;
      startTimerInterval();
    }
  }

  function startTimerInterval() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      elapsed = Date.now() - (timerStarted || 0);
    }, 1000);
  }

  async function startSleep() {
    isSaving = true;
    
    try {
      const data: SleepData = {
        location: location.trim() || undefined,
        quality,
        notes: notes.trim() || undefined
      };

      timerStarted = Date.now();
      isTimerRunning = true;
      elapsed = 0;
      startTimerInterval();

      const activity = await addActivity('sleep', data, timerStarted);
      activeActivityId = activity.id;
    } catch (e) {
      console.error('Failed to start sleep:', e);
      isTimerRunning = false;
    } finally {
      isSaving = false;
    }
  }

  async function stopSleep() {
    if (!activeActivityId) return;
    
    isSaving = true;
    
    try {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      await updateActivityApi(activeActivityId, {
        ended_at: Date.now(),
        data: {
          location: location.trim() || undefined,
          quality,
          notes: notes.trim() || undefined
        }
      });
      
      goto('/');
    } catch (e) {
      console.error('Failed to stop sleep:', e);
    } finally {
      isSaving = false;
    }
  }

  onDestroy(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  });

  const locations = ['Crib', 'Bassinet', 'Swing', 'Car Seat', 'Arms', 'Stroller'];
</script>

<div class="page">
  <div class="container">
    <header style="display: flex; align-items: center; gap: var(--space-md); padding: var(--space-lg) 0;">
      <a href="/" class="btn btn-outline" style="padding: var(--space-sm);">←</a>
      <h1 style="flex: 1;">😴 Sleep Tracker</h1>
    </header>

    <!-- Timer Display -->
    <div class="card" style="text-align: center; margin-bottom: var(--space-lg);">
      <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-sm);">
        {isTimerRunning ? 'Currently sleeping' : 'Sleep duration'}
      </p>
      <p class="timer-display" class:timer-running={isTimerRunning}>
        {formatTimerDisplay(elapsed)}
      </p>
    </div>

    <!-- Location -->
    <div class="form-group">
      <label>Location</label>
      <div style="display: flex; flex-wrap: wrap; gap: var(--space-sm);">
        {#each locations as loc}
          <button
            class="chip"
            class:active={location === loc}
            style={location === loc ? 'background: var(--color-sleep-light); color: var(--color-sleep-dark);' : ''}
            on:click={() => location = location === loc ? '' : loc}
          >
            {loc}
          </button>
        {/each}
      </div>
    </div>

    <!-- Quality -->
    <div class="form-group">
      <label>Sleep Quality</label>
      <div class="segmented">
        {#each [1, 2, 3, 4, 5] as q}
          <button
            class="segmented-btn"
            class:active={quality === q}
            on:click={() => { quality = q }}
          >
            {q === 1 ? '😢' : q === 2 ? '😕' : q === 3 ? '😐' : q === 4 ? '🙂' : '😊'}
          </button>
        {/each}
      </div>
    </div>

    <!-- Notes -->
    <div class="form-group">
      <label for="notes">Notes (optional)</label>
      <textarea
        id="notes"
        bind:value={notes}
        placeholder="Any notes about this nap..."
        rows="3"
      ></textarea>
    </div>

    <!-- Start/Stop Button -->
    {#if isTimerRunning}
      <button
        class="btn btn-primary btn-large btn-block"
        on:click={stopSleep}
        disabled={isSaving}
        style="background: linear-gradient(135deg, var(--color-error), #c05050);"
      >
        {isSaving ? 'Saving...' : '⏹️ End Sleep'}
      </button>
    {:else}
      <button
        class="btn btn-sleep btn-large btn-block"
        on:click={startSleep}
        disabled={isSaving}
      >
        {isSaving ? 'Starting...' : '▶️ Start Sleep'}
      </button>
    {/if}
  </div>
</div>
