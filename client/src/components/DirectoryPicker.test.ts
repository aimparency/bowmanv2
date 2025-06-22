import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import DirectoryPicker from './DirectoryPicker.vue';

// Mock the File System Access API
const mockDirectoryHandle = {
  kind: 'directory',
  name: 'test-project',
  queryPermission: vi.fn().mockResolvedValue('granted'),
  requestPermission: vi.fn().mockResolvedValue('granted')
};

const mockShowDirectoryPicker = vi.fn().mockResolvedValue(mockDirectoryHandle);

beforeEach(() => {
  vi.clearAllMocks();
  
  // Mock the File System Access API
  Object.defineProperty(window, 'showDirectoryPicker', {
    value: mockShowDirectoryPicker,
    writable: true
  });
  
  // Mock navigator.userAgent to simulate Chrome
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    writable: true
  });
});

describe('DirectoryPicker', () => {
  it('should show browser picker button when File System Access API is supported', () => {
    const wrapper = mount(DirectoryPicker);
    expect(wrapper.find('[data-testid="browser-picker"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="manual-input"]').exists()).toBe(true);
  });

  it('should emit directory-selected when browser picker succeeds', async () => {
    const wrapper = mount(DirectoryPicker);
    const button = wrapper.find('[data-testid="browser-picker"]');
    
    await button.trigger('click');
    
    expect(mockShowDirectoryPicker).toHaveBeenCalled();
    expect(wrapper.emitted('directory-selected')).toBeTruthy();
    expect(wrapper.emitted('directory-selected')![0]).toEqual([mockDirectoryHandle]);
  });

  it('should handle permission denied gracefully', async () => {
    mockDirectoryHandle.queryPermission.mockResolvedValue('denied');
    mockDirectoryHandle.requestPermission.mockResolvedValue('denied');
    
    const wrapper = mount(DirectoryPicker);
    const button = wrapper.find('[data-testid="browser-picker"]');
    
    await button.trigger('click');
    
    expect(wrapper.emitted('error')).toBeTruthy();
    expect(wrapper.emitted('error')![0][0]).toBe('Permission denied to access directory');
  });

  it('should handle user cancellation', async () => {
    mockShowDirectoryPicker.mockRejectedValue(new DOMException('User cancelled', 'AbortError'));
    
    const wrapper = mount(DirectoryPicker);
    const button = wrapper.find('[data-testid="browser-picker"]');
    
    await button.trigger('click');
    
    expect(wrapper.emitted('error')).toBeFalsy();
    expect(wrapper.emitted('directory-selected')).toBeFalsy();
  });

  it('should emit manual-path when manual input is used', async () => {
    const wrapper = mount(DirectoryPicker);
    const input = wrapper.find('[data-testid="manual-input"] input');
    const button = wrapper.find('[data-testid="manual-input"] button');
    
    await input.setValue('/path/to/repo');
    await button.trigger('click');
    
    expect(wrapper.emitted('manual-path')).toBeTruthy();
    expect(wrapper.emitted('manual-path')![0]).toEqual(['/path/to/repo']);
  });

  it('should show fallback message when File System Access API not supported', () => {
    // Remove the API
    delete (window as any).showDirectoryPicker;
    
    const wrapper = mount(DirectoryPicker);
    expect(wrapper.find('[data-testid="browser-picker"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('directory picker is not supported');
  });

  it('should show loading state while picking directory', async () => {
    // Make the picker take some time
    let resolvePromise: (value: any) => void;
    const slowPromise = new Promise(resolve => { resolvePromise = resolve; });
    mockShowDirectoryPicker.mockReturnValue(slowPromise);
    
    const wrapper = mount(DirectoryPicker);
    const button = wrapper.find('[data-testid="browser-picker"]');
    
    await button.trigger('click');
    
    expect(wrapper.find('[data-testid="browser-picker"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-testid="browser-picker"]').text()).toContain('Selecting...');
    
    // Resolve the promise
    resolvePromise!(mockDirectoryHandle);
    await wrapper.vm.$nextTick();
  });
});