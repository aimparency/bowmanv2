import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BowmanAPI } from './api';

// Mock fetch
global.fetch = vi.fn();

describe('BowmanAPI', () => {
  let api: BowmanAPI;

  beforeEach(() => {
    api = new BowmanAPI('http://localhost:3000');
    vi.clearAllMocks();
  });

  describe('setRepository', () => {
    it('should send POST request with path', async () => {
      const mockResponse = { success: true, path: '/test/repo' };
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.setRepository('/test/repo');

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/test/repo' })
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error if request fails', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Repository not found' })
      });

      await expect(api.setRepository('/bad/path')).rejects.toThrow('Repository not found');
    });
  });

  describe('getMeta', () => {
    it('should fetch meta information', async () => {
      const mockMeta = {
        version: '1.0.0',
        rootAimId: { repoLink: null, id: 'aim_001' }
      };
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMeta
      });

      const result = await api.getMeta();

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/meta', undefined);
      expect(result).toEqual(mockMeta);
    });
  });

  describe('getAim', () => {
    it('should fetch specific aim', async () => {
      const mockAim = {
        id: { repoLink: null, id: 'aim_001' },
        title: 'Test Aim',
        status: 'open'
      };
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAim
      });

      const result = await api.getAim('aim_001');

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/aims/aim_001', undefined);
      expect(result).toEqual(mockAim);
    });
  });

  describe('getAimContributions', () => {
    it('should fetch incoming contributions', async () => {
      const mockContributions = [{
        fromAim: { repoLink: null, id: 'aim_002' },
        toAim: { repoLink: null, id: 'aim_001' },
        explanation: 'Contributes to aim 1'
      }];
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockContributions
      });

      const result = await api.getAimContributions('aim_001', 'from');

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/aims/aim_001/contributions/from', undefined);
      expect(result).toEqual(mockContributions);
    });

    it('should fetch outgoing contribution references', async () => {
      const mockReferences = [{
        targetAim: { repoLink: null, id: 'aim_003' },
        title: 'Target Aim'
      }];
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReferences
      });

      const result = await api.getAimContributions('aim_001', 'to');

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/aims/aim_001/contributions/to', undefined);
      expect(result).toEqual(mockReferences);
    });
  });
});