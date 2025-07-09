<template>
  <div 
    @keydown.esc="aimNetwork.deselect"
    class="aim-details"> 
    <h2>aim</h2>
    
    <div class=block>
      <textarea
        ref='title'
        rows="4"
        class='title' 
        placeholder="aim title"
        :disabled="!mayEdit"
        :value="aim.title"
        @input="updateTitle"></textarea>
      <textarea
        ref='description'
        rows="9"
        class='description' 
        placeholder="aim description"
        :disabled="!mayEdit"
        :value="aim.description"
        @input="updateDescription"></textarea>
      <input 
        class='effort' 
        :value='aim.effort == 0 ? "" : aim.effort'
        placeholder="effort"
        :disabled="!mayEdit"
        @input="updateEffort"/>
      <MultiSwitch
        class='status'
        label="status"
        :disabled="!mayEdit"
        :value="aim.status"
        :options="statusOptions" 
        @change='updateState'
        />

          
      <div class="fieldButtons">
        <div
          v-if="dirty" 
          class='button' tabindex="0"  
          @keypress.enter.prevent.stop="reset"
          @keypress.space.prevent.stop="reset"
          @click="reset">Reset</div>
        <div 
          v-if="dirty && public"
          class='button'
          tabindex="0"
          @keypress.enter.prevent.stop="commitChanges"
          @keypress.space.prevent.stop="commitChanges"
          @click="commitChanges">Commit</div>
        <div
          tabindex="0"  
          v-if="aim.address === undefined"
          class='button' 
          :class='{confirm: confirmRemove}'
          @blur='confirmRemove = false'
          @keypress.enter.prevent.stop="remove"
          @keypress.space.prevent.stop="remove"
          @click="remove">{{ confirmRemove ? "Confirm removal" : "Remove aim" }}</div>
        <!-- v-else blacklist button -->
        <div
          v-if="public"
          tabindex="0"
          class='button'
          :class="{share: !justCopiedToClipboard, copied: justCopiedToClipboard}"
          @keypress.enter.prevent.stop="share"
          @keypress.space.prevent.stop="share"
          @click="share">{{justCopiedToClipboard ? "Copied to clipboard!" : ""}}</div>
      </div>
      <div 
        :class="{deactivated: !(aim.pendingTransactions.data || buisy)}"
        class="overlay">
      </div>
    </div>

    <h3 v-if="aim.address !== undefined"> investment </h3>
    <h3 v-else> initial investment </h3>
    <div class=block>
      <div v-if="aim.address == undefined">
        <input class="tokenInfo" size="13" placeholder="token name" 
          :value="aim.tokenName"
          @input="changeTokenName"/>
        <input class="tokenInfo" size="5" placeholder="symbol" 
          :value="aim.tokenSymbol"
          @input="changeTokenSymbol"/>
      </div>
      <div v-else>
        <p class="supply">total supply: <b class="nowrap">{{aim.tokenSupply}} {{ aim.tokenSymbol }}</b></p>
      </div>
      <BigIntSlider 
        name='balance'
        :left='tokensSliderMin.toString()'
        :right='tokensSliderMax.toString()'
        :from='tokensSliderMin'
        :to='tokensSliderMax'
        :value='aim.tokens'
        unit="tokens"
        @drag-end='updateTokensSliderOrigin'
        @update='updateTokens'/>
      <div v-if="aim.address == undefined">
        <div 
          v-if='aim.tokenName != "" && aim.tokenSymbol != ""'
          class='button' 
          tabindex="0" 
          @keypress.enter.prevent.stop="createAimOnChain"
          @keypress.space.prevent.stop="createAimOnChain"
          @click="createAimOnChain">Create aim on chain for {{ createPrice }} {{nativeCurrency.symbol}} </div>
        <p v-else> 
          <span class="hint">
            Token name and symbol are required for creating an aim on chain.
          </span>
        </p>
      </div>
      <div v-else-if='trade !== undefined'>
        <div 
          class='button' 
          tabindex="0" 
          @keypress.enter.prevent.stop="resetTokens"
          @keypress.space.prevent.stop="resetTokens"
          @click="resetTokens"> 
          Reset 
        </div>
        <div
          class='button' 
          tabindex="0" 
          @keypress.enter.prevent.stop="doTrade"
          @keypress.space.prevent.stop="doTrade"
          @click="doTrade"> 
          {{ trade.verb }} {{ trade.amount }} {{ aim.tokenSymbol }} for <br/> {{ trade.humanPrice }} {{ nativeCurrency.symbol }}
        </div>
      </div>
      <div 
        :class="{deactivated: !(aim.pendingTransactions.investment || buisy)}"
        class=overlay />
    </div>

    <h3> permissions </h3>
    <div class=block>
      <p>
        my permissions: 
        <span class="permission-indicator" 
          v-for="permission, key in permissions" 
          :key="key">{{ permission }}</span>
        <span class="permission-indicator" v-if="permissions.length == 0">
          none
        </span>
      </p>

      <div v-if="aim.address == undefined">
        <p> Aim has to be saved on chain before managing members. </p>
      </div>
      <div class="memberSection" v-else >
        <div> 
          <span>owner</span>: 
          <ShortAddress :address="aim.owner ?? myself"/>
        </div>
        <h4 v-if="aim.members.length > 0" class="member"> 
          members
        </h4>
        <div v-for="member in aim.members" :key="member.address" class="member">
          <div 
            class="editButton" 
            tabindex="0" 
            @keypress.enter.prevent.stop="editMember(member)"
            @keypress.space.prevent.stop="editMember(member)"
            @click="editMember(member)"/>
          <ShortAddress :address="member.address" />:
          <span v-for="v, key in aimPermissions"><span class="permission-indicator" v-if="v & member.permissions">{{key}}</span></span>
        </div>
        <p v-if="aim.members.length == 0">there are no members</p>
        <div v-if="membersChanged && public" class="memberChangesActions"> 
          <div 
            class="button" 
            @keypress.enter.prevent.stop="resetMembers"
            @keypress.space.prevent.stop="resetMembers"
            @click="resetMembers">
            Reset 
          </div>
          <div 
            class="button" 
            @keypress.enter.prevent.stop="commitMembers"
            @keypress.space.prevent.stop="commitMembers"
            @click="commitMembers">
            Commit 
          </div> 
        </div>
        <div v-if="mayManage" class="editSection">
          <div> add or edit member: 
          <input 
            ref="newMemberAddr"
            class="newMemberAddr"
            placeholder="account address"
            :value="memberAddr"
            @input="inputMemberAddress"
            >
          </div>
          <p class="permissionToggles"> permissions: 
            <span 
              v-for="selected, permission in permissionGranting"
              class="permission-indicator toggleable" :class="{selected}"
              tabindex="0"
              @keypress.enter.prevent.stop="togglePermissionGranting(permission as string)"
              @keypress.space.prevent.stop="togglePermissionGranting(permission as string)"
              @click="togglePermissionGranting(permission as string)">
              {{permission}}
            </span>
            <span
              class="permission-indicator toggleable"
              tabindex="0"
              @keypress.enter.prevent.stop="resetPermissionGranting"
              @keypress.space.prevent.stop="resetPermissionGranting"
              @click="resetPermissionGranting"
              >x</span>
          </p>
          <p class="hint" v-if="memberAddrError">{{memberAddrError}}</p>
          <div v-else-if="memberAddr !== ''">
            <div class="button" tabindex=0 @click="addMember">{{memberEditing ? "Change permissions" : "Add member"}}</div>
            <div 
              class=button
              tabindex=0
              :class="{confirm: confirmTransfer}"
              v-if="mayTransfer" 
              @blur='confirmTransfer = false'
              @keypress.enter.prevent.stop="transferOwnership"
              @keypress.space.prevent.stop="transferOwnership"
              @click="transferOwnership">
              {{ confirmTransfer ? "Confirm transfer" : "Transfer ownership" }}
            </div>
          </div>
        </div>
      </div>
      <div 
        :class="{deactivated: !(aim.pendingTransactions.members || buisy)}"
        class=overlay />
    </div>

    <h3> flows </h3>
    <div class=block>
      <Slider
        v-if='mayNetwork'
        name='loop weight'
        left='0'
        right='100'
        :factor="100/0xffff"
        :decimalPlaces='2'
        :from='0'
        :to='0xffff'
        :value='aim.loopWeight'
        @update='updateLoopWeight'/>
      <p v-else> loop weight: {{ Math.floor(100 * aim.loopWeight / 0xffff) }}% </p>
      <div 
        v-if='aim.address && aim.loopWeightOrigin'
        class='button' 
        tabindex="0" 
        @keypress.enter.prevent.stop="commitLoopWeight"
        @keypress.space.prevent.stop="commitLoopWeight"
        @click="commitLoopWeight">
          Commit 
      </div>
      <p class=flowDirection> incoming flows </p>
      <div class="flow loop">
        loop share: {{ Math.floor(100 * aim.loopShare) }}%
      </div>
      <div 
        class="flow button" 
        v-for="(flow, aimId) in aim.inflows" 
        tabindex="0"
        @keypress.enter.prevent.stop="flowClick(flow)"
        @keypress.space.prevent.stop="flowClick(flow)"
        @click="flowClick(flow)" 
        :key="aimId">
        {{ (100 * flow.share).toFixed(0) }}% : 
        {{ flow.from.title || "[unnamed]"}} 
      </div>
      <p class=flowDirection> outgoing flows </p>
      <div v-if="outflows.length == 0" class="flow loop">
        none
      </div>
      <div 
        class="outflow button" 
        v-for="(outflow, aimId) in outflows" 
        tabindex="0"
        @keypress.enter.prevent.stop="flowClick(outflow.flow)"
        @keypress.space.prevent.stop="flowClick(outflow.flow)"
        @click="flowClick(outflow.flow)" 
        :key="aimId">
        {{ (100 * outflow.share).toFixed(0) }}%: 
        {{ outflow.title }} 
        <div 
          class=confirmButton
          v-if='outflow.showConfirmedness'
          tabindex="0"
          @keypress.enter.prevent.stop="toggleContributionConfirmation(outflow.flow)"
          @keypress.space.prevent.stop="toggleContributionConfirmation(outflow.flow)"
          @click.stop="toggleContributionConfirmation(outflow.flow)"
          :class="{confirmed: outflow.confirmed, deactivated: !mayNetwork}">
        </div>
      </div>
      <p/>
      <div v-if="contributionConfirmationsChanged && mayNetwork">
        <div
          class='button' tabindex="0"  
          @keypress.enter.prevent.stop="resetContributionConfirmations"
          @keypress.space.prevent.stop="resetContributionConfirmations"
          @click="resetContributionConfirmations">Reset</div>
        <div 
          class='button' tabindex="0"
          @click="commitContributionConfirmations">Commit</div>
      </div>
      <div 
        :class="{deactivated: !(aim.pendingTransactions.contributionConfirmations || buisy)}"
        class=overlay />
    </div>

    <div class="scrollspace"/>
    <BackButton 
      tabindex="0"
      @click="aimNetwork.deselect"/>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"

import { Aim, Member, Flow, useAimNetwork } from "../stores/aim-network"

import MultiSwitch from './MultiSwitch.vue'
import BigIntSlider from './BigIntSlider.vue'
import Slider from './Slider.vue'
import ShortAddress from './ShortAddress.vue'
import BackButton from './SideBar/BackButton.vue'

import { humanizeAmount } from '../tools'
import { useWeb3Connection } from "../stores/web3-connection"
import { ethers } from "ethers"

interface Trade {
  verb: string, 
  amount: bigint, 
  price: bigint, 
  humanPrice: string
}

interface Outflow {
  share: number, 
  flow: Flow, 
  title: string, 
  showConfirmedness: boolean, 
  confirmed: boolean,
}

export default defineComponent({
  name: "AimDetails",
  components: {
    MultiSwitch,
    BigIntSlider, 
    Slider, 
    ShortAddress, 
    BackButton, 
  },
  props: {
    aim: {
      type: Object as PropType<Aim>,
      required: true
    }
  },
  data() {
    const aimNetwork = useAimNetwork()
    const w3c = useWeb3Connection()
    return { 
      aimPermissions: Aim.Permissions, 
      aimNetwork, 
      confirmRemove: false, 
      confirmTransfer: false, 
      tokenSliderOrigin: 0n,
      statusOptions: [
        {
          value: "untouched", 
          color: "#288"
        }, 
        {
          value: "brewing", 
          color: "#892", 
        }, 
        {
          value: "wip", 
          color: "#a74", 
        }, 
        { 
          value: "maintainance", 
          color: "#56b", 
        }
      ],
      nativeCurrency: w3c.nativeCurrency!, 
      myself: w3c.address,
      justCopiedToClipboard: false,
      permissionGranting: {} as {[key: string]: boolean},
      memberAddr: "", 
    }
  }, 
  mounted() {
    this.init()
  },
  watch: {
    aim: {
      handler(_new, _old) {
        this.init()
      },
      deep: false
    }
  },
  computed: {
    buisy() {
      return this.aim.pendingTransactions.transfer || this.aim.pendingTransactions.creation
    }, 
    contributionConfirmationsChanged() {
      return this.aim.contributionConfirmationSwitches.size > 0
    }, 
    outflows() : Outflow[] {
      let v = Object.values(this.aim.outflows)
      let results = []
      let from = this.aim, into
      let confirmAvailable
      let absOutflow, absOutflowSum = 0
      for(let flow of v) {
        into = flow.into
        absOutflow = flow.share * Number(into.tokenSupply + into.tokens - into.tokensOnChain)
        absOutflowSum += absOutflow
        confirmAvailable = from.address !== undefined && into.address !== undefined && flow.published
        results.push({
          title: into.title, 
          flow: flow, 
          showConfirmedness: confirmAvailable,
          confirmed: confirmAvailable ? 
            from.contributionConfirmationsOnChain.has(into.address!) != from.contributionConfirmationSwitches.has(into.address!) : false,
          share: absOutflow 
        })
      }
      results.forEach(r => r.share = r.share / absOutflowSum)
      return results
    }, 
    memberAddrError() {
      if(this.memberAddr != "" && !(ethers.utils.isAddress(this.memberAddr))) {
        return "enter a valid account address"
      }     
    }, 
    memberEditing() {
      for(let member of this.aim.members) {
        if(member.address == this.memberAddr) {
          return true
        }
      }
      return false
    }, 
    createPrice() {
      return humanizeAmount(this.aim.tokens ** 2n)
    }, 
    membersChanged() {
      return this.aim.members && this.aim.members.some(member => member.changed())
    },
    mayManage() {
      return (this.aim.permissions & Aim.Permissions.manage) > 0
    },
    mayTransfer() {
      return (this.aim.permissions & Aim.Permissions.transfer) > 0
    }, 
    mayNetwork() {
      return (this.aim.permissions & Aim.Permissions.network) > 0
    }, 
    mayEdit() {
      return (this.aim.permissions & Aim.Permissions.edit) > 0
    },
    public() {
      return this.aim.address !== undefined
    },
    trade() : undefined | Trade {
      const aim = this.aim
      if( aim.tokens !== aim.tokensOnChain) {
        let amount = aim.tokens - aim.tokensOnChain
        let volPricePre = aim.tokenSupply ** 2n
        let newSupply = aim.tokenSupply + amount
        let volPricePost = newSupply ** 2n
        let price = volPricePost - volPricePre
        if( amount > 0n ) {
          return {
            verb: 'Buy', 
            amount,
            price, 
            humanPrice: humanizeAmount(price)
          }
        } else {
          return {
            verb: 'Sell', 
            amount: -amount, 
            price: -price, 
            humanPrice: humanizeAmount(-price)
          }
        }
      }
    }, 
    permissions() : string[] {
      let permissions: string[] = []
      for(let name in Aim.Permissions) {
        let bits = Aim.Permissions[name]
        if((this.aim.permissions & bits) == bits) {
          permissions.push(name) 
        }
      }
      return permissions
    }, 
    dirty() : boolean {
      return ( 
        Object.values(this.aim.origin).filter((v: any) => v !== undefined).length > 0 
      ) 
    }, 
    tokensSliderMin(): bigint {
      let min = this.tokenSliderOrigin / 2n - 1000000n
      if(min < 0n) {
        min = 0n
      }
      return min
    }, 
    tokensSliderMax(): bigint {
      return this.tokenSliderOrigin * 2n + 1000000n
    }, 
  }, 
  methods: {
    init() {
      this.resetPermissionGranting()
      this.updateTokensSliderOrigin()
      this.memberAddr = ""
      {
        (this.$refs.title as HTMLInputElement).focus();
      }
    }, 
    resetPermissionGranting() {
      let list = []
      for(let permission of ['edit', 'network']) {
        if((this.aim.permissions & Aim.Permissions[permission]) > 0) {
          list.push(permission)
        }
      }
      if ((this.aim.permissions & Aim.Permissions.transfer) > 0) { // owner can appoint managers
        list.push('manage') 
      }
      this.permissionGranting = {}
      for(let permission of list) {
        this.permissionGranting[permission] = false
      }
    },
    togglePermissionGranting(permission: string) {
      this.permissionGranting[permission] = !this.permissionGranting[permission]
    },
    share() {
      let url = `${window.location.origin}/?loadAim=${this.aim.address}`
      navigator.clipboard.writeText(url).then(() => {
        this.justCopiedToClipboard = true
        setTimeout(() => {
          this.justCopiedToClipboard = false
        }, 3000)
      })
    },
    updateTokensSliderOrigin(){
      this.tokenSliderOrigin = this.aim.tokens
    }, 
    updateTokens(v: bigint) {
      this.aim.updateTokens(v) 
    }, 
    updateState(v: string) {
      this.aim.updateState(v) 
    }, 
    updateTitle(e: Event) {
      const v = (<HTMLTextAreaElement>e.target).value
      this.aim.updateTitle(v) 
      if(v && this.aim.suggestTokenNameAndSymbol) {
        let firstWord = this.aim.title.split(/(\s+)/)[0]
        this.aim.tokenName = firstWord[0].toUpperCase() + firstWord.slice(1) + "Token"
        let konsonants = v.replace(/[aejiouy]|[^a-z]/gi, '').toUpperCase()
        if(konsonants.length > 5) {
          this.aim.tokenSymbol = konsonants.slice(0, 3) + konsonants.slice(-2)
        } else {
          this.aim.tokenSymbol = konsonants
        }
        if(this.aim.tokenSymbol == "") {
          this.aim.tokenSymbol = firstWord.slice(0, 3).toUpperCase()
        }
      }
    }, 
    updateDescription(e: Event) {
      const v = (<HTMLTextAreaElement>e.target).value
      this.aim.updateDescription(v)
    }, 
    updateEffort(e: Event) {
      let inputEl = (<HTMLTextAreaElement>e.target)
      const v = Number(inputEl.value)
      if(!isNaN(v)) {
        this.aim.updateEffort(v) 
      } else {
        inputEl.value = this.aim.effort.toString()
      }
    }, 
    reset() {
      this.aimNetwork.resetAimChanges(this.aim)
      this.updateTokensSliderOrigin()
    }, 
    resetTokens() {
      this.aim.setTokens(this.aim.tokensOnChain)
      this.updateTokensSliderOrigin()
    }, 
    createAimOnChain() {
      this.aimNetwork.createAimOnChain(this.aim) 
    }, 
    commitChanges() {
      if(this.dirty) {
        this.aimNetwork.commitAimChanges(this.aim) 
      }
    }, 
    commitMembers() {
      this.aimNetwork.commitAimMemberChanges(this.aim) 
    },
    commitContributionConfirmations() {
      this.aimNetwork.commitContributionConfirmations(this.aim) 
    },
    resetContributionConfirmations() {
      this.aimNetwork.resetContributionConfirmations(this.aim) 
    }, 
    editMember(member: Member) {
      this.memberAddr = member.address
      this.resetPermissionGranting()
      for(let permission in this.permissionGranting) {
        if(member.permissions & Aim.Permissions[permission]) {
          this.permissionGranting[permission] = true
        }
      }
    },
    resetMembers() {
      for(let member of this.aim.members) {
        member.reset()
      }
    }, 
    doTrade() {
      // allow price slip
      if(this.trade !== undefined) {
        if(this.trade.verb == "Buy") {
          this.aimNetwork.buyTokens(this.aim, this.trade.amount, this.trade.price) 
        } else {
          this.aimNetwork.sellTokens(this.aim, this.trade.amount, this.trade.price) 
        }
      }
    },
    flowClick(flow: Flow) {
      this.aimNetwork.selectFlow(flow)
    }, 
    remove() {
      if(!this.confirmRemove) {
        this.confirmRemove = true
      } else {
        this.aimNetwork.removeAim(this.aim)
      }
    },
    updateLoopWeight(v: number) {
      this.aim.updateLoopWeight(v)
    }, 
    commitLoopWeight() {
      this.aimNetwork.commitLoopWeight(this.aim)
    }, 
    changeTokenName(e: Event) {
      const v = (<HTMLInputElement>e.target).value
      this.aim.tokenName = v
      this.aim.suggestTokenNameAndSymbol = false
    }, 
    changeTokenSymbol(e: Event) {
      const v = (<HTMLInputElement>e.target).value
      this.aim.tokenSymbol = v
      this.aim.suggestTokenNameAndSymbol = false
    },
    inputMemberAddress(e: Event) {
      const v = (<HTMLInputElement>e.target).value
      this.memberAddr = v
    },
    addMember() {
      if(!ethers.utils.isAddress(this.memberAddr)) {
        return
      }

      let permissions = 0
      Object.keys(this.permissionGranting).forEach(permission => {
        if(this.permissionGranting[permission]) {
          permissions |= Aim.Permissions[permission]
        }
      })

      let member = this.aim.members.find(m => m.address == this.memberAddr)
      if(member !== undefined) {
        member.updatePermissions(permissions)
      } else {
        let newMember = new Member(this.memberAddr, permissions, 0x00)
        this.aim.members.push(newMember)
      }
    }, 
    transferOwnership() {
      if(!this.confirmTransfer) {
        this.confirmTransfer = true
      } else {
        this.aimNetwork.transferAim(this.aim, this.memberAddr)
      }
    },
    toggleContributionConfirmation(flow: Flow) {
      if(this.mayNetwork && flow.into.address !== undefined) {
        if(this.aim.contributionConfirmationSwitches.has(flow.into.address)) {
          this.aim.contributionConfirmationSwitches.delete(flow.into.address)
        } else {
          this.aim.contributionConfirmationSwitches.add(flow.into.address)
        }
      }
    },
  }, 
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.aim-details{
  text-align: center; 
  .fieldButtons {
    margin: 1rem; 
    .share {
      background-image: url(../assets/share.svg);
      background-size: 50%;
      background-repeat: no-repeat;
      background-position: center;
      height: 2.5rem; 
      width: 2.5rem;
      padding: 0; 
    }
    .copied{
      background-image: none;
      background-color: shade(@c3, 10%);
      height: auto;
      width: auto;
    }
  }
  .button {
    &.confirm {
      background-color: @danger; 
    }
  }
  .permission {
    display: inline-block; 
    input {
      width: 2.5rem;
      height: 2.5rem; 
      vertical-align: middle; 
      margin: 0.5rem; 
    }
    margin: 0.5rem; 
  }
  .tokenInfo {
    margin: 0.5rem;
    display: inline-block; 
    width: auto; 
  }
  .flowDirection {
    text-align: left; 
    margin: 1.5rem 1rem 0.5rem 2rem; 
  }
  .flow {
    text-align: left; 
    display: block; 
    margin: 0 1rem; 
    &.loop {
      background-color: @mid2; 
      padding: 0.5rem 1rem; 
      margin: 0rem 1rem; 
    }
  }
  .outflow {
    .flow(); 
    position:relative; 
    @cbSize: 2.5rem;  
    padding-right: @cbSize + 1rem; 
    .confirmButton {
      width: @cbSize; 
      height: @cbSize; 
      right: 0rem; 
      top: 0rem; 
      position: absolute;
      background-color: #fff4; 
      background-image: url(../assets/unconfirmed.svg);
      background-size: 70%;
      background-position: center;
      background-repeat: no-repeat;
      &.confirmed {
        background-image: url(../assets/confirmed.svg);
      }
      &:hover {
        background-color: #fff8; 
      }
      &.deactivated {
        background-color: #fff0; 
        pointer-events: none; 
      }
    }
  }
  textarea {
    resize: vertical; 
  }
  .permission-indicator {
    cursor: default; 
    &.toggleable{
      padding: 0.3rem;
      cursor: pointer;
      user-select: none; 
      background-color: #fff0; 
      border: 0.2rem solid #fff4;
      box-sizing: border-box;
    }
    &.selected {
      padding: 0.5rem;
      background-color: #fff4; 
      border: none; 
    }
    padding: 0.25rem;
    margin: 0.25rem; 
    border-radius: 0.3rem; 
    background-color: #fff4; 
    vertical-align: middle;
    &.owner {
      background-color: fade(@c2, 50%);
    }
  }
  .member {
    margin: 0rem 1rem;
    text-align: left;
    line-height: 2rem;
  }
  .newMemberAddr {
    margin: 0.5rem;
  }
  .permissionToggles {
    margin-bottom: 1.5rem;
  }
  .editSection{
    background-color: #0004; 
    padding: 1rem 0rem; 
    margin:1rem; 
  }
  .editButton {
    display: inline-block;
    width: 2.5rem; 
    height: 2.5rem; 
    vertical-align: bottom;
    background-image: url(../assets/edit.svg);
    background-size: 100%;
    background-repeat: no-repeat;
    background-position: center;
  }
  .memberChangesActions {
    margin: 1rem; 
  }
}

</style>
