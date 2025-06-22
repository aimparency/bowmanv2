<template>
  <g 
    class="aim-node"
    :transform="`translate(${position[0]}, ${position[1]})`"
    @mousedown="handleMouseDown"
    @click="handleClick"
  >
    <!-- Main circle -->
    <circle
      :r="radius"
      :fill="statusColor"
      :stroke="selected ? '#007bff' : '#333'"
      :stroke-width="selected ? 3 : 1"
      class="aim-circle"
    />
    
    <!-- Title text -->
    <text
      text-anchor="middle"
      dominant-baseline="central"
      class="aim-title"
      :font-size="fontSize"
    >
      <tspan 
        v-for="(line, index) in titleLines" 
        :key="index"
        :x="0"
        :dy="index === 0 ? (-0.3 * (titleLines.length - 1)) + 'em' : '1.2em'"
      >
        {{ line }}
      </tspan>
    </text>
    
    <!-- Status indicator -->
    <circle
      v-if="aim.status === 'reached'"
      :r="radius * 0.25"
      :cx="radius * 0.6"
      :cy="-radius * 0.6"
      fill="#28a745"
      stroke="white"
      stroke-width="2"
      class="status-indicator"
    />
    
    <!-- Tags indicator -->
    <rect
      v-if="aim.tags && aim.tags.length > 0"
      :x="-radius * 0.9"
      :y="-radius * 0.9"
      :width="radius * 0.5"
      :height="radius * 0.3"
      fill="#007bff"
      stroke="white"
      stroke-width="1"
      rx="3"
      class="tag-indicator"
    />
    <text
      v-if="aim.tags && aim.tags.length > 0"
      :x="-radius * 0.65"
      :y="-radius * 0.75"
      text-anchor="middle"
      dominant-baseline="central"
      :font-size="radius * 0.2"
      fill="white"
      class="tag-count"
    >
      {{ aim.tags.length }}
    </text>
  </g>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Aim } from '../services/api';
import type { Vec2 } from '../utils/vec2';

interface Props {
  aim: Aim;
  position: Vec2;
  selected: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'select': [aimId: string];
  'drag': [aimId: string, position: Vec2];
}>();

// Node properties
const radius = computed(() => {
  // Base radius with some variation based on effort or content
  const baseRadius = 40;
  const effort = props.aim.metadata?.effort || 1;
  return Math.max(30, Math.min(60, baseRadius + effort * 2));
});

const fontSize = computed(() => {
  // Adjust font size based on radius
  return Math.max(10, radius.value / 4);
});

const titleLines = computed(() => {
  // Break title into multiple lines if too long
  const maxCharsPerLine = Math.max(8, Math.floor(radius.value / 3));
  const words = props.aim.title.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  // Limit to 3 lines
  return lines.slice(0, 3).map(line => 
    line.length > maxCharsPerLine ? line.substring(0, maxCharsPerLine - 1) + '…' : line
  );
});

const statusColor = computed(() => {
  switch (props.aim.status) {
    case 'reached': return '#d4edda';
    default: return '#e3f2fd'; // not_reached
  }
});

// Drag state
const isDragging = ref(false);
const dragOffset = ref<Vec2>([0, 0]);

const handleClick = (event: MouseEvent) => {
  if (!isDragging.value) {
    emit('select', props.aim.id.id);
  }
  event.stopPropagation();
};

const handleMouseDown = (event: MouseEvent) => {
  if (event.button === 0) { // Left click only
    isDragging.value = true;
    
    // Calculate offset from node center to mouse position
    const svg = (event.target as SVGElement).ownerSVGElement!;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    
    dragOffset.value = [
      svgP.x - props.position[0],
      svgP.y - props.position[1]
    ];
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    event.stopPropagation();
    event.preventDefault();
  }
};

const handleMouseMove = (event: MouseEvent) => {
  if (isDragging.value) {
    const svg = document.querySelector('.aim-graph') as SVGSVGElement;
    if (svg) {
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      
      const newPosition: Vec2 = [
        svgP.x - dragOffset.value[0],
        svgP.y - dragOffset.value[1]
      ];
      
      emit('drag', props.aim.id.id, newPosition);
    }
  }
};

const handleMouseUp = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
};
</script>

<style scoped>
.aim-node {
  cursor: pointer;
}

.aim-circle {
  transition: stroke-width 0.2s, stroke 0.2s;
}

.aim-circle:hover {
  stroke-width: 2;
}

.aim-title {
  pointer-events: none;
  font-family: system-ui, sans-serif;
  font-weight: 500;
  fill: #333;
}

.aim-node:hover .aim-title {
  font-weight: 600;
}
</style>