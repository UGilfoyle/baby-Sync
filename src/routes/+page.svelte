<script lang="ts">
  import { familyId, familyCode, todayStats, activities, createFamily, joinFamily } from '$lib/stores/activities';
  import { formatTime, timeAgo, getActivityIcon, getFeedingLabel, getDiaperLabel, formatDuration } from '$lib/utils/formatters';
  import type { Activity, FeedingData, SleepData, DiaperData } from '$lib/stores/activities';

  let showModal = false;
  let joinCode = '';
  let babyNameInput = 'Baby';
  let isLoading = false;
  let errorMsg = '';

  $: if (!$familyId) {
    showModal = true;
  }

  async function handleCreate() {
    if (!babyNameInput.trim()) return;
    isLoading = true;
    errorMsg = '';
    try {
      await createFamily(babyNameInput.trim());
      showModal = false;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to create family';
    } finally {
      isLoading = false;
    }
  }

  async function handleJoin() {
    if (joinCode.length < 6) return;
    isLoading = true;
    errorMsg = '';
    try {
      await joinFamily(joinCode);
      showModal = false;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Invalid code';
    } finally {
      isLoading = false;
    }
  }

  function getActivitySubtitle(activity: Activity): string {
    const data = activity.data;
    
    if (activity.type === 'feeding') {
      const f = data as FeedingData;
      let text = getFeedingLabel(f.feedType);
      if (f.amount) text += ` • ${f.amount}${f.unit || 'oz'}`;
      return text;
    }
    
    if (activity.type === 'sleep') {
      if (activity.ended_at) {
        return formatDuration(activity.ended_at - activity.started_at);
      }
      return 'In progress...';
    }
    
    if (activity.type === 'diaper') {
      const d = data as DiaperData;
      return getDiaperLabel(d.diaperType);
    }
    
    return '';
  }
</script>

<div class="page">
  <div class="container">
    <!-- Setup Modal -->
    {#if showModal}
      <div class="modal-overlay">
        <div class="modal-content">
          <span class="welcome-emoji">👶💕</span>
          <h2 class="text-center mb-md">Welcome, Mama!</h2>
          <p class="text-center text-muted mb-md">
            Your little one's journey starts here. Track feedings, naps & diaper changes with ease.
          </p>

          <div class="join-form">
            <div class="form-group">
              <label for="babyName">Your Baby's Name</label>
              <input
                type="text"
                id="babyName"
                bind:value={babyNameInput}
                placeholder="Enter your angel's name 👼"
              />
            </div>

            <button
              class="btn btn-primary btn-large btn-block"
              on:click={handleCreate}
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : '💕 Start Tracking'}
            </button>

            <div class="divider">or sync with partner</div>

            <div class="form-group">
              <label for="joinCode">Partner's Code</label>
              <input
                type="text"
                id="joinCode"
                bind:value={joinCode}
                placeholder="Enter 6-digit code"
                maxlength="6"
                style="text-transform: uppercase; letter-spacing: 0.2em; text-align: center;"
              />
            </div>

            <button
              class="btn btn-outline btn-block"
              on:click={handleJoin}
              disabled={isLoading || joinCode.length < 6}
            >
              {isLoading ? 'Joining...' : '👨‍👩‍👧 Join Family'}
            </button>

            {#if errorMsg}
              <p style="color: var(--color-error); text-align: center; font-size: var(--font-size-sm);">
                {errorMsg}
              </p>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Family Code Display -->
    {#if $familyCode}
      <div class="card mb-section" style="text-align: center; margin-bottom: var(--space-lg);">
        <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--space-xs);">
          Share this code with your partner
        </p>
        <p class="family-code-inline">{$familyCode}</p>
      </div>
    {/if}

    <!-- Today's Summary -->
    <section class="section">
      <h3 class="section-title">Today's Summary</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🍼</div>
          <div class="stat-value">{$todayStats.feedingCount}</div>
          <div class="stat-label">Feeds</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">😴</div>
          <div class="stat-value">{$todayStats.sleepHours}h</div>
          <div class="stat-label">Sleep</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🧷</div>
          <div class="stat-value">{$todayStats.diaperCount}</div>
          <div class="stat-label">Diapers</div>
        </div>
      </div>
    </section>

    <!-- Quick Actions -->
    <section class="section">
      <h3 class="section-title">Quick Actions</h3>
      <div class="quick-actions">
        <a href="/feeding" class="btn btn-feeding btn-large btn-block">
          🍼 Log Feeding
        </a>
        <a href="/sleep" class="btn btn-sleep btn-large btn-block">
          😴 Track Sleep
        </a>
        <a href="/diaper" class="btn btn-diaper btn-large btn-block">
          🧷 Log Diaper
        </a>
      </div>
    </section>

    <!-- Recent Activity -->
    <section class="section">
      <h3 class="section-title">Recent Activity</h3>
      {#if $activities.length === 0}
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <p>No activities yet</p>
          <p style="font-size: var(--font-size-sm);">Start tracking using the buttons above</p>
        </div>
      {:else}
        <div class="timeline">
          {#each $activities.slice(0, 10) as activity (activity.id)}
            <div class="activity-card">
              <div class="activity-icon {activity.type}">
                {getActivityIcon(activity.type)}
              </div>
              <div class="activity-content">
                <div class="activity-title">
                  {activity.type === 'feeding' ? 'Feeding' : activity.type === 'sleep' ? 'Sleep' : 'Diaper'}
                </div>
                <div class="activity-subtitle">
                  {getActivitySubtitle(activity)}
                </div>
              </div>
              <div class="activity-time">
                <div>{formatTime(activity.started_at)}</div>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
                  {timeAgo(activity.started_at)}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .family-code-inline {
    font-size: var(--font-size-lg);
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--color-primary);
  }
</style>
