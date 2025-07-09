import { defineStore } from 'pinia'

interface AimId {
  repoLink: string | null;
  id: string;
}

interface Aim {
  id: AimId;
  title: string;
  description: string;
  status: 'not_reached' | 'reached';
  statusNote?: string;
  assignees: string[];
  tags: string[];
  created: string;
  lastModified: string;
  targetDate?: string;
  metadata?: {
    effort?: number;
    position?: { x: number; y: number };
  };
}

interface Contribution {
  fromAim: AimId;
  toAim: AimId;
  explanation: string;
  type: 'prerequisite' | 'enables' | 'supports' | 'related';
  strength: number;
  created: string;
  metadata?: Record<string, any>;
}

interface ContributionReference {
  targetAim: AimId;
  title: string;
}

interface Meta {
  version: string;
  rootAimId: AimId;
  created: string;
  lastModified: string;
  repository: {
    name: string;
    url: string;
  };
}

export class BowmanAPI {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    
    return data;
  }

  async setRepository(path: string): Promise<{ success: boolean; path: string; initialized?: boolean }> {
    return this.request('/api/repo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
  }

  async getCurrentRepo(): Promise<{ path: string | null }> {
    return this.request('/api/repo');
  }

  async getMeta(): Promise<Meta> {
    return this.request('/api/meta');
  }

  async getAim(aimId: string): Promise<Aim> {
    return this.request(`/api/aims/${aimId}`);
  }

  async getAllAims(): Promise<Aim[]> {
    return this.request('/api/aims');
  }

  async getAimContributions(aimId: string, direction: 'from' | 'to'): Promise<Contribution[] | ContributionReference[]> {
    return this.request(`/api/aims/${aimId}/contributions/${direction}`);
  }

  async initializeRepository(path: string, rootAim: {
    title: string;
    description: string;
    statusNote?: string;
    assignees?: string[];
    tags?: string[];
    targetDate?: string;
    effort?: number;
    repositoryUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; path: string; rootAimId: AimId }> {
    return this.request('/api/repo/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, rootAim })
    });
  }

  async getAllTags(): Promise<{ name: string; count: number }[]> {
    return this.request('/api/tags');
  }

  async searchAims(filters: {
    text?: string;
    tags?: string[];
    limit?: number;
  }): Promise<Aim[]> {
    return this.request('/api/aims/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters)
    });
  }

  async createAim(aim: {
    title: string;
    description: string;
    statusNote?: string;
    assignees?: string[];
    tags?: string[];
    targetDate?: string;
    effort?: number;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; aimId: AimId }> {
    return this.request('/api/aims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aim)
    });
  }

  async updateAim(aimId: string, updates: Partial<Aim>): Promise<{ success: boolean }> {
    return this.request(`/api/aims/${aimId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  }

  async createContribution(contribution: {
    fromAim: AimId;
    toAim: AimId;
    explanation: string;
    type: 'prerequisite' | 'enables' | 'supports' | 'related';
    strength: number;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean }> {
    return this.request('/api/contributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contribution)
    });
  }
}

export const useApiConnection = defineStore('api-connection', {
  state() {
    return {
      api: new BowmanAPI('http://localhost:8307'),
      connected: false,
      currentRepo: null as string | null,
      error: null as string | null,
    }
  },
  actions: {
    async connect() {
      try {
        const repo = await this.api.getCurrentRepo();
        this.currentRepo = repo.path;
        this.connected = true;
        this.error = null;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Connection failed';
        this.connected = false;
      }
    },
    
    async setRepository(path: string) {
      try {
        const result = await this.api.setRepository(path);
        this.currentRepo = result.path;
        this.error = null;
        return result;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to set repository';
        throw error;
      }
    },

    getAPI() {
      return this.api;
    }
  }
})

export type { Aim, AimId, Contribution, ContributionReference, Meta };