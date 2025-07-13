/* This store contains all data that are related to aims and their connections. 
 * It is used by the sidebar and the map - adapted for git-based backend */

import { defineStore } from 'pinia'
import { useApiConnection } from './api-connection'
import type { Aim as ApiAim, AimId, Contribution, Meta } from './api-connection'

import { useMap } from './map'
import { useUi } from './ui'
import { useNotifications } from './notifications'

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

  // Permissions system (blockchain concept, but needed for UI compatibility)
  static Permissions: {[name: string]: number} = {
    edit: 0x01, 
    network: 0x02,
    manage: 0x04, 
    transfer: 0x80, 
  }

  // Git-based identifiers
  aimId?: AimId
  repoPath?: string
  pinned: boolean = false
  
  // For compatibility with AimSVG component (blockchain concept not used in git version)
  address?: string
  permissions: number = 0xFF // All permissions for git-based version

  title: string = ""
  description: string = "" 
  status: string = "not_reached"
  statusNote: string = ""
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

  // Blockchain-related properties for UI compatibility (unused in git version)
  tokens: number = 0
  members: any[] = []
  pendingTransactions = {
    transfer: false,
    creation: false,
    update: false
  }
  contributionConfirmationSwitches = new Map()

  // Keep loop weight concept but remove token economics
  dependencyWeight = 0x8000 // half of uint16, represents importance/priority (legacy naming)
  dependencyWeightOrigin = undefined as number | undefined
  dependencyShare = 1 // legacy naming
  loopWeight: number = 0x8000
  loopWeightOrigin?: number
  loopShare: number = 0.5

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

  // For compatibility with AimSVG component
  anyTransactionPending() {
    return this.anyOperationPending()
  }

  // Stub methods for UI compatibility (blockchain concepts)
  updateTokens(value: number) {
    this.tokens = value
  }


  mayEdit() {
    return (this.permissions & Aim.Permissions.edit) > 0
  }

  mayNetwork() {
    return (this.permissions & Aim.Permissions.network) > 0
  }

  mayManage() {
    return (this.permissions & Aim.Permissions.manage) > 0
  }

  mayTransfer() {
    return (this.permissions & Aim.Permissions.transfer) > 0
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

  setLoopWeight(v: number) {
    this.loopWeight = clampFlowWeight(v) 
    this.recalcWeights()
  }

  recalcWeights() {
    let flows = this.inflows
    let totalWeight = this.loopWeight
    for(let key in flows) {
      totalWeight += flows[key].weight
    }
    for(let key in flows) {
      flows[key].share = flows[key].weight / totalWeight
    }
    this.loopShare = this.loopWeight / totalWeight
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

  updateStatusNote(v: string) {
    this.statusNote = v
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

  setTokens(value: number) {
    this.tokens = value
  }

  updateLoopWeight(value: number) {
    value = clampFlowWeight(Math.round(value))
    if (value === this.loopWeightOrigin) {
      this.loopWeightOrigin = undefined
    } else if (this.loopWeightOrigin === undefined) {
      this.loopWeightOrigin = this.loopWeight
    }
    this.setLoopWeight(value)
  }

  // Convert from API format
  static fromApiAim(apiAim: ApiAim): Aim {
    const aim = new Aim()
    aim.aimId = apiAim.id
    aim.title = apiAim.title
    aim.description = apiAim.description
    aim.status = apiAim.status
    aim.statusNote = apiAim.statusNote || ""
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
      statusNote: this.statusNote,
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
    // Convert strength (0-1) to weight (integer, default 0x7fff)
    flow.weight = Math.round((contrib.strength || 0.5) * 0x7fff)
    flow.published = true
    
    // Load relative positioning from metadata
    if (contrib.metadata?.relativeDelta) {
      const rd = contrib.metadata.relativeDelta
      if (typeof rd.x === 'number' && typeof rd.y === 'number') {
        flow.relativeDelta = vec2.fromValues(rd.x, rd.y)
      }
    }
    
    // If no relative positioning stored, calculate default based on aim positions
    if (!flow.relativeDelta || (flow.relativeDelta[0] === 0 && flow.relativeDelta[1] === 0)) {
      const rSum = fromAim.r + toAim.r
      flow.relativeDelta = vec2.crScale(vec2.crSub(toAim.pos, fromAim.pos), 1 / rSum)
    }
    
    return flow
  }

  // Convert to API format
  toApiContribution(): Partial<Contribution> {
    return {
      fromAim: this.from.aimId!,
      toAim: this.into.aimId!,
      explanation: this.explanation,
      type: this.type,
      // Convert weight back to strength (0-1)
      strength: this.weight / 0x7fff,
      metadata: {
        relativeDelta: {
          x: this.relativeDelta[0],
          y: this.relativeDelta[1]
        }
      }
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
      // Caching and performance
      lastRepoLoad: null as number | null,
      loadingRepo: false,
      contributionsCache: markRaw({}) as { [aimId: string]: { timestamp: number, data: any } }
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
      // Prevent multiple simultaneous loads
      if (this.loadingRepo) return
      
      // Check if we've recently loaded this repo
      const now = Date.now()
      if (this.currentRepo === repoPath && this.lastRepoLoad && (now - this.lastRepoLoad) < 30000) {
        return // Don't reload if loaded within last 30 seconds
      }

      this.loadingRepo = true
      const apiConn = useApiConnection()
      const api = apiConn.getAPI()
      
      try {
        // Load repository metadata
        this.meta = await api.getMeta()
        this.currentRepo = repoPath
        this.lastRepoLoad = now
        
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
        
        useNotifications().success(`Repository loaded: ${this.meta.repository.name}`)
      } catch (error) {
        console.error('Failed to load repository:', error)
        useNotifications().error(`Failed to load repository: ${error instanceof Error ? error.message : error}`)
      } finally {
        this.loadingRepo = false
      }
    },

    async loadAimContributions(aim: Aim) {
      if (!aim.aimId) return
      
      // Check cache first
      const cacheKey = aim.aimId.id
      const cached = this.contributionsCache[cacheKey]
      const now = Date.now()
      const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        // Use cached data
        this.loadContributionsFromCache(aim, cached.data)
        return
      }

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
          
          // Skip self-connections - they should only be represented by loopWeight/loopShare
          if (contrib.fromAim.id === aim.aimId?.id) {
            continue
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
          
          // Skip self-connections - they should only be represented by loopWeight/loopShare
          if (contrib.toAim.id === aim.aimId?.id) {
            continue
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
        
        // Cache the results
        this.contributionsCache[cacheKey] = {
          timestamp: now,
          data: { incomingContribs, outgoingContribs }
        }
        
      } catch (error) {
        console.error(`Failed to load contributions for aim ${aim.aimId?.id}:`, error)
        useNotifications().error(`Failed to load connections for "${aim.title}"`)
      }
    },

    loadContributionsFromCache(aim: Aim, cachedData: any) {
      const { incomingContribs, outgoingContribs } = cachedData
      
      // Process incoming contributions
      for (const contrib of incomingContribs) {
        if (!contrib.fromAim || !contrib.fromAim.id) continue
        
        // Skip self-connections - they should only be represented by loopWeight/loopShare
        if (contrib.fromAim.id === aim.aimId?.id) continue
        
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
        if (!contrib.toAim || !contrib.toAim.id) continue
        
        // Skip self-connections - they should only be represented by loopWeight/loopShare
        if (contrib.toAim.id === aim.aimId?.id) continue
        
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
      
      // Recalculate weights
      aim.recalcWeights()
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
    async createAndSelectAim(modifyAimCb?: (aim: Aim) => void) {
      const aim = this.createLocalAim(modifyAimCb)
      this.selectedAim = aim
      useUi().sideMenuOpen = true
      
      // Immediately save to git repository
      try {
        await this.saveNewAimToGit(aim)
        useNotifications().success(`Created new aim: "${aim.title}"`)
      } catch (error) {
        console.error('Failed to save new aim:', error)
        useNotifications().error('Failed to save new aim to repository')
      }
      
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

    async saveNewAimToGit(aim: Aim) {
      const apiConn = useApiConnection()
      const api = apiConn.getAPI()
      
      // Set default title if empty
      if (!aim.title.trim()) {
        aim.title = "New Aim"
      }
      
      try {
        const result = await api.createAim({
          title: aim.title,
          description: aim.description,
          statusNote: aim.statusNote,
          assignees: aim.assignees,
          tags: aim.tags,
          targetDate: aim.targetDate,
          effort: aim.effort,
          metadata: {
            effort: aim.effort,
            position: { x: aim.pos[0], y: aim.pos[1] }
          }
        })
        
        // Update the aim with the repository ID
        aim.aimId = result.aimId
        this.aimIdToLocalId[result.aimId.id] = aim.id
        
        // Clear the origin since it's now saved
        aim.clearOrigin()
        
        return result
      } catch (error) {
        throw error
      }
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

    // Blockchain-related store methods for UI compatibility (stubs for git version)
    resetContributionConfirmations(aim: Aim) {
      // No-op for git version
    },

    commitLoopWeight(aim: Aim) {
      // No-op for git version - changes are applied immediately
      useUi().log("Loop weight saved locally in git repository", "info")
    },

    buyTokens(aim: Aim, amount: number, price: number) {
      // No-op for git version
      useUi().log("Token operations not supported in git version", "info")
    },

    sellTokens(aim: Aim, amount: number, price: number) {
      // No-op for git version
      useUi().log("Token operations not supported in git version", "info")
    },

    removeAim(aim: Aim) {
      // Remove from local store
      delete this.aims[aim.id]
      if (aim.aimId) {
        delete this.aimIdToLocalId[aim.aimId.id]
      }
      this.selectedAim = undefined
      useUi().log(`Aim removed locally (not deleted from repository)`, "info")
    },

    transferAim(aim: Aim, newOwner: string) {
      // No-op for git version - no ownership system
      useUi().log("Ownership transfer not supported in git version", "info")
    },

    resetFlowChanges(flow: Flow) {
      // No-op for git version - changes are applied immediately
    },

    commitFlowChanges(flow: Flow) {
      // TODO: Implement contribution updates with relative positioning in API
      // For now, clear the origin to mark as committed locally
      flow.clearOrigin()
      useUi().log("Flow changes saved locally (API update not yet implemented)", "info")
    },

    createFlowOnChain(flow: Flow) {
      // No-op for git version - flows exist in files, not blockchain
      useUi().log("Blockchain operations not supported in git version", "info")
    },

    removeFlow(flow: Flow) {
      // Remove from local store
      const fromId = flow.from.id
      const toId = flow.into.id
      
      delete flow.from.outflows[toId]
      delete flow.into.inflows[fromId]
      
      if (this.flows[fromId]) {
        delete this.flows[fromId][toId]
      }
      
      this.selectedFlow = undefined
      useUi().log(`Flow removed locally (not deleted from repository)`, "info")
    },

    allChanges() {
      // Stub for UI compatibility - git version doesn't track changes the same way
      return []
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
    },

    // Methods called by AimSVG component
    togglePin(aim: Aim) {
      aim.pinned = !aim.pinned
      // TODO: Persist to backend if needed
    },

    async createAndSelectFlow(from: Aim, to: Aim) {
      if (!from.aimId || !to.aimId) {
        useUi().log("Cannot create flow: aims missing repository IDs", "error")
        return
      }

      // Prevent self-connections
      if (from.id === to.id) {
        useUi().log("Cannot create connection to same aim", "error")
        return
      }

      try {
        const apiConn = useApiConnection()
        const api = apiConn.getAPI()

        // Calculate initial relative positioning
        const rSum = from.r + to.r
        const relativeDelta = vec2.crScale(vec2.crSub(to.pos, from.pos), 1 / rSum)

        // Create the contribution via API
        const result = await api.createContribution({
          fromAim: from.aimId,
          toAim: to.aimId,
          explanation: "User-created connection", // Default explanation
          type: "related", // Default type
          strength: 0.5, // Default strength
          metadata: {
            userCreated: true,
            created: new Date().toISOString(),
            relativeDelta: {
              x: relativeDelta[0],
              y: relativeDelta[1]
            }
          }
        })

        if (result.success) {
          // Create the flow object locally
          const flow = new Flow(from, to)
          flow.explanation = "User-created connection"
          flow.type = "related"
          flow.weight = Math.round(0.5 * 0x7fff) // Convert strength to weight
          flow.published = true
          flow.relativeDelta = vec2.clone(relativeDelta)

          // Add to store
          if (!this.flows[from.id]) {
            this.flows[from.id] = {}
          }
          this.flows[from.id][to.id] = flow

          // Add to aim inflows/outflows
          from.outflows[to.id] = flow
          to.inflows[from.id] = flow

          // Select the new flow
          this.selectedFlow = flow
          this.selectedAim = undefined

          // Recalculate weights
          from.recalcWeights()
          to.recalcWeights()

          useNotifications().success(`Created connection from "${from.title}" to "${to.title}"`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        useNotifications().error(`Failed to create connection: ${errorMessage}`)
      }
    },


    deselect() {
      this.selectedAim = undefined
      this.selectedFlow = undefined
    },

    // Blockchain-related methods for UI compatibility (stubs for git version)
    resetAimChanges(aim: Aim) {
      // No-op for git version - changes are applied immediately
    },

    createAimOnChain(aim: Aim) {
      // No-op for git version - aims exist in files, not blockchain
      useUi().log("Blockchain operations not supported in git version", "info")
    },

    commitAimChanges(aim: Aim) {
      // No-op for git version - changes are applied immediately
      useUi().log("Changes saved locally in git repository", "info")
    },

    commitAimMemberChanges(aim: Aim) {
      // No-op for git version - no member system
    },

    commitContributionConfirmations(aim: Aim) {
      // No-op for git version - no confirmation system
    }
  }
})