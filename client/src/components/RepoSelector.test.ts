import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RepoSelector from './RepoSelector.vue';

// Mock DirectoryPicker component
const MockDirectoryPicker = {
  template: `<div class="mock-directory-picker">
    <button @click="$emit('manual-path', '/mock/path')">Mock Select</button>
  </div>`,
  emits: ['directory-selected', 'manual-path', 'error']
};

describe('RepoSelector', () => {
  it('should render the header and directory picker', () => {
    const wrapper = mount(RepoSelector, {
      global: {
        stubs: {
          DirectoryPicker: MockDirectoryPicker
        }
      }
    });
    
    expect(wrapper.find('h2').text()).toBe('Select Repository');
    expect(wrapper.find('.mock-directory-picker').exists()).toBe(true);
  });

  it('should emit repo-selected event when manual path is selected', async () => {
    const wrapper = mount(RepoSelector, {
      global: {
        stubs: {
          DirectoryPicker: MockDirectoryPicker
        }
      }
    });
    
    await wrapper.find('button').trigger('click');
    
    expect(wrapper.emitted('repo-selected')).toBeTruthy();
    expect(wrapper.emitted('repo-selected')![0]).toEqual(['/mock/path']);
  });

  it('should show loading state when loading prop is true', () => {
    const wrapper = mount(RepoSelector, {
      props: { loading: true },
      global: {
        stubs: {
          DirectoryPicker: MockDirectoryPicker
        }
      }
    });
    
    // Since no path is selected initially, no proceed button should be visible
    expect(wrapper.find('.proceed-button').exists()).toBe(false);
  });

  it('should display error message when provided', () => {
    const errorMessage = 'Repository not found';
    const wrapper = mount(RepoSelector, {
      props: { error: errorMessage },
      global: {
        stubs: {
          DirectoryPicker: MockDirectoryPicker
        }
      }
    });
    
    expect(wrapper.find('.error').exists()).toBe(true);
    expect(wrapper.find('.error').text()).toBe(errorMessage);
  });

  it('should show selected path UI after path selection', async () => {
    const wrapper = mount(RepoSelector, {
      global: {
        stubs: {
          DirectoryPicker: MockDirectoryPicker
        }
      }
    });
    
    // Simulate manual path selection
    await wrapper.findComponent(MockDirectoryPicker).vm.$emit('manual-path', '/test/path');
    await wrapper.vm.$nextTick();
    
    expect(wrapper.find('.selected-path').exists()).toBe(true);
    expect(wrapper.find('.selected-path h3').text()).toContain('/test/path');
  });

  it('should clear selection when clear button is clicked', async () => {
    const wrapper = mount(RepoSelector, {
      global: {
        stubs: {
          DirectoryPicker: MockDirectoryPicker
        }
      }
    });
    
    // First select a path
    await wrapper.findComponent(MockDirectoryPicker).vm.$emit('manual-path', '/test/path');
    await wrapper.vm.$nextTick();
    
    expect(wrapper.find('.selected-path').exists()).toBe(true);
    
    // Clear selection
    await wrapper.find('.clear-button').trigger('click');
    await wrapper.vm.$nextTick();
    
    expect(wrapper.find('.selected-path').exists()).toBe(false);
    expect(wrapper.emitted('clear-error')).toBeTruthy();
  });
});