<script lang="ts">
  import { goto } from '$app/navigation';
  import { addActivity, type DiaperData } from '$lib/stores/activities';

  let diaperType: 'wet' | 'dirty' | 'both' = 'wet';
  let hasRash = false;
  let notes = '';
  
  let isSaving = false;

  async function handleSave() {
    isSaving = true;
    
    try {
      const data: DiaperData = {
        diaperType,
        hasRash,
        notes: notes.trim() || undefined
      };

      await addActivity('diaper', data);
      goto('/');
    } catch (e) {
      console.error('Failed to save diaper:', e);
      isSaving = false;
    }
  }
</script>

<div class="page">
  <div class="container">
    <header style="display: flex; align-items: center; gap: var(--space-md); padding: var(--space-lg) 0;">
      <a href="/" class="btn btn-outline" style="padding: var(--space-sm);">←</a>
      <h1 style="flex: 1;">🧷 Log Diaper</h1>
    </header>

    <!-- Diaper Type -->
    <div class="form-group">
      <label>Type</label>
      <div class="type-buttons">
        <button
          class="type-btn"
          class:active={diaperType === 'wet'}
          on:click={() => diaperType = 'wet'}
        >
          <span class="type-icon">💧</span>
          <span>Wet</span>
        </button>
        <button
          class="type-btn"
          class:active={diaperType === 'dirty'}
          on:click={() => diaperType = 'dirty'}
        >
          <span class="type-icon">💩</span>
          <span>Dirty</span>
        </button>
        <button
          class="type-btn"
          class:active={diaperType === 'both'}
          on:click={() => diaperType = 'both'}
        >
          <span class="type-icon">💧💩</span>
          <span>Both</span>
        </button>
      </div>
    </div>

    <!-- Rash Toggle -->
    <div class="form-group">
      <label class="toggle-label">
        <span>Diaper Rash</span>
        <button
          class="toggle"
          class:active={hasRash}
          on:click={() => hasRash = !hasRash}
          aria-pressed={hasRash}
        >
          <span class="toggle-handle"></span>
        </button>
      </label>
      {#if hasRash}
        <p style="font-size: var(--font-size-sm); color: var(--color-warning); margin-top: var(--space-sm);">
          ⚠️ Consider applying diaper cream
        </p>
      {/if}
    </div>

    <!-- Notes -->
    <div class="form-group">
      <label for="notes">Notes (optional)</label>
      <textarea
        id="notes"
        bind:value={notes}
        placeholder="Any notes about this diaper change..."
        rows="3"
      ></textarea>
    </div>

    <!-- Save Button -->
    <button
      class="btn btn-diaper btn-large btn-block"
      on:click={handleSave}
      disabled={isSaving}
    >
      {isSaving ? 'Saving...' : '✓ Save Diaper'}
    </button>
  </div>
</div>

<style>
  .type-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-sm);
  }

  .type-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-lg);
    background: var(--color-bg-elevated);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .type-btn:hover {
    background: var(--color-bg-card);
  }

  .type-btn.active {
    background: var(--color-diaper-light);
    border-color: var(--color-diaper);
  }

  .type-icon {
    font-size: var(--font-size-2xl);
  }

  .toggle-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  .toggle {
    position: relative;
    width: 52px;
    height: 32px;
    background: var(--color-border);
    border: none;
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .toggle.active {
    background: var(--color-warning);
  }

  .toggle-handle {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 24px;
    height: 24px;
    background: white;
    border-radius: 50%;
    transition: transform var(--transition-fast);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .toggle.active .toggle-handle {
    transform: translateX(20px);
  }
</style>
