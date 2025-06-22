import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import RepoSelector from './RepoSelector.vue';

describe('RepoSelector', () => {
  it('should render directory input', () => {
    const wrapper = mount(RepoSelector);
    expect(wrapper.find('input[type="text"]').exists()).toBe(true);
    expect(wrapper.find('button').text()).toBe('Select Repository');
  });

  it('should emit repo-selected event when valid path is submitted', async () => {
    const wrapper = mount(RepoSelector);
    const input = wrapper.find('input[type="text"]');
    
    await input.setValue('/path/to/repo');
    await wrapper.find('form').trigger('submit');
    
    expect(wrapper.emitted('repo-selected')).toBeTruthy();
    expect(wrapper.emitted('repo-selected')![0]).toEqual(['/path/to/repo']);
  });

  it('should not emit if path is empty', async () => {
    const wrapper = mount(RepoSelector);
    
    await wrapper.find('form').trigger('submit');
    
    expect(wrapper.emitted('repo-selected')).toBeFalsy();
  });

  it('should show loading state when loading prop is true', () => {
    const wrapper = mount(RepoSelector, {
      props: { loading: true }
    });
    
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    expect(wrapper.find('button').text()).toBe('Loading...');
  });

  it('should display error message when provided', () => {
    const errorMessage = 'Repository not found';
    const wrapper = mount(RepoSelector, {
      props: { error: errorMessage }
    });
    
    expect(wrapper.find('.error').exists()).toBe(true);
    expect(wrapper.find('.error').text()).toBe(errorMessage);
  });

  it('should clear error when input changes', async () => {
    const wrapper = mount(RepoSelector, {
      props: { error: 'Some error' }
    });
    
    const input = wrapper.find('input[type="text"]');
    await input.setValue('/new/path');
    
    expect(wrapper.emitted('clear-error')).toBeTruthy();
  });
});