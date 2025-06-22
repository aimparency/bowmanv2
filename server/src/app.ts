import express from 'express';
import cors from 'cors';
import { join } from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export const app = express();

app.use(cors());
app.use(express.json());

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

let currentRepo: string | null = null;

// Repository selection endpoint
app.post('/api/repo', async (req, res) => {
  const { path, autoInit, rootAim } = req.body;
  
  if (!path) {
    return res.status(400).json({ error: 'Path is required' });
  }

  const quiverPath = join(path, '.quiver');
  
  try {
    if (!existsSync(quiverPath)) {
      if (autoInit && rootAim) {
        // Auto-initialize the repository
        try {
          await initializeQuiverDirectory(path, rootAim);
          currentRepo = path;
          return res.json({ 
            success: true, 
            path: currentRepo,
            initialized: true 
          });
        } catch (initError) {
          return res.status(500).json({ error: 'Failed to initialize .quiver directory' });
        }
      }
      
      return res.status(404).json({ 
        error: 'No .quiver directory found in the specified path',
        requiresInitialization: true
      });
    }
    
    currentRepo = path;
    res.json({ success: true, path: currentRepo });
  } catch (error) {
    res.status(500).json({ error: 'Failed to access repository' });
  }
});

// Get current repository
app.get('/api/repo', (req, res) => {
  res.json({ path: currentRepo });
});

// Get meta information
app.get('/api/meta', async (req, res) => {
  if (!currentRepo) {
    return res.status(400).json({ error: 'No repository selected' });
  }

  try {
    const metaPath = join(currentRepo, '.quiver', 'meta.json');
    const metaContent = await fs.readFile(metaPath, 'utf-8');
    const meta = JSON.parse(metaContent);
    res.json(meta);
  } catch (error) {
    res.status(404).json({ error: 'Meta file not found' });
  }
});

// Get a specific aim
app.get('/api/aims/:aimId', async (req, res) => {
  if (!currentRepo) {
    return res.status(400).json({ error: 'No repository selected' });
  }

  try {
    const aimPath = join(currentRepo, '.quiver', 'aims', `${req.params.aimId}.json`);
    const aimContent = await fs.readFile(aimPath, 'utf-8');
    const aim = JSON.parse(aimContent);
    res.json(aim);
  } catch (error) {
    res.status(404).json({ error: 'Aim not found' });
  }
});

// Get all aims
app.get('/api/aims', async (req, res) => {
  if (!currentRepo) {
    return res.status(400).json({ error: 'No repository selected' });
  }

  try {
    const aimsPath = join(currentRepo, '.quiver', 'aims');
    const files = await fs.readdir(aimsPath);
    const aims = await Promise.all(
      files.filter(f => f.endsWith('.json')).map(async file => {
        const content = await fs.readFile(join(aimsPath, file), 'utf-8');
        return JSON.parse(content);
      })
    );
    res.json(aims);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read aims' });
  }
});

// Get incoming contributions for an aim
app.get('/api/aims/:aimId/contributions/from', async (req, res) => {
  if (!currentRepo) {
    return res.status(400).json({ error: 'No repository selected' });
  }

  try {
    const fromPath = join(currentRepo, '.quiver', 'contributions', req.params.aimId, 'from');
    
    if (!existsSync(fromPath)) {
      return res.json([]);
    }

    const files = await fs.readdir(fromPath);
    const contributions = await Promise.all(
      files.filter(f => f.endsWith('.json')).map(async file => {
        const content = await fs.readFile(join(fromPath, file), 'utf-8');
        return JSON.parse(content);
      })
    );
    res.json(contributions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read contributions' });
  }
});

// Get outgoing contribution references for an aim
app.get('/api/aims/:aimId/contributions/to', async (req, res) => {
  if (!currentRepo) {
    return res.status(400).json({ error: 'No repository selected' });
  }

  try {
    const toPath = join(currentRepo, '.quiver', 'contributions', req.params.aimId, 'to');
    
    if (!existsSync(toPath)) {
      return res.json([]);
    }

    const files = await fs.readdir(toPath);
    const references = await Promise.all(
      files.filter(f => f.endsWith('.json')).map(async file => {
        const content = await fs.readFile(join(toPath, file), 'utf-8');
        return JSON.parse(content);
      })
    );
    res.json(references);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read contribution references' });
  }
});

// Shared initialization logic
async function initializeQuiverDirectory(path: string, rootAim: any) {
  const quiverPath = join(path, '.quiver');
  
  // Check if .quiver already exists
  if (existsSync(quiverPath)) {
    throw new Error('.quiver directory already exists');
  }

  // Create directory structure
  await fs.mkdir(join(quiverPath, 'aims'), { recursive: true });
  await fs.mkdir(join(quiverPath, 'contributions'), { recursive: true });

  // Generate root aim ID
  const rootAimId = `aim_${Date.now()}`;
  const now = new Date().toISOString();

  // Create root aim
  const rootAimData: Aim = {
    id: { repoLink: null, id: rootAimId },
    title: rootAim.title,
    description: rootAim.description,
    status: 'not_reached',
    statusNote: rootAim.statusNote,
    assignees: rootAim.assignees || [],
    tags: rootAim.tags || [],
    created: now,
    lastModified: now,
    targetDate: rootAim.targetDate,
    metadata: {
      position: { x: 400, y: 200 },
      effort: rootAim.effort,
      ...rootAim.metadata
    }
  };

  // Write root aim file
  await fs.writeFile(
    join(quiverPath, 'aims', `${rootAimId}.json`),
    JSON.stringify(rootAimData, null, 2)
  );

  // Create meta file
  const metaData = {
    version: '1.0.0',
    rootAimId: { repoLink: null, id: rootAimId },
    created: now,
    lastModified: now,
    repository: {
      name: path.split('/').pop() || 'unknown',
      url: rootAim.repositoryUrl || ''
    }
  };

  await fs.writeFile(
    join(quiverPath, 'meta.json'),
    JSON.stringify(metaData, null, 2)
  );

  return { rootAimId: { repoLink: null, id: rootAimId } };
}

// Initialize a new .quiver directory
app.post('/api/repo/init', async (req, res) => {
  const { path, rootAim } = req.body;
  
  if (!path) {
    return res.status(400).json({ error: 'Path is required' });
  }

  if (!rootAim?.title || !rootAim?.description) {
    return res.status(400).json({ error: 'Root aim title and description are required' });
  }

  try {
    const result = await initializeQuiverDirectory(path, rootAim);
    res.json({ 
      success: true, 
      path,
      rootAimId: result.rootAimId
    });
  } catch (error) {
    if (error instanceof Error && error.message === '.quiver directory already exists') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to initialize .quiver directory' });
  }
});

// Get all tags with usage counts
app.get('/api/tags', async (req, res) => {
  if (!currentRepo) {
    return res.status(400).json({ error: 'No repository selected' });
  }

  try {
    const aimsPath = join(currentRepo, '.quiver', 'aims');
    const files = await fs.readdir(aimsPath);
    const tagCounts = new Map<string, number>();

    // Count tag usage across all aims
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(join(aimsPath, file), 'utf-8');
      const aim = JSON.parse(content);
      
      if (aim.tags && Array.isArray(aim.tags)) {
        for (const tag of aim.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
    }

    // Convert to array and sort by usage
    const result = Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

// Search aims with fuzzy text and tag filtering
app.post('/api/aims/search', async (req, res) => {
  if (!currentRepo) {
    return res.status(400).json({ error: 'No repository selected' });
  }

  const { text, tags, limit = 20 } = req.body;

  try {
    const aimsPath = join(currentRepo, '.quiver', 'aims');
    const files = await fs.readdir(aimsPath);
    const aims = await Promise.all(
      files.filter(f => f.endsWith('.json')).map(async file => {
        const content = await fs.readFile(join(aimsPath, file), 'utf-8');
        return JSON.parse(content);
      })
    );

    let filtered = aims;

    // Filter by tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      filtered = filtered.filter(aim => {
        if (!aim.tags || !Array.isArray(aim.tags)) return false;
        return tags.some(tag => aim.tags.includes(tag));
      });
    }

    // Filter by text if provided (simple contains for now, could be enhanced with Fuse.js)
    if (text && text.trim()) {
      const searchText = text.toLowerCase();
      filtered = filtered.filter(aim => 
        aim.title.toLowerCase().includes(searchText) ||
        aim.description.toLowerCase().includes(searchText) ||
        (aim.statusNote && aim.statusNote.toLowerCase().includes(searchText)) ||
        (aim.tags && aim.tags.some(tag => tag.toLowerCase().includes(searchText)))
      );
    }

    // Limit results
    const result = filtered.slice(0, limit);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search aims' });
  }
});

// Export function to reset state for testing
export function resetCurrentRepo() {
  currentRepo = null;
}