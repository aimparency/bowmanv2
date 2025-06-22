import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { app, resetCurrentRepo } from './app.js';

const TEST_REPO = join(process.cwd(), 'test-repo');
const QUIVER_DIR = join(TEST_REPO, '.quiver');

describe('Bowman Server', () => {
  beforeEach(() => {
    // Reset app state
    resetCurrentRepo();
    
    // Create test repository structure
    mkdirSync(QUIVER_DIR, { recursive: true });
    mkdirSync(join(QUIVER_DIR, 'aims'), { recursive: true });
    mkdirSync(join(QUIVER_DIR, 'contributions'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test repository
    rmSync(TEST_REPO, { recursive: true, force: true });
  });

  describe('POST /api/repo', () => {
    it('should reject if no path provided', async () => {
      const res = await request(app)
        .post('/api/repo')
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Path is required');
    });

    it('should suggest initialization if .quiver directory does not exist', async () => {
      rmSync(QUIVER_DIR, { recursive: true });
      
      const res = await request(app)
        .post('/api/repo')
        .send({ path: TEST_REPO });
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No .quiver directory found in the specified path');
      expect(res.body.requiresInitialization).toBe(true);
    });

    it('should set repository if .quiver exists', async () => {
      const res = await request(app)
        .post('/api/repo')
        .send({ path: TEST_REPO });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.path).toBe(TEST_REPO);
    });

    it('should auto-initialize when autoInit flag is provided', async () => {
      rmSync(QUIVER_DIR, { recursive: true });
      
      const res = await request(app)
        .post('/api/repo')
        .send({ 
          path: TEST_REPO,
          autoInit: true,
          rootAim: {
            title: 'Auto-created Goal',
            description: 'Automatically created root aim'
          }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.initialized).toBe(true);
      
      // Verify .quiver was created
      expect(existsSync(QUIVER_DIR)).toBe(true);
      expect(existsSync(join(QUIVER_DIR, 'meta.json'))).toBe(true);
    });
  });

  describe('GET /api/repo', () => {
    it('should return null when no repo is selected', async () => {
      const res = await request(app).get('/api/repo');
      
      expect(res.status).toBe(200);
      expect(res.body.path).toBe(null);
    });

    it('should return current repo path after selection', async () => {
      await request(app).post('/api/repo').send({ path: TEST_REPO });
      
      const res = await request(app).get('/api/repo');
      expect(res.status).toBe(200);
      expect(res.body.path).toBe(TEST_REPO);
    });
  });

  describe('GET /api/meta', () => {
    const metaData = {
      version: '1.0.0',
      rootAimId: { repoLink: null, id: 'aim_001' },
      created: '2025-06-22T10:30:00Z',
      lastModified: '2025-06-22T12:45:00Z',
      repository: {
        name: 'test-project',
        url: 'https://github.com/user/test-project'
      }
    };

    beforeEach(() => {
      writeFileSync(
        join(QUIVER_DIR, 'meta.json'),
        JSON.stringify(metaData, null, 2)
      );
    });

    it('should reject if no repository selected', async () => {
      const res = await request(app).get('/api/meta');
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No repository selected');
    });

    it('should return meta data when repo is selected', async () => {
      await request(app).post('/api/repo').send({ path: TEST_REPO });
      
      const res = await request(app).get('/api/meta');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(metaData);
    });

    it('should return 404 if meta file does not exist', async () => {
      rmSync(join(QUIVER_DIR, 'meta.json'));
      await request(app).post('/api/repo').send({ path: TEST_REPO });
      
      const res = await request(app).get('/api/meta');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Meta file not found');
    });
  });

  describe('GET /api/aims/:aimId', () => {
    const aimData = {
      id: { repoLink: null, id: 'aim_001' },
      title: 'Test Aim',
      description: 'A test aim',
      category: 'feature',
      status: 'open',
      priority: 'high',
      assignees: ['alice'],
      created: '2025-06-22T10:30:00Z',
      lastModified: '2025-06-22T12:45:00Z'
    };

    beforeEach(() => {
      writeFileSync(
        join(QUIVER_DIR, 'aims', 'aim_001.json'),
        JSON.stringify(aimData, null, 2)
      );
    });

    it('should reject if no repository selected', async () => {
      const res = await request(app).get('/api/aims/aim_001');
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No repository selected');
    });

    it('should return aim data when found', async () => {
      await request(app).post('/api/repo').send({ path: TEST_REPO });
      
      const res = await request(app).get('/api/aims/aim_001');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(aimData);
    });

    it('should return 404 if aim not found', async () => {
      await request(app).post('/api/repo').send({ path: TEST_REPO });
      
      const res = await request(app).get('/api/aims/aim_999');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Aim not found');
    });
  });

  describe('GET /api/aims', () => {
    const aim1 = {
      id: { repoLink: null, id: 'aim_001' },
      title: 'First Aim',
      status: 'open'
    };
    
    const aim2 = {
      id: { repoLink: null, id: 'aim_002' },
      title: 'Second Aim',
      status: 'reached'
    };

    beforeEach(() => {
      writeFileSync(
        join(QUIVER_DIR, 'aims', 'aim_001.json'),
        JSON.stringify(aim1, null, 2)
      );
      writeFileSync(
        join(QUIVER_DIR, 'aims', 'aim_002.json'),
        JSON.stringify(aim2, null, 2)
      );
    });

    it('should return all aims', async () => {
      await request(app).post('/api/repo').send({ path: TEST_REPO });
      
      const res = await request(app).get('/api/aims');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body).toContainEqual(aim1);
      expect(res.body).toContainEqual(aim2);
    });
  });

  describe('GET /api/aims/:aimId/contributions/from', () => {
    const contribution = {
      fromAim: { repoLink: null, id: 'aim_002' },
      toAim: { repoLink: null, id: 'aim_001' },
      explanation: 'Enables the first aim',
      type: 'enables',
      strength: 0.8,
      created: '2025-06-22T11:00:00Z'
    };

    beforeEach(() => {
      const contribPath = join(QUIVER_DIR, 'contributions', 'aim_001', 'from');
      mkdirSync(contribPath, { recursive: true });
      writeFileSync(
        join(contribPath, 'aim_002.json'),
        JSON.stringify(contribution, null, 2)
      );
    });

    it('should return incoming contributions', async () => {
      await request(app).post('/api/repo').send({ path: TEST_REPO });
      
      const res = await request(app).get('/api/aims/aim_001/contributions/from');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toEqual(contribution);
    });

    it('should return empty array if no contributions exist', async () => {
      await request(app).post('/api/repo').send({ path: TEST_REPO });
      
      const res = await request(app).get('/api/aims/aim_999/contributions/from');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/aims/:aimId/contributions/to', () => {
    const reference = {
      targetAim: { repoLink: null, id: 'aim_003' },
      title: 'Target Aim Title'
    };

    beforeEach(() => {
      const contribPath = join(QUIVER_DIR, 'contributions', 'aim_001', 'to');
      mkdirSync(contribPath, { recursive: true });
      writeFileSync(
        join(contribPath, 'aim_003.json'),
        JSON.stringify(reference, null, 2)
      );
    });

    it('should return outgoing contribution references', async () => {
      await request(app).post('/api/repo').send({ path: TEST_REPO });
      
      const res = await request(app).get('/api/aims/aim_001/contributions/to');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toEqual(reference);
    });
  });

  describe('POST /api/repo/init', () => {
    it('should initialize a new .quiver directory', async () => {
      // Remove the .quiver directory first
      rmSync(QUIVER_DIR, { recursive: true });
      
      const res = await request(app)
        .post('/api/repo/init')
        .send({ 
          path: TEST_REPO,
          rootAim: {
            title: 'New Project Goal',
            description: 'Main goal for this project'
          }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Verify directory structure was created
      expect(existsSync(QUIVER_DIR)).toBe(true);
      expect(existsSync(join(QUIVER_DIR, 'aims'))).toBe(true);
      expect(existsSync(join(QUIVER_DIR, 'contributions'))).toBe(true);
      expect(existsSync(join(QUIVER_DIR, 'meta.json'))).toBe(true);
    });

    it('should create root aim when initializing', async () => {
      rmSync(QUIVER_DIR, { recursive: true });
      
      await request(app)
        .post('/api/repo/init')
        .send({ 
          path: TEST_REPO,
          rootAim: {
            title: 'New Project Goal',
            description: 'Main goal for this project'
          }
        });
      
      // Read the created meta file
      const metaContent = readFileSync(join(QUIVER_DIR, 'meta.json'), 'utf-8');
      const meta = JSON.parse(metaContent);
      
      expect(meta.rootAimId).toBeDefined();
      expect(meta.rootAimId.repoLink).toBe(null);
      
      // Verify root aim was created
      const rootAimPath = join(QUIVER_DIR, 'aims', `${meta.rootAimId.id}.json`);
      expect(existsSync(rootAimPath)).toBe(true);
      
      const rootAimContent = readFileSync(rootAimPath, 'utf-8');
      const rootAim = JSON.parse(rootAimContent);
      expect(rootAim.title).toBe('New Project Goal');
      expect(rootAim.description).toBe('Main goal for this project');
    });

    it('should reject if .quiver already exists', async () => {
      const res = await request(app)
        .post('/api/repo/init')
        .send({ 
          path: TEST_REPO,
          rootAim: {
            title: 'Another Goal',
            description: 'Should fail'
          }
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('.quiver directory already exists');
    });

    it('should reject if no path provided', async () => {
      const res = await request(app)
        .post('/api/repo/init')
        .send({ 
          rootAim: {
            title: 'Some Goal',
            description: 'No path'
          }
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Path is required');
    });

    it('should reject if no root aim provided', async () => {
      rmSync(QUIVER_DIR, { recursive: true });
      
      const res = await request(app)
        .post('/api/repo/init')
        .send({ path: TEST_REPO });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Root aim title and description are required');
    });
  });
});