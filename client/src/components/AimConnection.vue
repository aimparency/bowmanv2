<template>
  <g class="aim-connection">
    <!-- Connection path -->
    <path
      :d="pathData"
      :stroke="connectionColor"
      :stroke-width="strokeWidth"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="connection-path"
      @click="handleConnectionClick"
    />
    
    <!-- Arrow head -->
    <path
      :d="arrowPath"
      :fill="connectionColor"
      class="arrow-head"
      @click="handleConnectionClick"
    />
    
    <!-- Control handles (visible when selected) -->
    <g v-if="selected" class="connection-handles">
      <!-- Midpoint handle for adjusting curvature -->
      <circle
        :cx="controlPoints.midpoint[0]"
        :cy="controlPoints.midpoint[1]"
        r="6"
        fill="#007bff"
        stroke="white"
        stroke-width="2"
        class="control-handle"
        @mousedown="handleControlMouseDown"
        style="cursor: move;"
      />
      
      <!-- Control point visualization -->
      <line
        :x1="controlPoints.start[0]"
        :y1="controlPoints.start[1]"
        :x2="controlPoints.control1[0]"
        :y2="controlPoints.control1[1]"
        stroke="#999"
        stroke-width="1"
        stroke-dasharray="3,3"
        opacity="0.7"
      />
      <line
        :x1="controlPoints.end[0]"
        :y1="controlPoints.end[1]"
        :x2="controlPoints.control2[0]"
        :y2="controlPoints.control2[1]"
        stroke="#999"
        stroke-width="1"
        stroke-dasharray="3,3"
        opacity="0.7"
      />
    </g>
    
    <!-- Connection label -->
    <text
      v-if="showLabel"
      :x="controlPoints.midpoint[0]"
      :y="controlPoints.midpoint[1] - 10"
      text-anchor="middle"
      class="connection-label"
      :font-size="labelFontSize"
    >
      {{ connection.type }}
    </text>
  </g>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Vec2 } from '../utils/vec2';
import { getConnectionControlPoints } from '../utils/makeCircularPath';
import * as vec2 from '../utils/vec2';

interface Connection {
  from: string;
  to: string;
  type: string;
  curvature?: number;
}

interface Props {
  connection: Connection;
  aims: Map<string, Vec2>;
  selected?: boolean;
  showLabel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  showLabel: true
});

const emit = defineEmits<{
  'select': [connection: Connection];
  'update-curvature': [connection: Connection, curvature: number];
}>();

// Connection styling
const strokeWidth = computed(() => {
  const baseWidth = 3;
  const typeWidths = {
    'prerequisite': 4,
    'enables': 3,
    'supports': 2,
    'related': 1.5
  };
  return typeWidths[props.connection.type as keyof typeof typeWidths] || baseWidth;
});

const connectionColor = computed(() => {
  const typeColors = {
    'prerequisite': '#dc3545', // Red for prerequisites
    'enables': '#28a745',      // Green for enabling
    'supports': '#007bff',     // Blue for supporting
    'related': '#6c757d'       // Gray for related
  };
  return typeColors[props.connection.type as keyof typeof typeColors] || '#333';
});

const labelFontSize = computed(() => Math.max(10, strokeWidth.value * 3));

// Position calculations
const nodeRadius = 40; // Default node radius

const fromPos = computed(() => props.aims.get(props.connection.from) || [0, 0] as Vec2);
const toPos = computed(() => props.aims.get(props.connection.to) || [0, 0] as Vec2);

const controlPoints = computed(() => {
  const curvature = props.connection.curvature || 0.3;
  return getConnectionControlPoints(
    { pos: fromPos.value, r: nodeRadius },
    { pos: toPos.value, r: nodeRadius },
    curvature
  );
});

// Path generation
const pathData = computed(() => {
  const cp = controlPoints.value;
  return `M ${cp.start[0]} ${cp.start[1]} C ${cp.control1[0]} ${cp.control1[1]}, ${cp.control2[0]} ${cp.control2[1]}, ${cp.end[0]} ${cp.end[1]}`;
});

const arrowPath = computed(() => {
  const cp = controlPoints.value;
  const arrowSize = strokeWidth.value * 2;
  
  // Calculate arrow direction
  const direction = vec2.crSub(cp.end, cp.control2);
  vec2.normalize(direction, direction);
  
  // Arrow points
  const arrowTip = cp.end;
  const arrowBase = vec2.crSub(arrowTip, vec2.crScale(direction, arrowSize));
  
  // Perpendicular for arrow wings
  const perpendicular: Vec2 = [-direction[1], direction[0]];
  const wing1 = vec2.crAdd(arrowBase, vec2.crScale(perpendicular, arrowSize * 0.5));
  const wing2 = vec2.crSub(arrowBase, vec2.crScale(perpendicular, arrowSize * 0.5));
  
  return `M ${arrowTip[0]} ${arrowTip[1]} L ${wing1[0]} ${wing1[1]} L ${wing2[0]} ${wing2[1]} Z`;
});

// Interaction handlers
const handleConnectionClick = (event: MouseEvent) => {
  emit('select', props.connection);
  event.stopPropagation();
};

// Control handle dragging
const isDragging = ref(false);
const dragStartPos = ref<Vec2>([0, 0]);
const initialCurvature = ref(0);

const handleControlMouseDown = (event: MouseEvent) => {
  if (event.button === 0) {
    isDragging.value = true;
    initialCurvature.value = props.connection.curvature || 0.3;
    
    // Get mouse position in SVG coordinates
    const svg = (event.target as SVGElement).ownerSVGElement!;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    
    dragStartPos.value = [svgP.x, svgP.y];
    
    document.addEventListener('mousemove', handleControlMouseMove);
    document.addEventListener('mouseup', handleControlMouseUp);
    
    event.stopPropagation();
    event.preventDefault();
  }
};

const handleControlMouseMove = (event: MouseEvent) => {
  if (isDragging.value) {
    const svg = document.querySelector('.aim-graph') as SVGSVGElement;
    if (svg) {
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      
      // Calculate how far the handle has moved perpendicular to the connection
      const connectionVector = vec2.crSub(toPos.value, fromPos.value);
      const connectionLength = vec2.len(connectionVector);
      
      if (connectionLength > 0) {
        vec2.normalize(connectionVector, connectionVector);
        const perpendicular: Vec2 = [-connectionVector[1], connectionVector[0]];
        
        const midpoint = vec2.crAdd(fromPos.value, toPos.value);
        vec2.scale(midpoint, midpoint, 0.5);
        
        const mouseOffset = vec2.crSub([svgP.x, svgP.y] as Vec2, midpoint);
        const perpendicularDistance = vec2.dot(mouseOffset, perpendicular);
        
        // Convert to curvature (normalized by connection length)
        const newCurvature = perpendicularDistance / connectionLength;
        
        // Clamp curvature to reasonable bounds
        const clampedCurvature = Math.max(-1, Math.min(1, newCurvature));
        
        emit('update-curvature', props.connection, clampedCurvature);
      }
    }
  }
};

const handleControlMouseUp = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleControlMouseMove);
  document.removeEventListener('mouseup', handleControlMouseUp);
};

</script>

<style scoped>
.aim-connection {
  pointer-events: all;
}

.connection-path {
  cursor: pointer;
  transition: stroke-width 0.2s;
}

.connection-path:hover {
  stroke-width: calc(var(--stroke-width, 3) + 1);
}

.arrow-head {
  cursor: pointer;
}

.control-handle {
  cursor: move;
  transition: r 0.2s;
}

.control-handle:hover {
  r: 8;
}

.connection-label {
  font-family: system-ui, sans-serif;
  font-weight: 500;
  fill: #333;
  pointer-events: none;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
}
</style>