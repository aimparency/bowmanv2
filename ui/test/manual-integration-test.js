#!/usr/bin/env node

// Simple Node.js script to test the integration between UI and server
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const API_BASE = 'http://localhost:8307';

// Import fetch for older Node.js versions
let fetch;
try {
    fetch = globalThis.fetch;
} catch (e) {
    // For older Node.js, we'll use a simple HTTP approach
}

async function makeRequest(url, options = {}) {
    if (fetch) {
        return fetch(url, options);
    }
    
    // Fallback for older Node.js
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');
    
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const lib = parsedUrl.protocol === 'https:' ? https : http;
        
        const reqOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };
        
        const req = lib.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    json: () => Promise.resolve(JSON.parse(data))
                });
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function testIntegration() {
    console.log('🧪 Starting manual integration test...\n');

    // Create a temporary test directory
    const testDir = path.join(os.tmpdir(), `bowman-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    console.log(`📁 Created test directory: ${testDir}`);

    try {
        // 1. Test server connection
        console.log('\n1. Testing server connection...');
        const pingResponse = await makeRequest(`${API_BASE}/api/repo`);
        if (!pingResponse.ok) {
            throw new Error(`Server not responding: ${pingResponse.status}`);
        }
        console.log('✅ Server is running');

        // 2. Initialize repository
        console.log('\n2. Initializing test repository...');
        const initResponse = await fetch(`${API_BASE}/api/repo/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: testDir,
                rootAim: {
                    title: 'Integration Test Root Aim',
                    description: 'This is a test root aim for integration testing',
                    effort: 5,
                    metadata: {
                        effort: 5,
                        position: { x: 0, y: 0 }
                    }
                }
            })
        });

        const initResult = await initResponse.json();
        if (!initResponse.ok) {
            throw new Error(`Init failed: ${initResult.error || 'Unknown error'}`);
        }
        console.log(`✅ Repository initialized: ${initResult.path}`);
        console.log(`   Root aim ID: ${initResult.rootAimId.id}`);

        // 3. Set repository
        console.log('\n3. Setting repository...');
        const setRepoResponse = await fetch(`${API_BASE}/api/repo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: testDir })
        });

        if (!setRepoResponse.ok) {
            throw new Error(`Set repo failed: ${setRepoResponse.status}`);
        }
        console.log('✅ Repository set successfully');

        // 4. Create a test aim
        console.log('\n4. Creating test aim...');
        const createAimResponse = await fetch(`${API_BASE}/api/aims`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Test Aim from Integration',
                description: 'This aim was created by the integration test to verify the UI can create aims',
                effort: 7,
                tags: ['integration', 'test', 'ui'],
                assignees: ['test@example.com'],
                metadata: {
                    effort: 7,
                    position: { x: 100, y: 150 }
                }
            })
        });

        const createResult = await createAimResponse.json();
        if (!createAimResponse.ok) {
            throw new Error(`Create aim failed: ${createResult.error || 'Unknown error'}`);
        }
        console.log(`✅ Aim created: ${createResult.aimId.id}`);
        console.log(`   Title: Test Aim from Integration`);

        // 5. Verify filesystem persistence
        console.log('\n5. Verifying filesystem persistence...');
        const aimPath = path.join(testDir, '.quiver', 'aims', `${createResult.aimId.id}.json`);
        
        try {
            await fs.access(aimPath);
            console.log('✅ Aim file exists on filesystem');
            
            const aimContent = await fs.readFile(aimPath, 'utf-8');
            const savedAim = JSON.parse(aimContent);
            
            if (savedAim.title === 'Test Aim from Integration') {
                console.log('✅ Aim content matches expected data');
            } else {
                throw new Error('Aim content does not match');
            }
        } catch (error) {
            throw new Error(`Filesystem verification failed: ${error.message}`);
        }

        // 6. Retrieve all aims
        console.log('\n6. Retrieving all aims...');
        const getAllResponse = await fetch(`${API_BASE}/api/aims`);
        const allAims = await getAllResponse.json();
        
        if (!getAllResponse.ok) {
            throw new Error('Failed to retrieve aims');
        }
        
        console.log(`✅ Retrieved ${allAims.length} aims`);
        const titles = allAims.map(aim => aim.title);
        console.log(`   Titles: ${titles.join(', ')}`);

        // 7. Verify directory structure
        console.log('\n7. Verifying repository structure...');
        const expectedPaths = [
            path.join(testDir, '.quiver'),
            path.join(testDir, '.quiver', 'aims'),
            path.join(testDir, '.quiver', 'contributions'),
            path.join(testDir, '.quiver', 'meta.json')
        ];

        for (const expectedPath of expectedPaths) {
            try {
                await fs.access(expectedPath);
                console.log(`✅ ${path.basename(expectedPath)} exists`);
            } catch (error) {
                throw new Error(`Missing: ${expectedPath}`);
            }
        }

        // 8. Check meta.json content
        console.log('\n8. Checking meta.json content...');
        const metaPath = path.join(testDir, '.quiver', 'meta.json');
        const metaContent = await fs.readFile(metaPath, 'utf-8');
        const meta = JSON.parse(metaContent);
        
        if (meta.version && meta.rootAimId && meta.repository) {
            console.log('✅ meta.json has correct structure');
            console.log(`   Version: ${meta.version}`);
            console.log(`   Root aim: ${meta.rootAimId.id}`);
            console.log(`   Repository: ${meta.repository.name}`);
        } else {
            throw new Error('meta.json is missing required fields');
        }

        console.log('\n🎉 Integration test completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   - Server connection: ✅');
        console.log('   - Repository initialization: ✅');
        console.log('   - Aim creation via API: ✅');
        console.log('   - Filesystem persistence: ✅');
        console.log('   - Data retrieval: ✅');
        console.log('   - Repository structure: ✅');
        console.log('\n🔗 The UI on http://localhost:5174 should now be able to:');
        console.log('   - Connect to the server on http://localhost:3000');
        console.log('   - Create and manage aims');
        console.log('   - Persist data to the filesystem');
        console.log('   - Use the git-based backend instead of blockchain');

    } catch (error) {
        console.error('\n❌ Integration test failed:');
        console.error(`   Error: ${error.message}`);
        process.exit(1);
    } finally {
        // Clean up test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
            console.log(`\n🧹 Cleaned up test directory: ${testDir}`);
        } catch (error) {
            console.warn(`⚠️  Failed to clean up test directory: ${error.message}`);
        }
    }
}

// Check if we're running as a script
if (require.main === module) {
    testIntegration().catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = { testIntegration };