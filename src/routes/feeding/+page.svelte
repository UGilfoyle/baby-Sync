<script lang="ts">
  import { goto } from '$app/navigation';
  import { addActivity, type FeedingData } from '$lib/stores/activities';
  import { formatTimerDisplay } from '$lib/utils/formatters';

  let feedType: 'bottle' | 'breast' | 'solid' = 'bottle';
  let amount = 4;
  let unit: 'oz' | 'ml' = 'oz';
  let side: 'left' | 'right' | 'both' = 'left';
  let notes = '';
  
  let isTimerRunning = false;
  let timerStarted: number | null = null;
  let elapsed = 0;
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  
  let isSaving = false;

  function startTimer() {
    timerStarted = Date.now();
    isTimerRunning = true;
    timerInterval = setInterval(() => {
      elapsed = Date.now() - (timerStarted || 0);
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    isTimerRunning = false;
  }

  async function handleSave() {
    isSaving = true;
    
    try {
      const data: FeedingData = {
        feedType,
        notes: notes.trim() || undefined
      };

      if (feedType === 'bottle') {
        data.amount = amount;
        data.unit = unit;
      } else if (feedType === 'breast') {
        data.side = side;
      }

      const startedAt = timerStarted || Date.now();
      const endedAt = isTimerRunning ? Date.now() : undefined;
      
      stopTimer();
      
      await addActivity('feeding', data, startedAt, endedAt);
      goto('/');
    } catch (e) {
      console.error('Failed to save feeding:', e);
      isSaving = false;
    }
  }

  function adjustAmount(delta: number) {
    amount = Math.max(0.5, amount + delta);
  }
</script>

<div class="page">
  <div class="container">
    <header style="display: flex; align-items: center; gap: var(--space-md); padding: var(--space-lg) 0;">
      <a href="/" class="btn btn-outline" style="padding: var(--space-sm);">←</a>
      <h1 style="flex: 1;">🍼 Log Feeding</h1>
    </header>

    <!-- Timer Display -->
    {#if isTimerRunning || elapsed > 0}
      <div class="card" style="text-align: center; margin-bottom: var(--space-lg);">
        <p class="timer-display" class:timer-running={isTimerRunning}>
          {formatTimerDisplay(elapsed)}
        </p>
        {#if isTimerRunning}
          <button class="btn btn-outline mt-md" on:click={stopTimer}>
            ⏹️ Stop Timer
          </button>
        {/if}
      </div>
    {/if}

    <!-- Feed Type Selection -->
    <div class="form-group">
      <label>Type</label>
      <div class="segmented">
        <button
          class="segmented-btn"
          class:active={feedType === 'bottle'}
          on:click={() => feedType = 'bottle'}
        >
          🍼 Bottle
        </button>
        <button
          class="segmented-btn"
          class:active={feedType === 'breast'}
          on:click={() => feedType = 'breast'}
        >
          🤱 Breast
        </button>
        <button
          class="segmented-btn"
          class:active={feedType === 'solid'}
          on:click={() => feedType = 'solid'}
        >
          🥣 Solid
        </button>
      </div>
    </div>

    <!-- Bottle Amount -->
    {#if feedType === 'bottle'}
      <div class="form-group">
        <label>Amount</label>
        <div class="number-input">
          <button on:click={() => adjustAmount(-0.5)}>−</button>
          <input type="number" bind:value={amount} step="0.5" min="0" />
          <button on:click={() => adjustAmount(0.5)}>+</button>
        </div>
        <div class="segmented mt-md">
          <button
            class="segmented-btn"
            class:active={unit === 'oz'}
            on:click={() => unit = 'oz'}
          >
            oz
          </button>
          <button
            class="segmented-btn"
            class:active={unit === 'ml'}
            on:click={() => unit = 'ml'}
          >
            ml
          </button>
        </div>
      </div>
    {/if}

    <!-- Breast Side -->
    {#if feedType === 'breast'}
      <div class="form-group">
        <label>Side</label>
        <div class="segmented">
          <button
            class="segmented-btn"
            class:active={side === 'left'}
            on:click={() => side = 'left'}
          >
            Left
          </button>
          <button
            class="segmented-btn"
            class:active={side === 'both'}
            on:click={() => side = 'both'}
          >
            Both
          </button>
          <button
            class="segmented-btn"
            class:active={side === 'right'}
            on:click={() => side = 'right'}
          >
            Right
          </button>
        </div>
      </div>

      <!-- Timer for Breast -->
      {#if !isTimerRunning && elapsed === 0}
        <button class="btn btn-primary btn-block mb-md" on:click={startTimer}>
          ⏱️ Start Timer
        </button>
      {/if}
    {/if}

    <!-- Notes -->
    <div class="form-group">
      <label for="notes">Notes (optional)</label>
      <textarea
        id="notes"
        bind:value={notes}
        placeholder="Any notes about this feeding..."
        rows="3"
      ></textarea>
    </div>

    <!-- Save Button -->
    <button
      class="btn btn-feeding btn-large btn-block"
      on:click={handleSave}
      disabled={isSaving}
    >
      {isSaving ? 'Saving...' : '✓ Save Feeding'}
    </button>
  </div>
</div>

<style>
  .mb-md {
    margin-bottom: var(--space-md);
  }
</style>
