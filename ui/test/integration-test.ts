import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, ChildProcess } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('Integration Test - UI with Real Server', () => {
  let serverProcess: ChildProcess
  let testDir: string

  beforeAll(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `bowman-integration-test-${Date.now()}`)
    await fs.mkdir(testDir, { recursive: true })

    // Start the server in the background
    serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: join(process.cwd(), '..', 'server'),
      stdio: 'pipe'
    })

    // Wait for server to start
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'))
      }, 10000)

      serverProcess.stdout?.on('data', (data) => {
        if (data.toString().includes('listening on port 8307')) {
          clearTimeout(timeout)
          resolve()
        }
      })

      serverProcess.stderr?.on('data', (data) => {
        console.error('Server stderr:', data.toString())
      })
    })
  })

  afterAll(async () => {
    // Clean up server process
    if (serverProcess) {
      serverProcess.kill()
    }
    
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('should create an aim via API and verify filesystem persistence', async () => {
    const baseURL = 'http://localhost:8307'
    
    // Initialize repository
    const initResponse = await fetch(`${baseURL}/api/repo/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: testDir,
        rootAim: {
          title: 'Integration Test Root',
          description: 'Root aim for integration test',
          effort: 5
        }
      })
    })

    expect(initResponse.ok).toBe(true)
    const initResult = await initResponse.json()
    expect(initResult.success).toBe(true)

    // Set the repository
    const setRepoResponse = await fetch(`${baseURL}/api/repo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: testDir })
    })

    expect(setRepoResponse.ok).toBe(true)

    // Create an aim
    const createAimResponse = await fetch(`${baseURL}/api/aims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Integration Test Aim',
        description: 'This aim was created via integration test',
        effort: 3,
        tags: ['integration', 'test'],
        assignees: ['tester@example.com'],
        metadata: {
          effort: 3,
          position: { x: 150, y: 250 }
        }
      })
    })

    expect(createAimResponse.ok).toBe(true)
    const createResult = await createAimResponse.json()
    expect(createResult.success).toBe(true)
    expect(createResult.aimId).toBeDefined()

    // Verify filesystem persistence
    const aimPath = join(testDir, '.quiver', 'aims', `${createResult.aimId.id}.json`)
    const aimExists = await fs.access(aimPath).then(() => true).catch(() => false)
    expect(aimExists).toBe(true)

    // Verify aim content
    const aimContent = await fs.readFile(aimPath, 'utf-8')
    const savedAim = JSON.parse(aimContent)
    expect(savedAim.title).toBe('Integration Test Aim')
    expect(savedAim.description).toBe('This aim was created via integration test')
    expect(savedAim.tags).toEqual(['integration', 'test'])
    expect(savedAim.assignees).toEqual(['tester@example.com'])
    expect(savedAim.metadata.effort).toBe(3)
    expect(savedAim.metadata.position).toEqual({ x: 150, y: 250 })

    // Retrieve via API and verify
    const getAimResponse = await fetch(`${baseURL}/api/aims/${createResult.aimId.id}`)
    expect(getAimResponse.ok).toBe(true)
    const retrievedAim = await getAimResponse.json()
    expect(retrievedAim.title).toBe('Integration Test Aim')
    expect(retrievedAim.id.id).toBe(createResult.aimId.id)
  })

  it('should retrieve all aims including root aim', async () => {
    const baseURL = 'http://localhost:8307'
    
    // Get all aims
    const allAimsResponse = await fetch(`${baseURL}/api/aims`)
    expect(allAimsResponse.ok).toBe(true)
    const allAims = await allAimsResponse.json()
    
    // Should have at least the root aim and the one we created
    expect(allAims.length).toBeGreaterThanOrEqual(2)
    
    const titles = allAims.map((aim: any) => aim.title)
    expect(titles).toContain('Integration Test Root')
    expect(titles).toContain('Integration Test Aim')
  })

  it('should maintain proper repository structure', async () => {
    // Verify directory structure
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
    expect(meta.version).toBeDefined()
    expect(meta.rootAimId).toBeDefined()
    expect(meta.repository.name).toBeDefined()
  })
})