import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import App from './App.vue';
import RepoSelector from './components/RepoSelector.vue';

// Create mock API instance
const mockAPI = {
  setRepository: vi.fn(),
  getMeta: vi.fn(),
  getAim: vi.fn(),
  getAimContributions: vi.fn()
};

// Mock the API module
vi.mock('./services/api', () => ({
  BowmanAPI: vi.fn(() => mockAPI)
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show repository selector initially', () => {
    const wrapper = mount(App);
    expect(wrapper.findComponent(RepoSelector).exists()).toBe(true);
    expect(wrapper.find('.aim-graph').exists()).toBe(false);
  });

  it('should handle repository selection', async () => {
    mockAPI.setRepository.mockResolvedValue({ success: true, path: '/test/repo' });
    mockAPI.getMeta.mockResolvedValue({
      rootAimId: { repoLink: null, id: 'aim_001' }
    });
    mockAPI.getAim.mockResolvedValue({
      id: { repoLink: null, id: 'aim_001' },
      title: 'Root Aim',
      status: 'open'
    });
    mockAPI.getAimContributions.mockResolvedValue([]);

    const wrapper = mount(App);
    const selector = wrapper.findComponent(RepoSelector);
    
    await selector.vm.$emit('repo-selected', '/test/repo');
    await nextTick();

    expect(mockAPI.setRepository).toHaveBeenCalledWith('/test/repo');
    expect(mockAPI.getMeta).toHaveBeenCalled();
  });

  it('should show error when repository selection fails', async () => {
    mockAPI.setRepository.mockRejectedValue(new Error('Repository not found'));

    const wrapper = mount(App);
    const selector = wrapper.findComponent(RepoSelector);
    
    await selector.vm.$emit('repo-selected', '/bad/repo');
    await nextTick();

    expect(wrapper.find('.error').exists()).toBe(true);
  });

  it('should progressively load aims', async () => {
    mockAPI.setRepository.mockResolvedValue({ success: true, path: '/test/repo' });
    mockAPI.getMeta.mockResolvedValue({
      rootAimId: { repoLink: null, id: 'aim_001' }
    });
    
    const rootAim = {
      id: { repoLink: null, id: 'aim_001' },
      title: 'Root Aim',
      status: 'open'
    };
    
    const contribution = {
      fromAim: { repoLink: null, id: 'aim_002' },
      toAim: { repoLink: null, id: 'aim_001' },
      explanation: 'Contributes to root'
    };
    
    const childAim = {
      id: { repoLink: null, id: 'aim_002' },
      title: 'Child Aim',
      status: 'open'
    };

    mockAPI.getAim
      .mockResolvedValueOnce(rootAim)
      .mockResolvedValueOnce(childAim);
    
    mockAPI.getAimContributions
      .mockResolvedValueOnce([contribution])  // incoming for aim_001
      .mockResolvedValueOnce([])              // outgoing for aim_001
      .mockResolvedValueOnce([])              // incoming for aim_002
      .mockResolvedValueOnce([{ targetAim: { repoLink: null, id: 'aim_001' }, title: 'Root Aim' }]); // outgoing for aim_002

    const wrapper = mount(App);
    await wrapper.findComponent(RepoSelector).vm.$emit('repo-selected', '/test/repo');
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));
    await nextTick();

    expect(mockAPI.getAim).toHaveBeenCalledTimes(2);
    expect(mockAPI.getAimContributions).toHaveBeenCalledTimes(4);
  });
});