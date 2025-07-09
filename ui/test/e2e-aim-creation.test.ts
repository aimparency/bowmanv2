import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Mock the API client for testing
class MockBowmanAPI {
  private testDir: string

  constructor(testDir: string) {
    this.testDir = testDir
  }

  async createAim(aim: any) {
    const aimId = {
      repoLink: null,
      id: `aim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    
    const fullAim = {
      id: aimId,
      title: aim.title,
      description: aim.description,
      status: 'not_reached',
      assignees: aim.assignees || [],
      tags: aim.tags || [],
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      targetDate: aim.targetDate,
      metadata: aim.metadata || {}
    }

    // Write to filesystem like the real server would
    const aimPath = join(this.testDir, '.quiver', 'aims', `${aimId.id}.json`)
    await fs.writeFile(aimPath, JSON.stringify(fullAim, null, 2))
    
    return { success: true, aimId }
  }

  async getAim(aimId: string) {
    const aimPath = join(this.testDir, '.quiver', 'aims', `${aimId}.json`)
    const content = await fs.readFile(aimPath, 'utf-8')
    return JSON.parse(content)
  }

  async getAllAims() {
    const aimsDir = join(this.testDir, '.quiver', 'aims')
    const files = await fs.readdir(aimsDir)
    const aims = []
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(join(aimsDir, file), 'utf-8')
        aims.push(JSON.parse(content))
      }
    }
    
    return aims
  }

  async initializeRepository(path: string, rootAim: any) {
    // Create .quiver directory structure
    const quiverDir = join(path, '.quiver')
    await fs.mkdir(quiverDir, { recursive: true })
    await fs.mkdir(join(quiverDir, 'aims'), { recursive: true })
    await fs.mkdir(join(quiverDir, 'contributions'), { recursive: true })
    
    // Create root aim
    const rootAimId = {
      repoLink: null,
      id: 'root-aim'
    }
    
    const fullRootAim = {
      id: rootAimId,
      title: rootAim.title,
      description: rootAim.description,
      status: 'not_reached',
      assignees: rootAim.assignees || [],
      tags: rootAim.tags || [],
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      targetDate: rootAim.targetDate,
      metadata: rootAim.metadata || {}
    }
    
    await fs.writeFile(
      join(quiverDir, 'aims', `${rootAimId.id}.json`),
      JSON.stringify(fullRootAim, null, 2)
    )
    
    // Create meta.json
    const meta = {
      version: '1.0.0',
      rootAimId: rootAimId,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      repository: {
        name: 'test-repo',
        url: ''
      }
    }
    
    await fs.writeFile(
      join(quiverDir, 'meta.json'),
      JSON.stringify(meta, null, 2)
    )
    
    return { success: true, path, rootAimId }
  }
}

describe('End-to-End Aim Creation', () => {
  let testDir: string
  let api: MockBowmanAPI

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `bowman-test-${Date.now()}`)
    await fs.mkdir(testDir, { recursive: true })
    
    api = new MockBowmanAPI(testDir)
    
    // Initialize repository
    await api.initializeRepository(testDir, {
      title: 'Test Root Aim',
      description: 'This is a test root aim',
      effort: 5
    })
  })

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('should create an aim and persist it to the filesystem', async () => {
    // Create an aim using the API
    const aimData = {
      title: 'Test Aim',
      description: 'This is a test aim created via UI',
      effort: 3,
      tags: ['test', 'ui'],
      assignees: ['user@example.com'],
      metadata: {
        effort: 3,
        position: { x: 100, y: 200 }
      }
    }

    const result = await api.createAim(aimData)
    
    // Verify the API returned success
    expect(result.success).toBe(true)
    expect(result.aimId).toBeDefined()
    expect(result.aimId.id).toMatch(/^aim-/)
    
    // Verify the aim was written to filesystem
    const aimPath = join(testDir, '.quiver', 'aims', `${result.aimId.id}.json`)
    const exists = await fs.access(aimPath).then(() => true).catch(() => false)
    expect(exists).toBe(true)
    
    // Verify the aim content
    const savedAim = await api.getAim(result.aimId.id)
    expect(savedAim.title).toBe(aimData.title)
    expect(savedAim.description).toBe(aimData.description)
    expect(savedAim.status).toBe('not_reached')
    expect(savedAim.tags).toEqual(aimData.tags)
    expect(savedAim.assignees).toEqual(aimData.assignees)
    expect(savedAim.metadata.effort).toBe(aimData.effort)
    expect(savedAim.metadata.position).toEqual(aimData.metadata.position)
    
    // Verify timestamps
    expect(savedAim.created).toBeDefined()
    expect(savedAim.lastModified).toBeDefined()
    expect(new Date(savedAim.created)).toBeInstanceOf(Date)
    expect(new Date(savedAim.lastModified)).toBeInstanceOf(Date)
  })

  it('should retrieve all aims from filesystem', async () => {
    // Create multiple aims
    const aims = [
      { title: 'First Aim', description: 'First test aim', effort: 1 },
      { title: 'Second Aim', description: 'Second test aim', effort: 2 },
      { title: 'Third Aim', description: 'Third test aim', effort: 3 }
    ]

    const createdAims = []
    for (const aimData of aims) {
      const result = await api.createAim(aimData)
      createdAims.push(result.aimId)
    }

    // Retrieve all aims
    const allAims = await api.getAllAims()
    
    // Should include root aim + 3 created aims
    expect(allAims).toHaveLength(4)
    
    // Verify each created aim is present
    const titles = allAims.map(aim => aim.title)
    expect(titles).toContain('Test Root Aim')
    expect(titles).toContain('First Aim')
    expect(titles).toContain('Second Aim')
    expect(titles).toContain('Third Aim')
  })

  it('should maintain proper .quiver directory structure', async () => {
    // Create an aim
    await api.createAim({
      title: 'Structure Test Aim',
      description: 'Testing directory structure',
      effort: 2
    })

    // Verify directory structure exists
    const quiverDir = join(testDir, '.quiver')
    const aimsDir = join(quiverDir, 'aims')
    const contributionsDir = join(quiverDir, 'contributions')
    const metaFile = join(quiverDir, 'meta.json')

    const dirExists = await fs.access(quiverDir).then(() => true).catch(() => false)
    expect(dirExists).toBe(true)

    const aimsDirExists = await fs.access(aimsDir).then(() => true).catch(() => false)
    expect(aimsDirExists).toBe(true)

    const contributionsDirExists = await fs.access(contributionsDir).then(() => true).catch(() => false)
    expect(contributionsDirExists).toBe(true)

    const metaExists = await fs.access(metaFile).then(() => true).catch(() => false)
    expect(metaExists).toBe(true)

    // Verify meta.json content
    const metaContent = await fs.readFile(metaFile, 'utf-8')
    const meta = JSON.parse(metaContent)
    expect(meta.version).toBe('1.0.0')
    expect(meta.rootAimId).toBeDefined()
    expect(meta.rootAimId.id).toBe('root-aim')
    expect(meta.repository.name).toBe('test-repo')
  })

  it('should handle aim creation with minimal data', async () => {
    // Create aim with only required fields
    const minimalAim = {
      title: 'Minimal Aim',
      description: 'Just title and description'
    }

    const result = await api.createAim(minimalAim)
    
    expect(result.success).toBe(true)
    
    const savedAim = await api.getAim(result.aimId.id)
    expect(savedAim.title).toBe(minimalAim.title)
    expect(savedAim.description).toBe(minimalAim.description)
    expect(savedAim.status).toBe('not_reached')
    expect(savedAim.assignees).toEqual([])
    expect(savedAim.tags).toEqual([])
    expect(savedAim.metadata).toEqual({})
  })
})