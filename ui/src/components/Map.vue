<template>
  <svg 
    ref="canvas"
    class='aim-map'
    :viewBox="viewBox">
    <defs>
      <pattern id="unpublished" width="1" height="1" patternTransform="scale(0.8) rotate(-45 0 0)" patternUnits="userSpaceOnUse">
        <rect x1="0" y1="0" width="1" height="0.5" style="stroke:none; fill:#2222" />
      </pattern>
      <linearGradient v-for="color, key in summitColors" :key="key" 
        :id="'summit-gradient-' + key"
        gradientTransform="rotate(90)">
        <stop offset="0%"  :stop-color="color + '27'" />
        <stop offset="100%" :stop-color="color + '00'" />
      </linearGradient>
      <pattern v-for="y, i in summitYs" :id="'range-'+i" 
        :width="2" :height="1" patternUnits="userSpaceOnUse"
        :patternTransform="`scale(${logicalHalfSide * y}) translate(${map.offset[0] * 0.3 / logicalHalfSide * map.scale},0)`">
        <path 
          :d="summitPath" 
          :fill="`url(#summit-gradient-${i})`" />
      </pattern>
    </defs>
    <rect v-for="y, i in summitYs" :x="-logicalHalfSide * map.xratio" :y="(y - 1) * logicalHalfSide"
      :width="2 * logicalHalfSide * map.xratio" :height="y * logicalHalfSide" 
      :fill="`url(#range-${i})`" />
    <g :transform="transform">
      <FlowSVG v-for="flow in flows" 
        :key="`${flow.from.id}x${flow.into.id}`"
        :flow="flow"/>
      <Connector 
        v-if="map.connecting && map.connectFrom !== undefined"
        :connectFrom="map.connectFrom"/>
      <AimSVG v-for="aim in aims" 
        :key="aim.id"
        :aim="aim"/>
      <FlowHandle v-if="showLayoutHandles"
        :flow="aimNetwork.selectedFlow!"/>
      <!--rect
        :x="- map.offset[0] - LOGICAL_HALF_SIDE * map.xratio * 0.5 / map.scale"
        :y="- map.offset[1] - LOGICAL_HALF_SIDE * map.yratio * 0.5 / map.scale"
        :width="LOGICAL_HALF_SIDE * map.xratio / map.scale"
        :height="LOGICAL_HALF_SIDE * map.yratio / map.scale"
        stroke="#0f0"
        fill="none"
      /-->
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent, markRaw, toRaw } from "vue";

import AimSVG from './AimSVG.vue';
import FlowSVG from './FlowSVG.vue';
import Connector from './Connector.vue';
import FlowHandle from './FlowHandleSVG.vue';

import { Aim, Flow, useAimNetwork, randomAimColor, toHexColor } from '../stores/aim-network'
import { useMap, LOGICAL_HALF_SIDE } from '../stores/map'
import { useUi } from '../stores/ui'

import boxIntersect from 'box-intersect'

import * as vec2 from '../vec2'

const outerMarginFactor = 2
const hShift = vec2.create()

const summitPath: string = [
  'M', 0, 1,
  'L', 1, 0,
  'L', 2, 1,
  'Z'
].join(' ') 
const summitColors: string[] = []
const summitYs: number[] = []

for (let i = 0; i < 6; i++) {
  summitColors[i] = toHexColor(randomAimColor())
  summitYs[i] = 1 / (2 ** i) 
}

export default defineComponent({
  name: "Map",
  components: {
    AimSVG, 
    FlowSVG, 
    Connector, 
    FlowHandle, 
  },
  data() {
    return {
      summitPath,
      summitColors,
      summitYs, 
      logicalHalfSide: LOGICAL_HALF_SIDE,
      aimNetwork: useAimNetwork(),
      map: useMap(), 
      breakFromAnimLoop: false,
      layoutingHandlePos: vec2.create(),
      reusableLayoutCalcArrays: markRaw({
        r: new Array<number>(),
        pos: new Array<vec2.T>(), 
        boxes: new Array<number[]>(),
      })
    }
  }, 
  props: {
    msg: String,
  },
  mounted() {
    const canvas = this.$refs.canvas as SVGElement

    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    }, false);

    const updateHalfSide = () => {
      let w = canvas.clientWidth 
      let h = canvas.clientHeight
      if(w > h) {
        this.map.clientOffset = [(w - h) / 2, 0]
        this.map.halfSide = h / 2
        this.map.xratio = w/h
        this.map.yratio = 1
      } else {
        this.map.clientOffset = [0, (h - w) / 2]
        this.map.halfSide = w / 2
        this.map.xratio = 1
        this.map.yratio = h/w
      }
    }
    window.addEventListener("resize", updateHalfSide)
    updateHalfSide()

    const updatePan = (d: vec2.T) => {
      const pb = this.map.panBeginning; 
      if(pb !== undefined) {
        vec2.scale(d, d, LOGICAL_HALF_SIDE / (this.map.halfSide * this.map.scale)) 
        const offset = vec2.clone(pb.offset)
        vec2.sub(offset, offset, d)
        this.map.offset = offset  
      }
    }

    const updateDrag = (d: vec2.T) => {
      const db = this.map.dragBeginning;
      const aim = this.map.dragCandidate; 
      if(db && aim) {
        vec2.scale(d, d, LOGICAL_HALF_SIDE / (this.map.halfSide * this.map.scale)) 
        const pos = vec2.clone(db.pos)
        vec2.sub(pos, pos, d) 
        aim.pos = pos
      }
    }

    const updateLayout = (d: vec2.T) => {
      const lc = this.map.layoutCandidate
      if(lc) {
        vec2.scale(d, d, LOGICAL_HALF_SIDE / (this.map.halfSide * this.map.scale)) 
        vec2.sub(this.layoutingHandlePos, lc.start, d)

        this.updateRelativeDeltaWhileLayouting()
      }
    }

    // I think it's not nice that mousedown etc. events have to reach the map component. 
    const beginWhatever = (mouse: vec2.T) => {
      this.map.updateMouse(mouse) 
      this.map.mousePhysBegin = vec2.clone(mouse)
      if(this.map.dragCandidate) {
        beginDrag(this.map.dragCandidate)
      } else if(this.map.layoutCandidate) {
        beginLayout()
        updateLayout(vec2.create())
      } else if(this.map.connectFrom) {
        beginConnect()
      } else {
        beginPan() 
      } 
    }

    const beginPan = () => {
      this.map.panBeginning = {
        offset: vec2.clone(this.map.offset)
      }
    }

    const beginDrag = (aim: Aim) => {
      this.map.dragBeginning = {
        pos: vec2.clone(aim.pos) 
      }
    }

    const beginLayout = () => {
      this.map.layouting = true
    }

    const beginConnect = () => {
      this.map.connecting = true
    }

    const endWhatever = () : void => {
      if(this.map.panBeginning) {
        endPan(); 
      } else if (this.map.dragBeginning) {
        endDrag();
      } else if(this.map.layouting) {
        endLayout();
      } else if(this.map.connecting) {
        endConnect(); 
      }
      setTimeout(() => { this.map.cursorMoved = false })
    }

    const endPan = () => {
      delete this.map.panBeginning; 
    }

    const endDrag = () => {
      delete this.map.dragBeginning; 
      delete this.map.dragCandidate; 
    }

    const endLayout = () => {
      this.map.layouting = false; 
      delete this.map.layoutCandidate;
    }

    const endConnect = () => {
      delete this.map.connectFrom 
      this.map.connecting = false; 
    }

    const updateWhatever = (mouse: vec2.T) : void => {
      this.map.updateMouse(mouse)
      const d = vec2.crSub(this.map.mousePhysBegin, mouse)
      if(vec2.len2(d) > 25 || this.map.cursorMoved) {
        let actionOngoing = true
        if(this.map.panBeginning) {
          updatePan(d); 
        } else if (this.map.dragBeginning) {
          updateDrag(d); 
        } else if (this.map.layouting) {
          updateLayout(d); 
        } else if (this.map.connecting) {
          // nothing but important for else branch
        } else {
          actionOngoing = false
        }
        if(actionOngoing) {
          this.map.cursorMoved = true
          this.map.stopAnim()
        }
      }
    }

    canvas.addEventListener("mousemove", (e: MouseEvent) => {
      updateWhatever([e.clientX, e.clientY])
    })

    canvas.addEventListener("mousedown", (e: MouseEvent) => {
      const mouse = vec2.fromValues(e.clientX, e.clientY)
      beginWhatever(mouse)
    })

    canvas.addEventListener("mouseup", () => {
      endWhatever() 
    })

    canvas.addEventListener("wheel", (e: WheelEvent) => {
      const mouse = vec2.fromValues(e.clientX, e.clientY)
      const f = Math.pow(1.1, -e.deltaY / 150)
      this.map.zoom(f, mouse) 
    })

    let touch = {
      currentCount: 0, 
      dragFingerId: 0, 
    }
    let pinchBeginning: undefined | {
      first: number, 
      second: number, 
      mLogical: vec2.T, 
      distancePage: number, 
      offset: vec2.T, 
      scale: number, 
    };
    canvas.addEventListener("touchstart", (e: TouchEvent) => { 
      if(e.touches.length > 0) {
        if(e.touches.length > 1) {
          // 2 or more touches         
          if(touch.currentCount < 2) {
            this.map.connectFrom = undefined
            touch.currentCount = 2
            // page coordinates
            let firstPage = vec2.fromValues(e.touches[0].clientX, e.touches[0].clientY)
            let secondPage = vec2.fromValues(e.touches[1].clientX, e.touches[1].clientY)
            let mPhysical = vec2.clone(firstPage) 
            vec2.add(mPhysical, mPhysical, secondPage) 
            vec2.scale(mPhysical, mPhysical, 0.5) 
            let mLogical = this.map.physicalToLogicalCoord(mPhysical) 
            // model/svg coordinates
            pinchBeginning = {
              first: e.touches[0].identifier, 
              second: e.touches[1].identifier, 
              mLogical, 
              distancePage: vec2.dist(firstPage, secondPage), 
              offset: vec2.clone(this.map.offset), 
              scale: this.map.scale
            }
          } 
        } else {
          // 1 touch
          if(touch.currentCount == 0) {
            // new touch 
            touch.currentCount = 1
            touch.dragFingerId = e.touches[0].identifier
            let mouse = vec2.fromValues(e.touches[0].clientX, e.touches[0].clientY)
            beginWhatever(mouse)
          } else if (touch.currentCount > 1) {
            // from 2 or more to 1
            pinchBeginning = undefined // end pinch
          }
        }
      }
    });

    canvas.addEventListener("touchmove", (e: TouchEvent) => { 
      e.preventDefault()
      if(touch.currentCount == 1) {
        let mouse = vec2.fromValues(e.touches[0].clientX, e.touches[0].clientY)
        updateWhatever(mouse)
      } else if (touch.currentCount > 1) {
        if(pinchBeginning) {
          // update pinch
          const map = this.map

          let firstPage = vec2.fromValues(e.touches[0].clientX, e.touches[0].clientY)
          let secondPage = vec2.fromValues(e.touches[1].clientX, e.touches[1].clientY)
          let distancePage = vec2.dist(firstPage, secondPage)

          let mPhysical = vec2.clone(firstPage) 
          vec2.add(mPhysical, mPhysical, secondPage) 
          vec2.scale(mPhysical, mPhysical, 0.5) 
          let mLogical = this.map.physicalToLogicalCoord(mPhysical) 

          // 
          let scaleChange = distancePage / pinchBeginning.distancePage 
          map.scale = pinchBeginning.scale * scaleChange

          vec2.sub(mLogical, mLogical, pinchBeginning.mLogical) 

          vec2.add(this.map.offset, this.map.offset, mLogical) 
        }
      }
    })

    const finishTouch = () => {
      if(touch.currentCount > 1) {
        pinchBeginning = undefined
      } 
      if(touch.currentCount > 0) {
        endWhatever()
      }
      touch.currentCount = 0
    }

    canvas.addEventListener("touchend", finishTouch) 
    canvas.addEventListener("touchcancel", finishTouch) 

    canvas.addEventListener("click", () => {
      if(!this.map.cursorMoved) {
        if(this.aimNetwork.selectedAim || this.aimNetwork.selectedFlow) {
          this.aimNetwork.deselect()
        } else {
          let ui = useUi()
          if(ui.sideMenuOpen) {
            ui.sideMenuOpen = false
          } else {
            this.aimNetwork.createAndSelectAim((aim: Aim) => {
              aim.pos = vec2.clone(this.map.mouse.logical)
              // r * scale soll 100 sein
              let tR = BigInt(Math.trunc(1000 * 150 / this.map.scale))
              tR *= tR
              aim.setTokens(tR)
              aim.tokensOnChain = 0n
            })
          }
        }
      }
    });
  
    this.transformAnim() 

    this.layout()
  }, 
  beforeUnmount() {
    this.breakFromAnimLoop = true
  },
  computed: {
    showLayoutHandles() {
      let selectedFlow = this.aimNetwork.selectedFlow
      return selectedFlow && selectedFlow.into.mayNetwork() && !selectedFlow.transactionPending
    }, 
    viewBox() : string {
      return [-1,-1,2,2].map((v: number) => v * LOGICAL_HALF_SIDE).join(' ')
    }, 
    transform() : string {
      return [
        `scale(${this.map.scale})`, 
        `translate(${this.map.offset[0]}, ${this.map.offset[1]})`, 
      ].join(' ')
    }, 
    flows() : Flow[] {
      let flows: Flow[] = []
      let flow = undefined
      for(let fromId in this.aimNetwork.flows) {
        let intoFlows = this.aimNetwork.flows[fromId]
        for(let intoId in intoFlows) {
          flow = intoFlows[intoId]
          if(flow !== this.aimNetwork.selectedFlow) {
            flows.push(intoFlows[intoId]) 
          }
        }
      }
      if(this.aimNetwork.selectedFlow) {
        flows.push(this.aimNetwork.selectedFlow) 
      }
      return flows; 
    }, 
    aims() : Aim[] {
      let aims = Object.values(this.aimNetwork.aims)
      let selectedAim = this.aimNetwork.selectedAim
      if(selectedAim) {
        aims = aims.filter(aim => aim !== selectedAim)
      }
      aims = aims.filter(aim => aim.loadLevel < 0).concat(
        aims.filter(aim => aim.loadLevel >= 0)
      )
      if(selectedAim) {
        aims.push(selectedAim)
      }
      return aims
    }, 
  },
  methods: {
    transformAnim() {
      if(this.map.anim.update !== undefined) {
        this.map.anim.update()
      }
      if(!this.breakFromAnimLoop) {
        requestAnimationFrame(() => {
          this.transformAnim()
        })
      }
    },
    layout() {
      const flowForce = 0.5

      const globalForce = 0.14

      let aims = this.aimNetwork.aims
      let aimIds = Object.keys(aims) as unknown as number[]

      let map = this.map

      let shifts = []

      let r = this.reusableLayoutCalcArrays.r
      let positions = this.reusableLayoutCalcArrays.pos

      let boxes = this.reusableLayoutCalcArrays.boxes
      boxes.length = aimIds.length

      let aim
      let br, pos

      let boxIndexToAimId: number[] = []
      let boxIndex = 0

      for(let aimId of aimIds) {
        aim = aims[aimId]

        r[aimId] = br = aim.r
        positions[aimId] = pos = aim.pos
        shifts[aimId] = vec2.create()

        br *= outerMarginFactor
        boxes[boxIndex++] = [pos[0] - br, pos[1] - br, pos[0] + br, pos[1] + br]

        boxIndexToAimId.push(aimId)
      }

      // handle connected aims
      let flows = this.aimNetwork.flows

      let delta = vec2.create()
      let rSum
      let targetPos = vec2.create()
      let targetShift = vec2.create()
      for(let fromId of Object.keys(flows) as unknown as number[]) {
        let bucket = flows[fromId]
        for(let intoId of Object.keys(bucket) as unknown as number[]) {
          let flow = bucket[intoId]

          let rSum = flow.from.r + flow.into.r

          vec2.scale(delta, flow.relativeDelta, rSum) 

          // into aim
          vec2.add(targetPos, flow.from.pos, delta)
          vec2.sub(targetShift, targetPos, flow.into.pos)

          vec2.scale(targetShift, targetShift, flow.from.r / rSum)

          vec2.add(shifts[intoId], shifts[intoId], targetShift)
          
          // from aim
          vec2.sub(targetPos, flow.into.pos, delta)
          vec2.sub(targetShift, targetPos, flow.from.pos)

          vec2.scale(targetShift, targetShift, flow.into.r / rSum)

          vec2.add(shifts[fromId], shifts[fromId], targetShift)
        }
      }

      for(let aimId of aimIds) {
        vec2.scale(shifts[aimId], shifts[aimId], flowForce)
      }

      // handle close aims
      let intersections = boxIntersect(boxes) 
      let iA, shiftA, rA, posA
      let iB, shiftB, rB, posB
      let ab, d

      for(let intersection of intersections) {
        iA = boxIndexToAimId[intersection[0]]
        iB = boxIndexToAimId[intersection[1]]
        shiftA = shifts[iA]
        rA = r[iA] 
        posA = positions[iA]
        shiftB = shifts[iB]
        rB = r[iB] 
        posB = positions[iB]

        ab = vec2.crSub(posB, posA) 
        rSum = rA + rB
        d = vec2.len(ab)

        if(d == 0) {
          const x = Math.random() * 2 - 1
          const y = Math.sqrt(1 - x * x) * (Math.random() > 0.5 ? 1 : -1)
          ab = vec2.fromValues(x * rSum, y * rSum)
        }
        if(d < rSum) {
          this.calcShiftAndApply(
            1, 
            d, ab, 
            rA, rB, rSum, 
            shiftA, shiftB
          )
        } 
        if (d < rSum * outerMarginFactor) {
          this.calcShiftAndApply(
            outerMarginFactor, 
            d, ab, 
            rA, rB, rSum, 
            shiftA, shiftB
          )
        } 
      }

      let viewMinShift = 0.1 * (LOGICAL_HALF_SIDE / map.halfSide) / map.scale
      let shift, minShift = 0
      let standstill = true
      for(let aimId of aimIds) {
        shift = shifts[aimId]
        vec2.scale(shift, shift, globalForce)
        minShift = Math.max(viewMinShift, r[aimId] * 0.001)
        // TBD minShift = max(minShift, flow aim distance order radius)
        if(shift[0] < -minShift ||
          shift[0] > minShift ||
          shift[1] < -minShift ||
          shift[1] > minShift) {
          aim = this.aimNetwork.aims[aimId]
          if(
            !(aim == this.aimNetwork.selectedAim) &&
            !(aim == map.dragCandidate && map.dragBeginning)
          ) {
            aim.pos = vec2.crAdd(aim.pos, shift)
            standstill = false
          }
        } 
      }
      if(!this.breakFromAnimLoop) {
        if(standstill) {
          setTimeout(() => {
            requestAnimationFrame(() => {
              this.layout()
            })
          }, 200)
        } else {
          requestAnimationFrame(() => {
            this.layout()
          })
        }
      }
      this.updateRelativeDeltaWhileLayouting()
    },

    calcShiftAndApply(
      marginFactor: number, 
      d: number, 
      ab: vec2.T, 
      rA: number, 
      rB: number, 
      rSum: number,
      shiftA: vec2.T, 
      shiftB: vec2.T
    ) {
      const amount = (marginFactor - d / rSum) / rSum 

      vec2.scale(hShift, ab, -rB * amount) 
      vec2.add(shiftA, shiftA, hShift)

      vec2.scale(hShift, ab, +rA * amount) 
      vec2.add(shiftB, shiftB, hShift)
      
    }, 
    updateRelativeDeltaWhileLayouting() {
      let lc = this.map.layoutCandidate
      if(this.map.layouting && lc) {
        const M = vec2.crMix(
          lc.flow.from.pos, 
          lc.flow.into.pos, 
          lc.fromWeight
        )
        const arm = vec2.crSub(this.layoutingHandlePos, M) 
        lc.flow.backupRelativeData()
        vec2.scale(lc.flow.relativeDelta, arm, lc.dScale)
      }
    }
  }
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.aim-map {
  position: absolute;
  left: 0; 
  top: 0; 
  width: 100vw;
  height:100vh; 
  background-color: shade(@bg1, 55%);  
}
</style>
