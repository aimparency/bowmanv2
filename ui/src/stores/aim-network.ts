/* This store contains all data that are related to aims and their connections. 
 * It is used by the sidebar and the map */

import { defineStore } from 'pinia'
import { useWeb3Connection } from './web3-connection'

import { BigNumber, ethers } from 'ethers'

import { useMap } from './map'
import { useUi } from './ui'

import * as vec2 from '../vec2'
import { markRaw, mergeProps, toRaw } from 'vue'


function vec2AsByteArray(v: vec2.T) : Uint8Array {
  let d2d = new Float32Array(v)
  return new Uint8Array(d2d.buffer)
}

function getPinnedAimsStorageKey() {
  const w3c = useWeb3Connection()
  return "pinnedAims-" + w3c.network!.chainId + "-" + w3c.address
}

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

export class Member {

  constructor(
    public address: string,
    public permissions: number,
    public permissionsOrigin?: number,
  ) {}

  updatePermissions(permissions: number) {
    if(permissions === this.permissionsOrigin) {
      this.permissionsOrigin = undefined
    } else if(this.permissionsOrigin == undefined) {
      this.permissionsOrigin = this.permissions
    }
    this.permissions = permissions
  }

  reset() {
    if(this.permissionsOrigin) {
      this.permissions = this.permissionsOrigin
      this.permissionsOrigin = undefined
    }
  }

  persist() {
    this.permissionsOrigin = undefined
  }

  changed() {
    return this.permissionsOrigin != undefined
  }
}

export class Aim {
  static nextAimId = 0
  id = Aim.nextAimId++ // auto increment xD

  address?: string
  owner?: string
  pinned: boolean = false

  title: string = ""
  description: string = "" 
  status: string=""
  effort: number = 0 
  rgb: [number, number, number] = [0, 0, 0]

  tokens = 0n
  tokensOnChain = 0n
  tokenSupply = 0n

  suggestTokenNameAndSymbol = true
  tokenName = ""
  tokenSymbol = ""

  pos = vec2.create()
  r = 0
  color = "000000"

  loadLevel = 0 // 0 means: don't load neighbors
  neighborAddrs: string [] = []
  
  inflows: { [aimId: string]: Flow } = {}
  outflows: { [aimId: string]: Flow } = {}

  loopWeight = 0x8000 // half of uint16
  loopWeightOrigin = undefined as number | undefined
  loopShare = 1

  contributionConfirmationSwitches = new Set<string>()
  contributionConfirmationsOnChain = new Set<string>()

  origin = new AimOrigin()

  pendingTransactions = {
    creation: false, 
    data: false, 
    members: false,
    investment: false,
    contributionConfirmations: false,
    loopWeight: false, 
    transfer: false,
  } 

  anyTransactionPending() {
    for(let key in this.pendingTransactions) {
      if((this.pendingTransactions as any)[key]) {
        return true
      }
    }
    return false
  }

  static Permissions: {[name: string]: number} = {
    edit: 0x01, 
    network: 0x02,
    manage: 0x04, 
    //...
    transfer: 0x80, 
  } 

  mayEdit() {
    return this.permissions & Aim.Permissions.edit
  }
  mayNetwork() {
    return this.permissions & Aim.Permissions.network
  }
  mayManage() {
    return this.permissions & Aim.Permissions.manage
  }

  members: Member[] = []

  permissions = 0

  constructor() {
  }

  setColor(rgb: [number, number, number]) {
    this.color = toHexColor(rgb)
    this.rgb = rgb
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

  setTokens(v: bigint) {
    this.tokens = v
    let localSupply: bigint = this.tokenSupply - this.tokensOnChain + this.tokens
    this.r = Math.sqrt(Number((localSupply).toString())) / 1000 
  }

  clearOrigin() {
    this.origin = new AimOrigin()
  }

  updateTokens(v: bigint) {
    this.setTokens(v) 
  }

  updateLoopWeight(v: number) {
    v = clampFlowWeight(Math.round(v)) 
    if(v === this.loopWeightOrigin) {
      this.loopWeightOrigin = undefined
    } else if(this.loopWeightOrigin === undefined) {
      this.loopWeightOrigin = this.loopWeight
    }
    this.setLoopWeight(v)
  }

  updateState(v: string) {
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

  share = 0; // share get's calculated based on all outgoing weights

  origin = new FlowOrigin()

  transactionPending = false

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
      aimAddressToId: markRaw({}) as {[addr: string]: number},
      flowWaitList: markRaw({}) as {[addr: string]: Set<string>}, 
    }
  }, 
  actions: {
    async loadInitial() {
      await this.loadHome()
      // check url get parameters
      let urlParams = new URLSearchParams(window.location.search)
      try {
        let addr = urlParams.get('loadAim')
        if(addr) {
          let aim = await this.loadAim(addr)
          this.raiseLoadLevel(aim, 2)
          this.focusAim(aim) 
        }
      } catch(err: any) {
        useUi().log(`Could not load aim from link ${err.message ?? err}`, "error")
      }
      this.loadPinned() 
    }, 
    async loadHome() {
      let summitsContract = useWeb3Connection().getSummitsContract()
      if(summitsContract) {
        const baseAimAddr = await summitsContract.baseAim()
        let home = await this.loadAim(baseAimAddr) 

        this.raiseLoadLevel(home, 2) 

        this.focusAim(home)

        // test transaction
        // await summitsContract.test() // test
      }
    }, 
    async loadPinned() {
      const pinningsStr = window.localStorage.getItem(getPinnedAimsStorageKey())
      if(pinningsStr !== null && pinningsStr !== "") {
        const pinnings = pinningsStr.split(',')
        pinnings.forEach((addr: string) => {
          this.loadAim(addr).then(aim => {
            aim.pinned = true
            this.raiseLoadLevel(aim, 2) 
          }).catch(() => {
            useUi().log("Could not load pinned aim. Maybe clear your local storage.", "error") 
          })
        })
      }
    }, 
    // create and load aims
    createAndSelectAim(modifyAimCb?: (aim: Aim) => void) {
      this.selectedAim = this.createAim(aim => {
        aim.permissions = 0xff
        aim.setColor(randomAimColor())
        modifyAimCb && modifyAimCb(aim)
      })
      useUi().sideMenuOpen = true
    }, 
    createAim(modifyAimCb?: (aim: Aim) => void) {
      let rawAim = new Aim()
      if(modifyAimCb) {
        modifyAimCb(rawAim) 
      }
      this.aims[rawAim.id] = rawAim // only now it becomes reactive
      if(rawAim.address !== undefined) {
        this.aimAddressToId[rawAim.address] = rawAim.id
      }
      return this.aims[rawAim.id] 
    },
    async createAimOnChain(aim: Aim) {
      let summitsContract = useWeb3Connection().getSummitsContract()
      let price = aim.tokens * aim.tokens
      if(summitsContract) {
        aim.pendingTransactions.creation = true
        try {
          let tx = await summitsContract.createAim(
            {
              title: aim.title, 
              description: aim.description, 
              status: aim.status, 
              effort: Math.trunc(aim.effort), 
              color: toRaw(aim.rgb), 
            },
            aim.loopWeight, 
            aim.tokenName,
            aim.tokenSymbol, 
            aim.tokens, 
            {
              value: price, 
            }
          )
          let rc = await tx.wait()
          aim.pendingTransactions.creation = false
          let creationEvent: any = rc.events.find((e: any) => e.event === 'AimCreation') 
          if(creationEvent) {
            aim.address = creationEvent.args.aimAddress
            this.aimAddressToId[aim.address!] = aim.id
            aim.tokenSupply = aim.tokens
            aim.tokensOnChain = aim.tokens
            aim.clearOrigin()
            aim.loopWeightOrigin = undefined
            this.togglePin(aim)
          }
        } catch(err: any) {
          useUi().log(`Failed to create aim on chain: ${err.message ?? err}`, "error")
          aim.pendingTransactions.creation = false
        }
      }
    }, 
    async commitAimChanges(aim: Aim) {
      let fields: string[] = []
      let values: any[] = []
      let origin = aim.origin as any
      Object.getOwnPropertyNames(aim.origin).forEach((name: string) => {
        if(origin[name] !== undefined) {
          fields.push(name)
          values.push((aim as any)[name]) 
        }
      })
      let functionName = 'updateAim' + fields.map(f => f[0].toUpperCase() + f.slice(1)).join("")
      const w3 = useWeb3Connection()
      const aimContract = w3.getAimContract(aim.address!) 
      aim.pendingTransactions.data = true
      try {
        let tx = await aimContract[functionName](...values)
        await tx.wait()
        for(let name of fields) { // TBD: maybe just assign new AimOrigin() ? 
          delete origin[name]
        }
      aim.pendingTransactions.data = false
      } catch(err: any)  {
        useUi().log(`Failed to commit aim changes: ${err.message ?? err}`, "error")
        aim.pendingTransactions.data = false
      }

    }, 
    async commitAimMemberChanges(aim: Aim) {
      if(aim.members) { 
        let addresses: string[] = []
        let permissions: number[] = []
        let includedMembers: Member[] = []
        aim.members.forEach((member: Member) => {
          if(member.changed()) {
            addresses.push(member.address)
            permissions.push(member.permissions)
            includedMembers.push(member)
          }
        })
        if(addresses.length > 0) {
          try {
            const w3 = useWeb3Connection()
            const aimContract = w3.getAimContract(aim.address!) 
            aim.pendingTransactions.members = true
            if(addresses.length == 1) {
              let tx = await aimContract.setPermissions(addresses[0], permissions[0])
              await tx.wait()
            } else {
              let tx = await aimContract.setPermissionsForMultipleMembers(addresses, permissions)
              await tx.wait()
            }
            let updatedMembers: Member[] = []
            aim.members.forEach(member => {
              if(member.address == w3.address && aim.owner !== w3.address) { 
                aim.permissions = member.permissions
              }
              if(member.permissions !== 0) {
                member.persist()
                updatedMembers.push(member)
              }
            })
            aim.members = updatedMembers
            aim.pendingTransactions.members = false
          } catch(err: any) {
            useUi().log(`Failed to commit aim member changes: ${err.message ?? err}`, "error")
            aim.pendingTransactions.members = false
          }
          // set members changed to false for include members
        }
      }
    }, 
    async commitLoopWeight(aim: Aim) {
      if(aim.loopWeightOrigin && aim.loopWeightOrigin !== aim.loopWeight) {
        const w3 = useWeb3Connection()
        const aimContract = w3.getAimContract(aim.address!) 
        let tx = await aimContract.setLoopWeight(aim.loopWeight)
        await tx.wait()
        aim.loopWeightOrigin = undefined
      }
    }, 
    async commitContributionConfirmations(aim: Aim) {
      if(aim.address !== undefined) {
        let intoAddresses: string[] = []
        let values: boolean[] = []
        aim.contributionConfirmationSwitches.forEach((addr: string) => {
          intoAddresses.push(addr)
          values.push(!aim.contributionConfirmationsOnChain.has(addr))
        })
        try {
          const w3 = useWeb3Connection()
          const aimContract = w3.getAimContract(aim.address!)
          aim.pendingTransactions.contributionConfirmations = true
          let tx = await aimContract.setContributionConfirmations(intoAddresses, values)
          await tx.wait()
          aim.contributionConfirmationSwitches.forEach((addr: string) => {
            if(aim.contributionConfirmationsOnChain.has(addr)) {
              aim.contributionConfirmationsOnChain.delete(addr)
            } else {
              aim.contributionConfirmationsOnChain.add(addr)
            }
          }) 
          aim.contributionConfirmationSwitches = new Set<string>()
          aim.pendingTransactions.contributionConfirmations = false
        } catch (err: any) {
          useUi().log(`Failed to commit contribution confirmations: ${err.message ?? err}`, "error")
          aim.pendingTransactions.contributionConfirmations = false
        }
      }
    }, 
    async resetContributionConfirmations(aim: Aim) {
      aim.contributionConfirmationSwitches = new Set<string>()
    }, 
    async buyTokens(aim: Aim, amount: bigint, maxPrice: bigint) {
      try {
        const w3 = useWeb3Connection()
        const aimContract = w3.getAimContract(aim.address!) 
        aim.pendingTransactions.investment = true
        let tx = await aimContract.buy(
          amount, 
          {
            value: maxPrice
          }
        )
        await tx.wait()
        aim.tokenSupply += amount
        aim.tokensOnChain = aim.tokens
        aim.pendingTransactions.investment = false
      } catch(err: any)  {
        useUi().log(`Failed to buy tokens: ${err.message ?? err}`, "error")
        aim.pendingTransactions.investment = false
      }
    },
    async sellTokens(aim: Aim, amount: bigint, minPrice: bigint ) {
      const w3 = useWeb3Connection()
      const aimContract = w3.getAimContract(aim.address!) 
      aim.pendingTransactions.investment = true
      try {
        let tx = await aimContract.sell(
          amount, 
          minPrice
        )
        await tx.wait()
        aim.tokenSupply -= amount
        aim.tokensOnChain = aim.tokens
        aim.pendingTransactions.investment = false
      } catch(err: any)  {
        useUi().log(`Failed to sell tokens: ${err.message ?? err}`, "error")
        aim.pendingTransactions.investment = false
      }
    }, 
    async loadAim(aimAddr: string) { 
      const w3 = useWeb3Connection()
      let aimContract = w3.getAimContract(aimAddr) 
      let dataPromises = []
      dataPromises.push(aimContract.data())
      dataPromises.push(aimContract.symbol()) 
      dataPromises.push(aimContract.name()) 
      dataPromises.push(aimContract.totalSupply())
      dataPromises.push(aimContract.getCallersPermissions())
      dataPromises.push(aimContract.owner())
      dataPromises.push(aimContract.loopWeight()) 
      dataPromises.push(aimContract.getInvestment()) 
      dataPromises.push(aimContract.getContributors()) 
      dataPromises.push(aimContract.getConfirmedContributions()) 
      return await Promise.all(dataPromises).then(([
        data, symbol, name, supply, permissions, owner, loopWeight, tokens, contributors, contributions 
      ]) => {
        const setValues = (aim: Aim) => {
          aim.address = aimAddr
          aim.title = data.title
          aim.description = data.description
          aim.setColor(Array.from(ethers.utils.arrayify(data.color)) as [number, number, number])
          aim.tokenName = name 
          aim.tokenSymbol = symbol
          aim.permissions = permissions
          aim.owner = owner
          const t = BigNumber.from(tokens).toBigInt()
          aim.tokenSupply = BigNumber.from(supply).toBigInt()
          aim.tokensOnChain = t
          aim.setLoopWeight(loopWeight) 
          aim.setTokens(t) 
          aim.contributionConfirmationsOnChain = new Set<string>(contributions)

          let addedWeights = 0
          let addedPos = vec2.create()
          const addPos = (aimAddr: string) => {
            let aim = this.aims[this.aimAddressToId[aimAddr]]
            if(aim) {   
              addedWeights += aim.r
              vec2.add(addedPos, addedPos, aim.pos)
            }
          }
          for(let fromAddr of contributors) {
            if(this.aimAddressToId[fromAddr] !== undefined) {
              addPos(fromAddr) 
              this.loadFlow(fromAddr, aimAddr) 
            } else {
              if(this.flowWaitList[fromAddr]) {
                this.flowWaitList[fromAddr].add(aimAddr) 
              } else {
                this.flowWaitList[fromAddr] = new Set<string>([aimAddr])
              }
            }
          }
          if(this.flowWaitList[aimAddr]) {
            this.flowWaitList[aimAddr].forEach((intoAddr: string) => {
              addPos(intoAddr) 
              this.loadFlow(aimAddr, intoAddr) 
            })
          }

          for(let intoAddr of contributions) {
            if(this.aimAddressToId[intoAddr] !== undefined) {
              addPos(intoAddr) 
              this.loadFlow(aimAddr, intoAddr) 
            } 
          }
          if(addedWeights > 0) { 
            // place aim between neighbors
            vec2.scale(aim.pos, addedPos, 1.0 / addedWeights)
          } else {
            aim.pos = vec2.fromValues(
              aim.r * (Math.random() - 0.5), 
              aim.r * (Math.random() - 0.5)
            ) 
          }

          aim.neighborAddrs = contributions.concat(contributors)
        }
        const aimId = this.aimAddressToId[aimAddr]
        if(aimId !== undefined) {
          let aim = this.aims[aimId]!
          setValues(aim)
          return aim
        } else {
          return this.createAim(setValues)
        }
      })
    }, 
    async raiseLoadLevel(aim: Aim, level: number) {
      if(level > 0 && level > aim.loadLevel) {
        aim.loadLevel = level
        for(let addr of aim.neighborAddrs) {
          let aimId = this.aimAddressToId[addr] 
          let neighbor = undefined
          if(aimId !== undefined) {
            neighbor = this.aims[aimId]
          }
          if(neighbor !== undefined) {
            this.raiseLoadLevel(neighbor, level - 1)
          } else {
            this.loadAim(addr).then((newAim: Aim) => {
              this.raiseLoadLevel(newAim, level - 1)
            })
          }
        }
      }
    },
    lazyLoadAim(aim: Aim) {
      if(aim.address) {
        const w3 = useWeb3Connection()
        let aimContract = w3.getAimContract(aim.address) 
        let dataPromises = []
        dataPromises.push(aimContract.getMembers()) 
        Promise.all(dataPromises).then(([
          memberAddrs
        ]) => {
          let permissionPromises = []
          for(let memberAddr of memberAddrs) {
            permissionPromises.push(aimContract.permissions(memberAddr))
          }
          Promise.all(permissionPromises).then(permissions => {
            let members = []
            for(let i = 0; i < memberAddrs.length; i++) {
              if(permissions[i] > 0) {
                members.push(new Member(
                  memberAddrs[i], 
                  permissions[i]
                ))
              }
            }
            aim.members = members
          })
        })
      }
    },
    async loadFlow(fromAddr: string, intoAddr: string) {
      const w3 = useWeb3Connection()
      let aimContract = w3.getAimContract(intoAddr) 
      let flowFromChain = await aimContract.contributions(fromAddr) 

      let fromAim = this.aims[this.aimAddressToId[fromAddr]]
      let intoAim = this.aims[this.aimAddressToId[intoAddr]]

      let relativeDelta = new Float32Array(ethers.utils.arrayify(flowFromChain.data.d2d).buffer)

      return this.createFlow(fromAim, intoAim, (flow: Flow) => {
        flow.explanation = flowFromChain.data.explanation
        flow.weight = flowFromChain.data.weight
        flow.relativeDelta = vec2.fromValues(relativeDelta[0], relativeDelta[1])
        flow.published = true
      })
    }, 
    resetAimChanges(aim: Aim) {
      Object.entries(aim.origin).forEach(([key, value]) => {
        if(value !== undefined) {
          (aim as any)[key] = value
        }
      })
      aim.clearOrigin()
    }, 
    removeAim(aim: Aim) {
      for(let fromId in aim.inflows) {
        this.removeFlow(aim.inflows[fromId]) 
      }
      for(let intoId in aim.outflows) {
        this.removeFlow(aim.outflows[intoId]) 
      }
      if(this.selectedAim == aim) {
        this.selectedAim = undefined
      } 
      delete this.aims[aim.id]
    },
    async transferAim(aim: Aim, newOwnerAddr: string) {
      try {
        const w3 = useWeb3Connection()
        const aimContract = w3.getAimContract(aim.address!) 
        aim.pendingTransactions.transfer = true
        let tx = await aimContract.transferOwnership(newOwnerAddr)
        await tx.wait()
        aim.permissions = 0x7f 
        let member = aim.members.find(member => member.address == w3.address)
        if(member !== undefined) {
          member.permissions = 0x7f
          member.permissionsOrigin = undefined
        } else {
          aim.members.push(new Member(w3.address, 0x7f))
        }
        aim.owner = newOwnerAddr
        aim.pendingTransactions.transfer = false
      } catch(err: any)  {
        useUi().log(`Failed to transfer aim: ${err.message ?? err}`, 'error')
        aim.pendingTransactions.transfer = false
      }
    },

    // Flows
    createAndSelectFlow(from: Aim, into: Aim) {
      if(from !== into) {
        if((Aim.Permissions.network & into.permissions) > 0) {
          let flow = this.createFlow(from, into)
          if(flow) {
            let rSum = into.r + from.r 
            if(rSum > 0) {
              flow.relativeDelta = markRaw(vec2.crScale(vec2.crSub(into.pos, from.pos), 1 / rSum))
            }
            this.selectFlow(flow) 
            useUi().sideMenuOpen = true
          }
        } else {
          throw(Error("you need certain permissions for the receiving aim in order to draw a flow")) 
        }
      }
    }, 
    createFlow(from: Aim, into: Aim, cb?: (flow: Flow) => void) : Flow | undefined {
      let rawFlow = new Flow(from, into) 
      if(cb) {
        cb(rawFlow) 
      }

      const bucket = this.flows[from.id] 
      if(bucket) {
        bucket[into.id] = rawFlow
      } else {
        this.flows[from.id] = { 
          [into.id]: rawFlow
        }
      }
      const flow = this.flows[from.id][into.id]

      from.outflows[into.id] = flow 
      into.inflows[from.id] = flow

      into.recalcWeights()

      return flow
    }, 
    async createFlowOnChain(flow: Flow) {
      if(flow.from.address && flow.into.address) {
        let aimContract = useWeb3Connection().getAimContract(flow.into.address) 
        flow.transactionPending = true
        try {
          let relativeDelta = flow.relativeDelta
          let tx = await aimContract.createInflow(
            flow.from.address, 
            {
              explanation: flow.explanation, 
              weight: flow.weight, 
              d2d: vec2AsByteArray(relativeDelta) 
            }
          )
          let rc = await tx.wait()
          let creationEvent: any = rc.events.find((e: any) => e.event === 'FlowCreation') 
          if(creationEvent) {
            flow.clearOrigin()
          }
          flow.transactionPending = false
          flow.published = true
        } catch(error: any) {
          useUi().log(`Failed to create flow: ${error}`, 'error')
          flow.transactionPending = false
        }
      }
    }, 
    // edit and remove flows
    makeUpdateFunctionCall(
      obj: any, 
      type: string, 
      specialCases: {[key: string]: (obj: any) => any} = {}
    ) : [string, any[]] {
      let fields: string[] = []
      let args: any[] = []
      let origin = obj.origin as any
      Object.getOwnPropertyNames(origin).forEach((name: string) => {
        if(origin[name] !== undefined) {
          if(specialCases[name]) {
            let [field, arg] = specialCases[name](obj[name])
            fields.push(field)
            args.push(arg)
          } else {
            fields.push(name)
            args.push(obj[name]) 
          }
        }
      })
      let functionName = 'update' + type + fields.map(f => f[0].toUpperCase() + f.slice(1)).join("")
      return [functionName, args]
    }, 
    async commitFlowChanges(flow: Flow) {
      let [functionName, args] = this.makeUpdateFunctionCall(flow, "Flow", {
        relativeDelta: () => {
          return ['d2d', vec2AsByteArray(flow.relativeDelta)]
        }
      }) 
      const w3 = useWeb3Connection()
      const aimContract = w3.getAimContract(flow.into.address!) 
      flow.transactionPending = true
      try {
        let tx = await aimContract[functionName](flow.from.address!, ...args)
        await tx.wait()
        flow.clearOrigin()
        flow.transactionPending = false
      } catch(err: any)  {
        useUi().log(`Failed to commit flow changes: ${err.message ?? err}`, 'error') 
        flow.transactionPending = false
      }
    }, 
    resetFlowChanges(flow: Flow) {
      Object.entries(flow.origin).forEach(([key, value]) => {
        if(value !== undefined) {
          (flow as any)[key] = value
        }
      })
      flow.clearOrigin()
    }, 
    removeFlow(flow: Flow) {
      if(this.selectedFlow == flow) {
        this.selectedFlow = undefined
      }
      delete flow.from.outflows[flow.into.id]
      delete flow.into.inflows[flow.from.id]
      delete this.flows[flow.from.id][flow.into.id]
    },

    // selection
    selectFlow(flow: Flow) {
      this.selectedAim = undefined
      this.selectedFlow = flow
    }, 
    selectAim(aim: Aim) {
      this.selectedFlow = undefined
      this.selectedAim = aim
      this.lazyLoadAim(aim) 
      this.raiseLoadLevel(aim, 2) 
    },
    focusAim(aim: Aim) {
      this.selectAim(aim) 
      const map = useMap()
      map.centerOnAim(aim) 
    }, 
    deselect() {
      this.selectedAim = undefined
      this.selectedFlow = undefined
    },
    togglePin(aim: Aim) {
      if(aim.address !== undefined) {
        const pinningsStr = window.localStorage.getItem(getPinnedAimsStorageKey())
        if(pinningsStr !== null && pinningsStr !== "") {
          const pinnings = new Set(pinningsStr.split(','))
          if(aim.pinned) {
            pinnings.delete(aim.address) 
          } else {
            pinnings.add(aim.address) 
          }
          window.localStorage.setItem(getPinnedAimsStorageKey(), Array.from(pinnings).join(','))
        } else if (!aim.pinned) {
          window.localStorage.setItem(getPinnedAimsStorageKey(), aim.address) 
        }
        aim.pinned = !aim.pinned
      }
    }, 
  },
  getters: {
    allChanges() {
      let results: Change[] = []
      let aimIds = Object.keys(this.aims) as any as number[]
      for(let aimId in aimIds) {
        let aim = this.aims[aimId]
        let aimChanges = []
        let uncommitted = false
        if(aim.address === undefined) {
          uncommitted = true
        } else {
          if(Object.keys(aim.origin).find(key => (aim.origin as any)[key] !== undefined)) {
            aimChanges.push("data") 
          } 
          if(aim.tokens != aim.tokensOnChain) {
            aimChanges.push("investment") 
          } 
          if(aim.members && aim.members.some(member => member.changed())) {
            aimChanges.push("permissions") 
          }
          if(aim.loopWeightOrigin !== undefined) {
            aimChanges.push("loop weight") 
          }
          if(aim.contributionConfirmationSwitches.size !== 0) {
            aimChanges.push("contribution confirmations")
          }
        }
        let changedFlows: Flow[] = []
        for(let flowId in aim.inflows) {
          let flow = aim.inflows[flowId]
          let hasChanged = Object.keys(flow.origin).some(key => (flow.origin as any)[key] !== undefined)
          if(flow.published !== true || hasChanged) {
            changedFlows.push(flow) 
          } 
        }
        if(uncommitted || aimChanges.length > 0 || changedFlows.length > 0) {
          results.push({
            aim, 
            aimButtonDisabled: !uncommitted && aimChanges.length == 0,
            uncommitted,
            aimChanges, 
            changedFlows, 
          })
        }
      }
      return results
    }
  }, 
})
