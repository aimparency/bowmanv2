<template>
  <div class="aim-graph-container">
    <svg 
      ref="svg"
      class="aim-graph"
      :viewBox="viewBox"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove" 
      @mouseup="handleMouseUp"
      @wheel="handleWheel"
    >
      <!-- Background -->
      <rect 
        :x="bounds.x" 
        :y="bounds.y" 
        :width="bounds.width" 
        :height="bounds.height"
        fill="#f8f9fa" 
        stroke="none"
      />
      
      <!-- Grid pattern -->
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e1e5e9" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect 
        :x="bounds.x" 
        :y="bounds.y" 
        :width="bounds.width" 
        :height="bounds.height"
        fill="url(#grid)" 
      />
      
      <!-- Transform group for zoom/pan -->
      <g :transform="transform">
        <!-- Connections first (behind nodes) -->
        <AimConnection 
          v-for="connection in connections" 
          :key="`${connection.from}-${connection.to}`"
          :connection="connection"
          :aims="aimPositions"
        />
        
        <!-- Aim nodes -->
        <AimNode 
          v-for="aim in aimsArray" 
          :key="aim.id.id"
          :aim="aim"
          :position="aimPositions.get(aim.id.id)!"
          :selected="selectedAim === aim.id.id"
          @select="selectAim"
          @drag="handleAimDrag"
        />
      </g>
    </svg>
    
    <!-- Controls -->
    <div class="graph-controls">
      <button @click="resetView" title="Reset view">🎯</button>
      <button @click="zoomIn" title="Zoom in">➕</button>
      <button @click="zoomOut" title="Zoom out">➖</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import type { Aim, Contribution } from '../services/api';
import AimNode from './AimNode.vue';
import AimConnection from './AimConnection.vue';
import * as vec2 from '../utils/vec2';

interface Props {
  aims: Map<string, Aim>;
  contributions: Map<string, Contribution>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'aim-selected': [aimId: string];
}>();

// SVG dimensions
const width = 800;
const height = 600;
const bounds = {
  x: -width / 2,
  y: -height / 2,
  width,
  height
};

// View state
const viewState = reactive({
  offset: [0, 0] as vec2.Vec2,
  scale: 1,
  minScale: 0.1,
  maxScale: 5
});

// Interaction state
const isDragging = ref(false);
const dragStart = ref<vec2.Vec2>([0, 0]);
const selectedAim = ref<string | null>(null);

// Computed properties
const viewBox = computed(() => {
  const x = bounds.x - viewState.offset[0];
  const y = bounds.y - viewState.offset[1];
  const w = bounds.width / viewState.scale;
  const h = bounds.height / viewState.scale;
  return `${x} ${y} ${w} ${h}`;
});

const transform = computed(() => {
  return `translate(${viewState.offset[0]}, ${viewState.offset[1]}) scale(${viewState.scale})`;
});

const aimsArray = computed(() => Array.from(props.aims.values()));

// Aim positioning
const aimPositions = reactive(new Map<string, vec2.Vec2>());

const connections = computed(() => {
  const result: Array<{from: string, to: string, type: string}> = [];
  
  for (const contribution of props.contributions.values()) {
    result.push({
      from: contribution.fromAim.id,
      to: contribution.toAim.id,
      type: contribution.type
    });
  }
  
  return result;
});

// Initialize aim positions
const initializePositions = () => {
  const aims = Array.from(props.aims.values());
  const center: vec2.Vec2 = [0, 0];
  const radius = 200;
  
  aims.forEach((aim, index) => {
    // Use metadata position if available, otherwise arrange in circle
    if (aim.metadata?.position) {
      aimPositions.set(aim.id.id, [aim.metadata.position.x - 400, aim.metadata.position.y - 200]);
    } else {
      const angle = (index / aims.length) * 2 * Math.PI;
      const pos: vec2.Vec2 = [
        center[0] + Math.cos(angle) * radius,
        center[1] + Math.sin(angle) * radius
      ];
      aimPositions.set(aim.id.id, pos);
    }
  });
};

// Event handlers
const handleMouseDown = (event: MouseEvent) => {
  if (event.button === 0) { // Left click
    isDragging.value = true;
    dragStart.value = [event.clientX, event.clientY];
  }
};

const handleMouseMove = (event: MouseEvent) => {
  if (isDragging.value) {
    const dx = event.clientX - dragStart.value[0];
    const dy = event.clientY - dragStart.value[1];
    
    viewState.offset[0] += dx / viewState.scale;
    viewState.offset[1] += dy / viewState.scale;
    
    dragStart.value = [event.clientX, event.clientY];
  }
};

const handleMouseUp = () => {
  isDragging.value = false;
};

const handleWheel = (event: WheelEvent) => {
  event.preventDefault();
  
  const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(viewState.minScale, Math.min(viewState.maxScale, viewState.scale * scaleFactor));
  
  if (newScale !== viewState.scale) {
    viewState.scale = newScale;
  }
};

const selectAim = (aimId: string) => {
  selectedAim.value = aimId;
  emit('aim-selected', aimId);
};

const handleAimDrag = (aimId: string, newPosition: vec2.Vec2) => {
  aimPositions.set(aimId, newPosition);
};

// Controls
const resetView = () => {
  viewState.offset = [0, 0];
  viewState.scale = 1;
};

const zoomIn = () => {
  viewState.scale = Math.min(viewState.maxScale, viewState.scale * 1.2);
};

const zoomOut = () => {
  viewState.scale = Math.max(viewState.minScale, viewState.scale / 1.2);
};

// Watch for changes in aims
const updatePositions = () => {
  const newAims = Array.from(props.aims.values());
  
  // Add positions for new aims
  newAims.forEach(aim => {
    if (!aimPositions.has(aim.id.id)) {
      if (aim.metadata?.position) {
        aimPositions.set(aim.id.id, [aim.metadata.position.x - 400, aim.metadata.position.y - 200]);
      } else {
        // Place new aims near existing ones or at center
        const existingPositions = Array.from(aimPositions.values());
        if (existingPositions.length > 0) {
          const avgX = existingPositions.reduce((sum, pos) => sum + pos[0], 0) / existingPositions.length;
          const avgY = existingPositions.reduce((sum, pos) => sum + pos[1], 0) / existingPositions.length;
          const offset = (Math.random() - 0.5) * 100;
          aimPositions.set(aim.id.id, [avgX + offset, avgY + offset]);
        } else {
          aimPositions.set(aim.id.id, [0, 0]);
        }
      }
    }
  });
  
  // Remove positions for deleted aims
  const currentAimIds = new Set(newAims.map(aim => aim.id.id));
  for (const aimId of aimPositions.keys()) {
    if (!currentAimIds.has(aimId)) {
      aimPositions.delete(aimId);
    }
  }
};

onMounted(() => {
  initializePositions();
  updatePositions();
});

// Watch for prop changes
const unwatchAims = () => {
  updatePositions();
};

// Call updatePositions when aims change
const observer = new MutationObserver(unwatchAims);
</script>

<style scoped>
.aim-graph-container {
  position: relative;
  width: 100%;
  height: 500px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.aim-graph {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.aim-graph:active {
  cursor: grabbing;
}

.graph-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.graph-controls button {
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.graph-controls button:hover {
  background: #f0f0f0;
}

@media (max-width: 768px) {
  .aim-graph-container {
    height: 400px;
  }
  
  .graph-controls {
    top: 5px;
    right: 5px;
  }
  
  .graph-controls button {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
}
</style>