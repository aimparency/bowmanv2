/* This store contains all data that are related to aims and their connections. 
 * It is used by the sidebar and the map - adapted for git-based backend */

import { defineStore } from 'pinia'
import { useApiConnection } from './api-connection'
import type { Aim as ApiAim, AimId, Contribution, Meta } from './api-connection'

import { useMap } from './map'
import { useUi } from './ui'

import * as vec2 from '../vec2'
import { markRaw } from 'vue'

export function randomAimColor() {
  let r,g,b,l:number | undefined
  while(true) {
    r = Math.random() 
    g = Math.random()
    b = Math.random()
    l = Math.sqrt(r * r + g * g + b * b)
    if(l > 0) {
      return [r,g,b].map(c => Math.floor((0.05 + 0.8 * c / l!) * 255 )) as [number, number, number]
    }
  }
}

export function toHexColor(rgb: [number, number, number]) {
  return  '#' + rgb.map(c => ("0" + Math.floor(c).toString(16)).slice(-2)).join('') 
}

function clampFlowWeight(v: number) {
  return Math.max(Math.min(0xffff, v), 0)
}

export type Rgb = [number, number, number]

export class AimOrigin {
  title?: string
  description?: string
  color?: Rgb
  status?: string 
  effort?: number 
}

export class Aim {
  static nextAimId = 0
  id = Aim.nextAimId++ // auto increment xD

  // Git-based identifiers
  aimId?: AimId
  repoPath?: string
  pinned: boolean = false

  title: string = ""
  description: string = "" 
  status: string = "not_reached"
  effort: number = 0 
  rgb: [number, number, number] = [0, 0, 0]
  assignees: string[] = []
  tags: string[] = []
  created: string = ""
  lastModified: string = ""
  targetDate?: string

  pos = vec2.create()
  r = 30 // Default radius for visualization
  color = "000000"

  loadLevel = 0 // 0 means: don't load neighbors
  neighborIds: string[] = []
  
  inflows: { [aimId: string]: Flow } = {}
  outflows: { [aimId: string]: Flow } = {}

  // Keep dependency weight concept but remove token economics
  dependencyWeight = 0x8000 // half of uint16, represents importance/priority
  dependencyWeightOrigin = undefined as number | undefined
  dependencyShare = 1

  origin = new AimOrigin()

  pendingOperations = {
    creation: false, 
    update: false, 
    contributions: false,
  } 

  anyOperationPending() {
    for(let key in this.pendingOperations) {
      if((this.pendingOperations as any)[key]) {
        return true
      }
    }
    return false
  }

  constructor() {
  }

  setColor(rgb: [number, number, number]) {
    this.color = toHexColor(rgb)
    this.rgb = rgb
  }

  setDependencyWeight(v: number) {
    this.dependencyWeight = clampFlowWeight(v) 
    this.recalcWeights()
  }

  recalcWeights() {
    let flows = this.inflows
    let totalWeight = this.dependencyWeight
    for(let key in flows) {
      totalWeight += flows[key].weight
    }
    for(let key in flows) {
      flows[key].share = flows[key].weight / totalWeight
    }
    this.dependencyShare = this.dependencyWeight / totalWeight
  }

  setRadius(effort: number) {
    // Calculate radius based on effort instead of token supply
    this.r = Math.max(20, Math.min(100, 20 + Math.sqrt(effort) * 5))
  }

  clearOrigin() {
    this.origin = new AimOrigin()
  }

  updateDependencyWeight(v: number) {
    v = clampFlowWeight(Math.round(v)) 
    if(v === this.dependencyWeightOrigin) {
      this.dependencyWeightOrigin = undefined
    } else if(this.dependencyWeightOrigin === undefined) {
      this.dependencyWeightOrigin = this.dependencyWeight
    }
    this.setDependencyWeight(v)
  }

  updateStatus(v: string) {
    if(v === this.origin.status) { 
      this.origin.status = undefined
    } else if(this.origin.status === undefined) {
      this.origin.status = this.status
    }
    this.status = v
  }

  updateTitle(v: string) {
    if(v === this.origin.title) { 
      this.origin.title = undefined
    } else if(this.origin.title === undefined) {
      this.origin.title = this.title
    }
    this.title = v
  }

  updateDescription(v: string) {
    if(v === this.origin.description) { 
      this.origin.description = undefined
    } else if(this.origin.description === undefined) {
      this.origin.description = this.description
    }
    this.description = v
  }

  updateEffort(v: number) {
    if(v === this.origin.effort) { 
      this.origin.effort = undefined
    } else if(this.origin.effort === undefined) {
      this.origin.effort = this.effort
    }
    this.effort = v
    this.setRadius(v)
  }

  // Convert from API format
  static fromApiAim(apiAim: ApiAim): Aim {
    const aim = new Aim()
    aim.aimId = apiAim.id
    aim.title = apiAim.title
    aim.description = apiAim.description
    aim.status = apiAim.status
    aim.effort = apiAim.metadata?.effort || 0
    aim.assignees = apiAim.assignees
    aim.tags = apiAim.tags
    aim.created = apiAim.created
    aim.lastModified = apiAim.lastModified
    aim.targetDate = apiAim.targetDate
    
    if (apiAim.metadata?.position) {
      aim.pos = vec2.fromValues(apiAim.metadata.position.x, apiAim.metadata.position.y)
    }
    
    // Use a fixed visible color for debugging
    aim.setColor([255, 100, 100]) // Bright red
    aim.setRadius(aim.effort || 30) // Ensure visible radius
    
    // Set loadLevel to make aims visible in the map
    aim.loadLevel = 1
    
    return aim
  }

  // Convert to API format
  toApiAim(): Partial<ApiAim> {
    return {
      title: this.title,
      description: this.description,
      status: this.status as 'not_reached' | 'reached',
      assignees: this.assignees,
      tags: this.tags,
      targetDate: this.targetDate,
      metadata: {
        effort: this.effort,
        position: { x: this.pos[0], y: this.pos[1] }
      }
    }
  }
}

export class FlowOrigin {
  explanation?: string
  weight?: number
  relativeDelta?: vec2.T
}

export class Flow {
  explanation: string = ""
  weight = 0x7fff;
  type: 'prerequisite' | 'enables' | 'supports' | 'related' = 'related'

  share = 0; // share get's calculated based on all outgoing weights

  origin = new FlowOrigin()

  pending = false
  published = false

  relativeDelta = vec2.create()

  constructor(
    public from: Aim,
    public into: Aim 
  ) {}

  setWeight(v: number) {
    this.weight = v
    this.into.recalcWeights()
  }

  updateWeight(v: number) {
    v = clampFlowWeight(Math.round(v)) 
    if(v === this.origin.weight) {
      this.origin.weight = undefined
    } else if (this.origin.weight === undefined) {
      this.origin.weight = this.weight
    }
    this.setWeight(v) 
  }

  backupRelativeData() {
    if(this.published && this.origin.relativeDelta === undefined) {
      this.origin.relativeDelta = vec2.clone(this.relativeDelta)
    }
  }

  updateExplanation(v: string) {
    if(v === this.origin.explanation) { 
      this.origin.explanation = undefined
    } else if(this.origin.explanation === undefined) {
      this.origin.explanation = this.explanation
    }
    this.explanation = v
  }

  clearOrigin() {
    this.origin = new FlowOrigin()
  }

  // Convert from API format
  static fromApiContribution(contrib: Contribution, fromAim: Aim, toAim: Aim): Flow {
    const flow = new Flow(fromAim, toAim)
    flow.explanation = contrib.explanation
    flow.type = contrib.type
    flow.weight = contrib.strength
    flow.published = true
    return flow
  }

  // Convert to API format
  toApiContribution(): Partial<Contribution> {
    return {
      fromAim: this.from.aimId!,
      toAim: this.into.aimId!,
      explanation: this.explanation,
      type: this.type,
      strength: this.weight,
      metadata: {}
    }
  }
}

interface Change {
  aim: Aim
  aimButtonDisabled: boolean
  uncommitted: boolean
  aimChanges: string[]
  changedFlows: Flow[]
}

export const useAimNetwork = defineStore('aim-network', {
  state() {
    return {
      aims: {} as {[id: number]: Aim}, 
      flows: {} as {[from: number]: {[into: number]: Flow}}, 
      selectedAim: undefined as Aim | undefined,
      selectedFlow: undefined as Flow | undefined, 
      aimIdToLocalId: markRaw({}) as {[aimId: string]: number},
      currentRepo: null as string | null,
      meta: null as Meta | null,
    }
  }, 
  actions: {
    async loadInitial() {
      const apiConn = useApiConnection()
      await apiConn.connect()
      
      if (apiConn.currentRepo) {
        await this.loadRepository(apiConn.currentRepo)
      }
    },

    async loadRepository(repoPath: string) {
      const apiConn = useApiConnection()
      const api = apiConn.getAPI()
      
      try {
        // Load repository metadata
        this.meta = await api.getMeta()
        this.currentRepo = repoPath
        
        // Load all aims
        const apiAims = await api.getAllAims()
        
        // Clear existing aims
        this.aims = {}
        this.flows = {}
        this.aimIdToLocalId = {}
        
        // Convert API aims to local aims
        for (const apiAim of apiAims) {
          const aim = Aim.fromApiAim(apiAim)
          this.aims[aim.id] = aim
          this.aimIdToLocalId[apiAim.id.id] = aim.id
        }
        
        // Load contributions/flows
        for (const apiAim of apiAims) {
          const localAim = this.aims[this.aimIdToLocalId[apiAim.id.id]]
          if (localAim) {
            await this.loadAimContributions(localAim)
          }
        }
        
        // Focus on root aim if available
        if (this.meta.rootAimId) {
          const rootAim = this.aims[this.aimIdToLocalId[this.meta.rootAimId.id]]
          if (rootAim) {
            this.focusAim(rootAim)
          }
        }
        
      } catch (error) {
        useUi().log(`Failed to load repository: ${error}`, "error")
      }
    },

    async loadAimContributions(aim: Aim) {
      const apiConn = useApiConnection()
      const api = apiConn.getAPI()
      
      try {
        const incomingContribs = await api.getAimContributions(aim.aimId!.id, 'from') as Contribution[]
        const outgoingContribs = await api.getAimContributions(aim.aimId!.id, 'to') as Contribution[]
        
        // Process incoming contributions
        for (const contrib of incomingContribs) {
          if (!contrib.fromAim || !contrib.fromAim.id) {
            continue // Skip invalid contributions
          }
          
          const fromAimId = this.aimIdToLocalId[contrib.fromAim.id]
          const fromAim = this.aims[fromAimId]
          
          if (fromAim) {
            const flow = Flow.fromApiContribution(contrib, fromAim, aim)
            aim.inflows[fromAimId] = flow
            
            if (!this.flows[fromAimId]) {
              this.flows[fromAimId] = {}
            }
            this.flows[fromAimId][aim.id] = flow
          }
        }
        
        // Process outgoing contributions
        for (const contrib of outgoingContribs) {
          if (!contrib.toAim || !contrib.toAim.id) {
            continue // Skip invalid contributions
          }
          
          const toAimId = this.aimIdToLocalId[contrib.toAim.id]
          const toAim = this.aims[toAimId]
          
          if (toAim) {
            const flow = Flow.fromApiContribution(contrib, aim, toAim)
            aim.outflows[toAimId] = flow
            
            if (!this.flows[aim.id]) {
              this.flows[aim.id] = {}
            }
            this.flows[aim.id][toAimId] = flow
          }
        }
        
        aim.recalcWeights()
      } catch (error) {
        useUi().log(`Failed to load contributions for aim: ${error}`, "error")
      }
    },

    async createAim(aimData: {
      title: string
      description: string
      effort?: number
      tags?: string[]
      assignees?: string[]
    }) {
      const apiConn = useApiConnection()
      const api = apiConn.getAPI()
      
      try {
        const result = await api.createAim({
          title: aimData.title,
          description: aimData.description,
          effort: aimData.effort || 0,
          tags: aimData.tags || [],
          assignees: aimData.assignees || [],
          metadata: {
            effort: aimData.effort || 0,
            position: { x: 0, y: 0 }
          }
        })
        
        // Reload the aim to get the complete data
        const apiAim = await api.getAim(result.aimId.id)
        const aim = Aim.fromApiAim(apiAim)
        
        this.aims[aim.id] = aim
        this.aimIdToLocalId[result.aimId.id] = aim.id
        
        useUi().log(`Created aim: ${aim.title}`, "success")
        return aim
        
      } catch (error) {
        useUi().log(`Failed to create aim: ${error}`, "error")
        throw error
      }
    },

    async updateAim(aim: Aim) {
      if (!aim.aimId) {
        throw new Error("Cannot update aim without ID")
      }
      
      const apiConn = useApiConnection()
      const api = apiConn.getAPI()
      
      try {
        aim.pendingOperations.update = true
        
        await api.updateAim(aim.aimId.id, aim.toApiAim())
        aim.clearOrigin()
        
        useUi().log(`Updated aim: ${aim.title}`, "success")
        
      } catch (error) {
        useUi().log(`Failed to update aim: ${error}`, "error")
        throw error
      } finally {
        aim.pendingOperations.update = false
      }
    },

    async createFlow(fromAim: Aim, toAim: Aim, flowData: {
      explanation: string
      type: 'prerequisite' | 'enables' | 'supports' | 'related'
      weight: number
    }) {
      if (!fromAim.aimId || !toAim.aimId) {
        throw new Error("Cannot create flow without aim IDs")
      }
      
      const apiConn = useApiConnection()
      const api = apiConn.getAPI()
      
      try {
        await api.createContribution({
          fromAim: fromAim.aimId,
          toAim: toAim.aimId,
          explanation: flowData.explanation,
          type: flowData.type,
          strength: flowData.weight
        })
        
        // Create local flow
        const flow = new Flow(fromAim, toAim)
        flow.explanation = flowData.explanation
        flow.type = flowData.type
        flow.weight = flowData.weight
        flow.published = true
        
        // Add to data structures
        fromAim.outflows[toAim.id] = flow
        toAim.inflows[fromAim.id] = flow
        
        if (!this.flows[fromAim.id]) {
          this.flows[fromAim.id] = {}
        }
        this.flows[fromAim.id][toAim.id] = flow
        
        toAim.recalcWeights()
        
        useUi().log(`Created contribution from ${fromAim.title} to ${toAim.title}`, "success")
        
      } catch (error) {
        useUi().log(`Failed to create contribution: ${error}`, "error")
        throw error
      }
    },

    // UI interaction methods
    createAndSelectAim(modifyAimCb?: (aim: Aim) => void) {
      const aim = this.createLocalAim(modifyAimCb)
      this.selectedAim = aim
      useUi().sideMenuOpen = true
      return aim
    },

    createLocalAim(modifyAimCb?: (aim: Aim) => void) {
      let rawAim = new Aim()
      rawAim.setColor(randomAimColor())
      
      if(modifyAimCb) {
        modifyAimCb(rawAim) 
      }
      
      this.aims[rawAim.id] = rawAim
      return this.aims[rawAim.id] 
    },

    focusAim(aim: Aim) {
      this.selectedAim = aim
      const map = useMap()
      map.centerOnAim(aim)
    },

    selectAim(aim: Aim) {
      this.selectedAim = aim
      this.selectedFlow = undefined
    },

    selectFlow(flow: Flow) {
      this.selectedFlow = flow
      this.selectedAim = undefined
    },

    deselectAll() {
      this.selectedAim = undefined
      this.selectedFlow = undefined
    },

    // Utility methods
    getAimByApiId(apiId: string): Aim | undefined {
      const localId = this.aimIdToLocalId[apiId]
      return localId ? this.aims[localId] : undefined
    },

    getAllAims(): Aim[] {
      return Object.values(this.aims)
    },

    getAllFlows(): Flow[] {
      const flows: Flow[] = []
      for (const fromFlows of Object.values(this.flows)) {
        flows.push(...Object.values(fromFlows))
      }
      return flows
    },

    // Repository management
    async initializeRepository(path: string, rootAimData: {
      title: string
      description: string
      effort?: number
    }) {
      const apiConn = useApiConnection()
      const api = apiConn.getAPI()
      
      try {
        const result = await api.initializeRepository(path, {
          title: rootAimData.title,
          description: rootAimData.description,
          effort: rootAimData.effort || 0,
          metadata: {
            effort: rootAimData.effort || 0,
            position: { x: 0, y: 0 }
          }
        })
        
        await this.loadRepository(result.path)
        useUi().log(`Initialized repository at ${result.path}`, "success")
        
      } catch (error) {
        useUi().log(`Failed to initialize repository: ${error}`, "error")
        throw error
      }
    },

    async setRepository(path: string) {
      const apiConn = useApiConnection()
      
      try {
        const result = await apiConn.setRepository(path)
        if (result.success) {
          await this.loadRepository(result.path)
        }
      } catch (error) {
        useUi().log(`Failed to set repository: ${error}`, "error")
        throw error
      }
    }
  }
})