<script lang="ts">
  import { onMount } from 'svelte';
  import { familyId, fetchActivities, babyName } from '$lib/stores/activities';
  import { connectWebSocket, disconnectWebSocket, syncStatus } from '$lib/stores/sync';
  import '../app.css';

  let showSetup = false;

  $: if ($familyId) {
    showSetup = false;
    connectWebSocket();
    fetchActivities();
  } else {
    showSetup = true;
  }

  onMount(() => {
    return () => {
      disconnectWebSocket();
    };
  });

  function getSyncLabel(status: string): string {
    switch (status) {
      case 'connected': return 'Synced';
      case 'connecting': return 'Syncing...';
      case 'error': return 'Sync error';
      default: return 'Offline';
    }
  }
</script>

<svelte:head>
  <title>Baby Sync - {$babyName}</title>
  <meta name="description" content="Track your baby's feeding, sleeping, and diaper changes in real-time" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <meta name="theme-color" content="#ff6b9d" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Baby Sync" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/icons/icon-192.png" />
  <link rel="manifest" href="/manifest.json" />
</svelte:head>

<div class="app">
  {#if !showSetup}
    <header class="header">
      <div class="header-title">
        <span class="header-icon">👶</span>
        <span>{$babyName}</span>
      </div>
      <div class="sync-indicator">
        <span class="sync-dot" class:offline={$syncStatus === 'disconnected' || $syncStatus === 'error'} class:syncing={$syncStatus === 'connecting'}></span>
        <span>{getSyncLabel($syncStatus)}</span>
      </div>
    </header>
  {/if}

  <main>
    <slot />
  </main>
</div>

<style>
  .app {
    min-height: 100vh;
    min-height: 100dvh;
  }

  main {
    padding-bottom: env(safe-area-inset-bottom);
  }
</style>
