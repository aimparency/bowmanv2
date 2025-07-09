import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import InitDialog from './InitDialog.vue';

describe('InitDialog', () => {
  it('should render initialization form', () => {
    const wrapper = mount(InitDialog, {
      props: { visible: true }
    });
    
    expect(wrapper.find('input#title').exists()).toBe(true);
    expect(wrapper.find('textarea#description').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').text()).toContain('Initialize');
  });

  it('should not be visible when visible prop is false', () => {
    const wrapper = mount(InitDialog, {
      props: { visible: false }
    });
    
    expect(wrapper.find('.dialog-overlay').exists()).toBe(false);
  });

  it('should emit initialize event with form data', async () => {
    const wrapper = mount(InitDialog, {
      props: { visible: true }
    });
    
    await wrapper.find('input#title').setValue('My Project Goal');
    await wrapper.find('textarea#description').setValue('This is the main goal for my project');
    await wrapper.find('form').trigger('submit');
    
    expect(wrapper.emitted('initialize')).toBeTruthy();
    expect(wrapper.emitted('initialize')![0]).toEqual([{
      title: 'My Project Goal',
      description: 'This is the main goal for my project',
      statusNote: undefined
    }]);
  });

  it('should not emit if required fields are empty', async () => {
    const wrapper = mount(InitDialog, {
      props: { visible: true }
    });
    
    await wrapper.find('form').trigger('submit');
    
    expect(wrapper.emitted('initialize')).toBeFalsy();
  });

  it('should emit cancel event when cancel button clicked', async () => {
    const wrapper = mount(InitDialog, {
      props: { visible: true }
    });
    
    await wrapper.find('[data-testid="cancel-button"]').trigger('click');
    
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('should emit cancel when overlay clicked', async () => {
    const wrapper = mount(InitDialog, {
      props: { visible: true }
    });
    
    await wrapper.find('.dialog-overlay').trigger('click');
    
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('should not emit cancel when dialog content clicked', async () => {
    const wrapper = mount(InitDialog, {
      props: { visible: true }
    });
    
    await wrapper.find('.dialog-content').trigger('click');
    
    expect(wrapper.emitted('cancel')).toBeFalsy();
  });

  it('should show loading state', () => {
    const wrapper = mount(InitDialog, {
      props: { visible: true, loading: true }
    });
    
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('button[type="submit"]').text()).toContain('Initializing...');
  });

  it('should display error message', () => {
    const errorMessage = 'Failed to initialize';
    const wrapper = mount(InitDialog, {
      props: { visible: true, error: errorMessage }
    });
    
    expect(wrapper.find('.error').exists()).toBe(true);
    expect(wrapper.find('.error').text()).toBe(errorMessage);
  });

  it('should clear form when reset', async () => {
    const wrapper = mount(InitDialog, {
      props: { visible: true }
    });
    
    await wrapper.find('input').setValue('Test Title');
    await wrapper.find('textarea').setValue('Test Description');
    
    await wrapper.vm.$nextTick();
    wrapper.vm.resetForm();
    await wrapper.vm.$nextTick();
    
    expect(wrapper.find('input').element.value).toBe('');
    expect(wrapper.find('textarea').element.value).toBe('');
  });
});