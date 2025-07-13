<template>
  <div 
    @keydown.esc="aimNetwork.deselect"
    class="aim-details"> 
    <h2>Aim</h2>
    
    <div class="block">
      <textarea
        ref='title'
        rows="3"
        class='title' 
        placeholder="Aim title"
        :disabled="!mayEdit"
        :value="aim.title"
        :class="{ 'error': validationErrors.title }"
        @input="updateTitle"></textarea>
      <div v-if="validationErrors.title" class="error-message">{{ validationErrors.title }}</div>
      
      <textarea
        ref='description'
        rows="6"
        class='description' 
        placeholder="Aim description"
        :disabled="!mayEdit"
        :value="aim.description"
        :class="{ 'error': validationErrors.description }"
        @input="updateDescription"></textarea>
      <div v-if="validationErrors.description" class="error-message">{{ validationErrors.description }}</div>

      <div class="status-section">
        <label class="status-toggle">
          <input 
            type="checkbox" 
            :checked="aim.status === 'reached'"
            :disabled="!mayEdit"
            @change="toggleStatus"
          />
          <span class="toggle-label">Done</span>
        </label>
        
        <textarea
          class="status-note"
          rows="2"
          placeholder="Status note (optional)"
          :disabled="!mayEdit"
          :value="aim.statusNote || ''"
          @input="updateStatusNote"></textarea>
      </div>

      <div class="assignees-section">
        <h4>Assignees</h4>
        <div class="assignees-list">
          <div v-for="assignee in aim.assignees" :key="assignee" class="assignee">
            {{ assignee }}
            <button v-if="mayEdit" class="remove-assignee" @click="removeAssignee(assignee)">✖</button>
          </div>
          <div v-if="aim.assignees.length === 0" class="no-assignees">
            No assignees
          </div>
        </div>
        <div v-if="mayEdit" class="add-assignee">
          <input 
            v-model="newAssignee"
            placeholder="Add assignee"
            @keydown.enter="addAssignee"
            @input="() => delete validationErrors.assignee"
            class="assignee-input"
            :class="{ 'error': validationErrors.assignee }"
          />
          <button @click="addAssignee" class="add-button">Add</button>
        </div>
        <div v-if="validationErrors.assignee" class="error-message">{{ validationErrors.assignee }}</div>
      </div>

      <TagInput 
        v-model="aimTags"
        label="Tags"
        @update:modelValue="updateTags"
      />
          
      <div class="fieldButtons">
        <div
          v-if="dirty" 
          class='button' tabindex="0"  
          @keypress.enter.prevent.stop="reset"
          @keypress.space.prevent.stop="reset"
          @click="reset">Reset</div>
        <div 
          v-if="dirty"
          class='button'
          :class="{ 'saving': isSaving, 'disabled': Object.keys(validationErrors).length > 0 }"
          tabindex="0"
          @keypress.enter.prevent.stop="commitChanges"
          @keypress.space.prevent.stop="commitChanges"
          @click="commitChanges">
          {{ isSaving ? 'Saving...' : 'Save' }}
        </div>
        <div
          tabindex="0"  
          class='button remove-button' 
          :class='{confirm: confirmRemove}'
          @blur='confirmRemove = false'
          @keypress.enter.prevent.stop="remove"
          @keypress.space.prevent.stop="remove"
          @click="remove">{{ confirmRemove ? "Confirm removal" : "Remove aim" }}</div>
      </div>
      <div 
        :class="{deactivated: buisy}"
        class="overlay">
      </div>
    </div>

    <h3>Flows</h3>
    <div class="block">
      <p class="flowDirection">Incoming flows</p>
      <div class="flow loop">
        Self-importance: {{ Math.floor(100 * aim.loopShare) }}%
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
      
      <p class="flowDirection">Outgoing flows</p>
      <div v-if="outflows.length == 0" class="flow loop">
        None
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
      </div>
    </div>

    <div class="scrollspace"/>
    <BackButton 
      tabindex="0"
      @click="aimNetwork.deselect"/>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, ref } from "vue"
import { Aim, Flow, useAimNetwork } from "../stores/aim-network-git"
import TagInput from './TagInput.vue'
import BackButton from './SideBar/BackButton.vue'

interface Outflow {
  share: number, 
  flow: Flow, 
  title: string
}

export default defineComponent({
  name: "AimDetails",
  components: {
    TagInput,
    BackButton, 
  },
  props: {
    aim: {
      type: Object as PropType<Aim>,
      required: true
    }
  },
  setup(props) {
    const aimNetwork = useAimNetwork()
    const confirmRemove = ref(false)
    const newAssignee = ref("")
    const validationErrors = ref<{ [key: string]: string }>({})
    const isSaving = ref(false)
    
    const aimTags = computed({
      get: () => props.aim.tags || [],
      set: (tags: string[]) => {
        props.aim.tags = tags
      }
    })

    return {
      aimNetwork,
      confirmRemove,
      newAssignee,
      aimTags,
      validationErrors,
      isSaving
    }
  },
  computed: {
    buisy() {
      return this.aim.anyOperationPending()
    }, 
    outflows() : Outflow[] {
      let v = Object.values(this.aim.outflows)
      let results = []
      let from = this.aim, into
      let absOutflow, absOutflowSum = 0
      for(let flow of v) {
        into = flow.into
        absOutflow = flow.share * (into.effort + 1) // Use effort instead of token supply
        absOutflowSum += absOutflow
        results.push({
          title: into.title, 
          flow: flow, 
          share: absOutflow 
        })
      }
      results.forEach(r => r.share = r.share / absOutflowSum)
      return results
    }, 
    mayEdit() {
      return (this.aim.permissions & Aim.Permissions.edit) > 0
    },
    dirty() : boolean {
      return ( 
        Object.values(this.aim.origin).filter((v: any) => v !== undefined).length > 0 
      ) 
    }, 
  }, 
  methods: {
    init() {
      this.newAssignee = ""
      setTimeout(() => {
        (this.$refs.title as HTMLInputElement)?.focus()
      }, 0)
    }, 
    
    toggleStatus(event: Event) {
      const checked = (event.target as HTMLInputElement).checked
      this.aim.updateStatus(checked ? 'reached' : 'not_reached')
    },

    updateTitle(e: Event) {
      const v = (e.target as HTMLTextAreaElement).value
      this.validateTitle(v)
      this.aim.updateTitle(v) 
    }, 
    
    updateDescription(e: Event) {
      const v = (e.target as HTMLTextAreaElement).value
      this.validateDescription(v)
      this.aim.updateDescription(v)
    },
    
    validateTitle(title: string) {
      if (!title.trim()) {
        this.validationErrors.title = 'Title is required'
      } else if (title.length > 200) {
        this.validationErrors.title = 'Title too long (max 200 characters)'
      } else {
        delete this.validationErrors.title
      }
    },
    
    validateDescription(description: string) {
      if (description.length > 2000) {
        this.validationErrors.description = 'Description too long (max 2000 characters)'
      } else {
        delete this.validationErrors.description
      }
    },
    
    validateAssignee(assignee: string) {
      if (!assignee.trim()) {
        this.validationErrors.assignee = 'Assignee cannot be empty'
      } else if (assignee.length > 100) {
        this.validationErrors.assignee = 'Assignee name too long (max 100 characters)'
      } else if (this.aim.assignees.includes(assignee)) {
        this.validationErrors.assignee = 'Assignee already exists'
      } else {
        delete this.validationErrors.assignee
      }
    }, 

    updateStatusNote(e: Event) {
      const v = (e.target as HTMLTextAreaElement).value
      this.aim.updateStatusNote(v)
    },

    updateTags(tags: string[]) {
      this.aim.tags = tags
    },

    addAssignee() {
      const assignee = this.newAssignee.trim()
      this.validateAssignee(assignee)
      
      if (!this.validationErrors.assignee && assignee) {
        this.aim.assignees.push(assignee)
        this.newAssignee = ""
      }
    },

    removeAssignee(assignee: string) {
      const index = this.aim.assignees.indexOf(assignee)
      if (index > -1) {
        this.aim.assignees.splice(index, 1)
      }
    },
    
    reset() {
      this.aimNetwork.resetAimChanges(this.aim)
    }, 
    
    async commitChanges() {
      if (!this.dirty) return
      
      // Validate all fields before saving
      this.validateTitle(this.aim.title)
      this.validateDescription(this.aim.description)
      
      if (Object.keys(this.validationErrors).length > 0) {
        return // Don't save if there are validation errors
      }
      
      try {
        this.isSaving = true
        await this.aimNetwork.commitAimChanges(this.aim)
      } catch (error) {
        console.error('Failed to save changes:', error)
        // Could add a toast notification here
      } finally {
        this.isSaving = false
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
  }
})
</script>

<style scoped lang="less">
.aim-details {
  text-align: center; 
  
  .block {
    position: relative;
    background-color: #333;
    margin: 1rem;
    padding: 1rem;
    border-radius: 0.5rem;
  }

  .fieldButtons {
    margin: 1rem 0; 
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .button {
    padding: 0.5rem 1rem;
    background-color: #555;
    color: white;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    
    &:hover:not(.disabled) {
      background-color: #666;
    }
    
    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    &.saving {
      background-color: #4a9eff;
      cursor: wait;
    }
    
    &.remove-button {
      background-color: #666;
      
      &.confirm {
        background-color: #c44;
      }
    }
  }

  .error-message {
    color: #ff6b6b;
    font-size: 0.8rem;
    margin: 0.25rem 0;
  }

  .status-section {
    margin: 1rem 0;
  }

  .status-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    cursor: pointer;
    
    input[type="checkbox"] {
      width: 1.2rem;
      height: 1.2rem;
    }
    
    .toggle-label {
      font-size: 1rem;
      color: #ccc;
    }
  }

  .status-note {
    width: 100%;
    background-color: #444;
    color: white;
    border: 1px solid #555;
    border-radius: 0.25rem;
    padding: 0.5rem;
    resize: vertical;
  }

  .assignees-section {
    margin: 1rem 0;
    text-align: left;
    
    h4 {
      margin: 0 0 0.5rem 0;
      color: #ccc;
    }
  }

  .assignees-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .assignee {
    background-color: #555;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .remove-assignee {
    background: none;
    border: none;
    color: #ccc;
    cursor: pointer;
    font-size: 0.8rem;
    
    &:hover {
      color: white;
    }
  }

  .no-assignees {
    color: #888;
    font-style: italic;
  }

  .add-assignee {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .assignee-input {
    flex: 1;
    padding: 0.5rem;
    background-color: #444;
    color: white;
    border: 1px solid #555;
    border-radius: 0.25rem;
  }

  .add-button {
    padding: 0.5rem 1rem;
    background-color: #555;
    color: white;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    
    &:hover {
      background-color: #666;
    }
  }
  
  textarea, input {
    width: 100%;
    background-color: #444;
    color: white;
    border: 1px solid #555;
    border-radius: 0.25rem;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    resize: vertical;
    
    &.error {
      border-color: #ff6b6b;
      background-color: #553;
    }
  }

  textarea::placeholder, input::placeholder {
    color: #888;
  }
  
  .flowDirection {
    text-align: left; 
    margin: 1.5rem 1rem 0.5rem 2rem; 
    font-weight: bold;
    color: #ccc;
  }
  
  .flow {
    text-align: left; 
    display: block; 
    margin: 0 1rem; 
    padding: 0.5rem 1rem;
    background-color: #444;
    border-radius: 0.25rem;
    margin-bottom: 0.25rem;
    
    &.loop {
      background-color: #555; 
    }
    
    &.button {
      cursor: pointer;
      
      &:hover {
        background-color: #555;
      }
    }
  }
  
  .outflow {
    .flow(); 
  }

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
    
    &.deactivated {
      opacity: 1;
      pointer-events: all;
    }
  }

  .scrollspace {
    height: 2rem;
  }
}
</style>