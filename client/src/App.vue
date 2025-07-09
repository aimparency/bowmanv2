<template>
  <div id="app">
    <header>
      <h1>Bowman - Aim Management</h1>
    </header>
    
    <main>
      <RepoSelector 
        v-if="!repoSelected"
        :loading="loading"
        :error="error"
        @repo-selected="handleRepoSelected"
        @clear-error="error = ''"
      />
      
      <div v-else class="aim-view">
        <button @click="resetRepo" class="back-button">← Change Repository</button>
        
        <div v-if="loading" class="loading">
          Loading aims...
        </div>
        
        <div v-else-if="aims.size > 0" class="aim-graph">
          <div class="graph-header">
            <h2>Aim Graph</h2>
            <div class="aim-stats">
              {{ aims.size }} aims • {{ contributions.size }} contributions
            </div>
          </div>
          
          <!-- Graph visualization -->
          <AimGraph
            :aims="aims"
            :contributions="contributions"
            @aim-selected="handleAimSelected"
          />
        </div>
        
        <div v-else class="empty-state">
          <h2>🎯 No aims found</h2>
          <p>This repository doesn't have any aims yet. Create your first aim to get started!</p>
          <button @click="showCreateAim = true" class="create-aim-button">
            ➕ Create First Aim
          </button>
        </div>
      </div>
    </main>
    
    <div v-if="error" class="error">{{ error }}</div>
    
    <!-- Initialization Dialog -->
    <InitDialog 
      :visible="showInitDialog"
      :loading="initLoading"
      :error="initError"
      @initialize="handleInitialize"
      @cancel="showInitDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import RepoSelector from './components/RepoSelector.vue';
import InitDialog from './components/InitDialog.vue';
import AimGraph from './components/AimGraph.vue';
import { BowmanAPI, type Aim, type Contribution, type ContributionReference, type AimId } from './services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const api = new BowmanAPI(API_BASE);

const loading = ref(false);
const error = ref('');
const repoSelected = ref(false);
const aims = reactive(new Map<string, Aim>());
const contributions = reactive(new Map<string, Contribution>());
const processedAims = new Set<string>();

// Initialization state
const showInitDialog = ref(false);
const initLoading = ref(false);
const initError = ref('');
const pendingRepoPath = ref('');

// UI state
const showCreateAim = ref(false);

const aimIdToString = (id: AimId): string => {
  return id.repoLink ? `${id.repoLink}#${id.id}` : id.id;
};

const handleRepoSelected = async (path: string) => {
  loading.value = true;
  error.value = '';
  
  try {
    // Set repository
    const response = await api.setRepository(path);
    
    if (response.initialized) {
      // Repository was auto-initialized
      repoSelected.value = true;
      const meta = await api.getMeta();
      await loadAimAndRelated(meta.rootAimId);
    } else {
      // Repository loaded successfully
      repoSelected.value = true;
      const meta = await api.getMeta();
      await loadAimAndRelated(meta.rootAimId);
    }
    
  } catch (err: any) {
    if (err.message.includes('No .quiver directory found')) {
      // Show initialization dialog
      pendingRepoPath.value = path;
      showInitDialog.value = true;
      error.value = '';
    } else {
      error.value = err instanceof Error ? err.message : 'Failed to load repository';
      repoSelected.value = false;
    }
  } finally {
    loading.value = false;
  }
};

const loadAimAndRelated = async (aimId: AimId) => {
  const aimKey = aimIdToString(aimId);
  
  // Skip if already processed
  if (processedAims.has(aimKey)) {
    return;
  }
  
  processedAims.add(aimKey);
  
  try {
    // Load the aim itself
    const aim = await api.getAim(aimKey);
    aims.set(aimKey, aim);
    
    // Load incoming contributions
    const incoming = await api.getAimContributions(aimId.id, 'from') as Contribution[];
    for (const contrib of incoming) {
      const contribKey = `${aimIdToString(contrib.fromAim)}->${aimIdToString(contrib.toAim)}`;
      contributions.set(contribKey, contrib);
      
      // Recursively load the source aim
      await loadAimAndRelated(contrib.fromAim);
    }
    
    // Load outgoing contribution references
    const outgoing = await api.getAimContributions(aimId.id, 'to') as ContributionReference[];
    for (const ref of outgoing) {
      // Recursively load the target aim
      await loadAimAndRelated(ref.targetAim);
    }
    
  } catch (err) {
    error.value = `Failed to load aim ${aimKey}: ${err instanceof Error ? err.message : 'Unknown error'}`;
  }
};

const handleInitialize = async (rootAim: any) => {
  initLoading.value = true;
  initError.value = '';
  
  try {
    // Initialize the repository
    await api.initializeRepository(pendingRepoPath.value, rootAim);
    
    // Now load the repository
    await api.setRepository(pendingRepoPath.value);
    repoSelected.value = true;
    
    // Load the created aim
    const meta = await api.getMeta();
    await loadAimAndRelated(meta.rootAimId);
    
    // Hide the dialog
    showInitDialog.value = false;
    pendingRepoPath.value = '';
    
  } catch (err) {
    initError.value = err instanceof Error ? err.message : 'Failed to initialize repository';
  } finally {
    initLoading.value = false;
  }
};

const handleAimSelected = (_aimId: string) => {
  // TODO: Show aim details in sidebar or modal
  // For now, just store the selected aim ID
  // Future implementation: open aim details modal
};

const resetRepo = () => {
  repoSelected.value = false;
  aims.clear();
  contributions.clear();
  processedAims.clear();
  error.value = '';
  showInitDialog.value = false;
  initError.value = '';
  pendingRepoPath.value = '';
};
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: #f5f5f5;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
  text-align: center;
}

header h1 {
  margin: 0;
  font-size: 1.5rem;
}

main {
  flex: 1;
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.back-button {
  background: none;
  border: 1px solid #ddd;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 1rem;
}

.back-button:hover {
  background-color: #f0f0f0;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.aim-graph {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.graph-header h2 {
  margin: 0;
  color: #333;
}

.aim-stats {
  color: #666;
  font-size: 0.9rem;
  background: #f8f9fa;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  border: 1px solid #e9ecef;
}

.error {
  background-color: #fee;
  color: #c33;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.empty-state h2 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 1.8em;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #666;
  font-size: 1.1em;
}

.create-aim-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 16px 32px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.create-aim-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.create-aim-button:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  main {
    padding: 0.5rem;
  }
  
  .aim-list {
    grid-template-columns: 1fr;
  }
  
  .empty-state {
    padding: 30px 15px;
  }
  
  .create-aim-button {
    width: 100%;
    padding: 14px 24px;
    font-size: 16px;
  }
}
</style>
