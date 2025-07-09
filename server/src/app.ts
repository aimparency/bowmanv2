import express from 'express';
import cors from 'cors';
import { join, normalize, resolve } from 'path';
import fs from 'fs/promises';
import { existsSync, Stats } from 'fs';

// Types for error handling
interface BowmanError extends Error {
  statusCode: number;
  code: string;
}

class BowmanError extends Error {
  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'BowmanError';
  }
}

// Input validation utilities
function validatePath(path: string): string {
  if (!path || typeof path !== 'string') {
    throw new BowmanError('Path must be a non-empty string', 400, 'INVALID_PATH');
  }
  
  const normalizedPath = normalize(resolve(path));
  
  // Basic security: ensure path doesn't contain problematic patterns
  if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
    throw new BowmanError('Path contains invalid characters', 400, 'INVALID_PATH');
  }
  
  return normalizedPath;
}

function validateAimId(aimId: string): string {
  if (!aimId || typeof aimId !== 'string') {
    throw new BowmanError('Aim ID must be a non-empty string', 400, 'INVALID_AIM_ID');
  }
  
  // Basic validation: alphanumeric, underscore, dash only
  if (!/^[a-zA-Z0-9_-]+$/.test(aimId)) {
    throw new BowmanError('Aim ID contains invalid characters', 400, 'INVALID_AIM_ID');
  }
  
  return aimId;
}

function validateRootAim(rootAim: any): void {
  if (!rootAim || typeof rootAim !== 'object') {
    throw new BowmanError('Root aim must be an object', 400, 'INVALID_ROOT_AIM');
  }
  
  if (!rootAim.title || typeof rootAim.title !== 'string' || rootAim.title.trim().length === 0) {
    throw new BowmanError('Root aim title is required', 400, 'INVALID_ROOT_AIM');
  }
  
  if (!rootAim.description || typeof rootAim.description !== 'string' || rootAim.description.trim().length === 0) {
    throw new BowmanError('Root aim description is required', 400, 'INVALID_ROOT_AIM');
  }
  
  if (rootAim.title.length > 200) {
    throw new BowmanError('Root aim title too long (max 200 characters)', 400, 'INVALID_ROOT_AIM');
  }
  
  if (rootAim.description.length > 5000) {
    throw new BowmanError('Root aim description too long (max 5000 characters)', 400, 'INVALID_ROOT_AIM');
  }
}

// Async wrapper for better error handling
const asyncHandler = (fn: Function) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Error handling middleware
function errorHandler(err: Error, req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (err instanceof BowmanError) {
    res.status(err.statusCode).json({ 
      error: err.message, 
      code: err.code 
    });
    return;
  }
  
  // Handle specific Node.js errors
  if (err.name === 'SyntaxError' && 'body' in err) {
    res.status(400).json({ 
      error: 'Invalid JSON in request body', 
      code: 'INVALID_JSON' 
    });
    return;
  }
  
  // Generic error fallback
  res.status(500).json({ 
    error: 'Internal server error', 
    code: 'INTERNAL_ERROR' 
  });
}

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
app.post('/api/repo', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { path, autoInit, rootAim } = req.body;
  
  const validatedPath = validatePath(path);
  const quiverPath = join(validatedPath, '.quiver');
  
  // Check if path exists and is accessible
  try {
    const stats = await fs.stat(validatedPath);
    if (!stats.isDirectory()) {
      throw new BowmanError('Path must be a directory', 400, 'INVALID_PATH');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new BowmanError('Path does not exist', 404, 'PATH_NOT_FOUND');
    }
    throw new BowmanError('Failed to access path', 500, 'ACCESS_ERROR');
  }
  
  if (!existsSync(quiverPath)) {
    if (autoInit && rootAim) {
      validateRootAim(rootAim);
      await initializeQuiverDirectory(validatedPath, rootAim);
      currentRepo = validatedPath;
      return res.json({ 
        success: true, 
        path: currentRepo,
        initialized: true 
      });
    }
    
    throw new BowmanError(
      'No .quiver directory found in the specified path',
      404,
      'QUIVER_NOT_FOUND'
    );
  }
  
  currentRepo = validatedPath;
  res.json({ success: true, path: currentRepo });
}));

// Get current repository
app.get('/api/repo', (req, res) => {
  res.json({ path: currentRepo });
});

// Get meta information
app.get('/api/meta', asyncHandler(async (req: express.Request, res: express.Response) => {
  if (!currentRepo) {
    throw new BowmanError('No repository selected', 400, 'NO_REPO_SELECTED');
  }

  const metaPath = join(currentRepo, '.quiver', 'meta.json');
  
  try {
    const metaContent = await fs.readFile(metaPath, 'utf-8');
    const meta = JSON.parse(metaContent);
    res.json(meta);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new BowmanError('Meta file not found', 404, 'META_NOT_FOUND');
    }
    if (error instanceof SyntaxError) {
      throw new BowmanError('Invalid meta data format', 500, 'INVALID_META_DATA');
    }
    throw new BowmanError('Failed to read meta data', 500, 'READ_ERROR');
  }
}));

// Get a specific aim
app.get('/api/aims/:aimId', asyncHandler(async (req: express.Request, res: express.Response) => {
  if (!currentRepo) {
    throw new BowmanError('No repository selected', 400, 'NO_REPO_SELECTED');
  }

  const aimId = validateAimId(req.params.aimId);
  const aimPath = join(currentRepo, '.quiver', 'aims', `${aimId}.json`);
  
  try {
    const aimContent = await fs.readFile(aimPath, 'utf-8');
    const aim = JSON.parse(aimContent);
    res.json(aim);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new BowmanError('Aim not found', 404, 'AIM_NOT_FOUND');
    }
    if (error instanceof SyntaxError) {
      throw new BowmanError('Invalid aim data format', 500, 'INVALID_AIM_DATA');
    }
    throw new BowmanError('Failed to read aim', 500, 'READ_ERROR');
  }
}));

// Get all aims
app.get('/api/aims', asyncHandler(async (req: express.Request, res: express.Response) => {
  if (!currentRepo) {
    throw new BowmanError('No repository selected', 400, 'NO_REPO_SELECTED');
  }

  const aimsPath = join(currentRepo, '.quiver', 'aims');
  const files = await fs.readdir(aimsPath);
  const aims = await Promise.all(
    files.filter(f => f.endsWith('.json')).map(async file => {
      const content = await fs.readFile(join(aimsPath, file), 'utf-8');
      return JSON.parse(content);
    })
  );
  res.json(aims);
}));

// Get incoming contributions for an aim
app.get('/api/aims/:aimId/contributions/from', asyncHandler(async (req: express.Request, res: express.Response) => {
  if (!currentRepo) {
    throw new BowmanError('No repository selected', 400, 'NO_REPO_SELECTED');
  }

  const aimId = validateAimId(req.params.aimId);
  const fromPath = join(currentRepo, '.quiver', 'contributions', aimId, 'from');
  
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
}));

// Get outgoing contribution references for an aim
app.get('/api/aims/:aimId/contributions/to', asyncHandler(async (req: express.Request, res: express.Response) => {
  if (!currentRepo) {
    throw new BowmanError('No repository selected', 400, 'NO_REPO_SELECTED');
  }

  const aimId = validateAimId(req.params.aimId);
  const toPath = join(currentRepo, '.quiver', 'contributions', aimId, 'to');
  
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
}));

// Shared initialization logic
async function initializeQuiverDirectory(path: string, rootAim: any) {
  const quiverPath = join(path, '.quiver');
  
  // Check if .quiver already exists
  if (existsSync(quiverPath)) {
    throw new BowmanError('.quiver directory already exists', 400, 'QUIVER_EXISTS');
  }

  try {
    // Create directory structure
    await fs.mkdir(join(quiverPath, 'aims'), { recursive: true });
    await fs.mkdir(join(quiverPath, 'contributions'), { recursive: true });

    // Generate root aim ID
    const rootAimId = `aim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Create root aim
    const rootAimData: Aim = {
      id: { repoLink: null, id: rootAimId },
      title: rootAim.title.trim(),
      description: rootAim.description.trim(),
      status: 'not_reached',
      statusNote: rootAim.statusNote?.trim() || '',
      assignees: Array.isArray(rootAim.assignees) ? rootAim.assignees : [],
      tags: Array.isArray(rootAim.tags) ? rootAim.tags : [],
      created: now,
      lastModified: now,
      targetDate: rootAim.targetDate,
      metadata: {
        position: { x: 400, y: 200 },
        effort: typeof rootAim.effort === 'number' ? rootAim.effort : undefined,
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
  } catch (error) {
    // Clean up on failure
    if (existsSync(quiverPath)) {
      await fs.rm(quiverPath, { recursive: true, force: true });
    }
    throw new BowmanError('Failed to initialize .quiver directory', 500, 'INIT_ERROR');
  }
}

// Initialize a new .quiver directory
app.post('/api/repo/init', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { path, rootAim } = req.body;
  
  const validatedPath = validatePath(path);
  validateRootAim(rootAim);

  const result = await initializeQuiverDirectory(validatedPath, rootAim);
  res.json({ 
    success: true, 
    path: validatedPath,
    rootAimId: result.rootAimId
  });
}));

// Get all tags with usage counts
app.get('/api/tags', asyncHandler(async (req: express.Request, res: express.Response) => {
  if (!currentRepo) {
    throw new BowmanError('No repository selected', 400, 'NO_REPO_SELECTED');
  }

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
}));

// Search aims with fuzzy text and tag filtering
app.post('/api/aims/search', asyncHandler(async (req: express.Request, res: express.Response) => {
  if (!currentRepo) {
    throw new BowmanError('No repository selected', 400, 'NO_REPO_SELECTED');
  }

  const { text, tags, limit = 20 } = req.body;

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
      return tags.some((tag: string) => aim.tags.includes(tag));
    });
  }

  // Filter by text if provided (simple contains for now, could be enhanced with Fuse.js)
  if (text && text.trim()) {
    const searchText = text.toLowerCase();
    filtered = filtered.filter(aim => 
      aim.title.toLowerCase().includes(searchText) ||
      aim.description.toLowerCase().includes(searchText) ||
      (aim.statusNote && aim.statusNote.toLowerCase().includes(searchText)) ||
      (aim.tags && aim.tags.some((tag: string) => tag.toLowerCase().includes(searchText)))
    );
  }

  // Limit results
  const result = filtered.slice(0, limit);
  
  res.json(result);
}));

// Add error handling middleware
app.use(errorHandler);

// Export function to reset state for testing
export function resetCurrentRepo() {
  currentRepo = null;
}