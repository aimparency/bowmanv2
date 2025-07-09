export interface AimId {
  repoLink: string | null;
  id: string;
}

export interface Aim {
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

export interface Contribution {
  fromAim: AimId;
  toAim: AimId;
  explanation: string;
  type: 'prerequisite' | 'enables' | 'supports' | 'related';
  strength: number;
  created: string;
  metadata?: Record<string, any>;
}

export interface ContributionReference {
  targetAim: AimId;
  title: string;
}

export interface Meta {
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
}