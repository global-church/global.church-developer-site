// Explore Zuplo configuration using Management API
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key] = valueParts.join('=');
    }
  }
});

const ZUPLO_API_URL = env.ZUPLO_API_URL || env.NEXT_PUBLIC_ZUPLO_API_URL;
const ZUPLO_MGMT_KEY = env.ZUPLO_MANAGEMENT_API_KEY;

console.log('🔍 Exploring Zuplo Configuration...\n');
console.log('API URL:', ZUPLO_API_URL);
console.log('Management Key:', ZUPLO_MGMT_KEY ? `${ZUPLO_MGMT_KEY.substring(0, 20)}...` : 'MISSING');
console.log('\n');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${ZUPLO_MGMT_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    console.log(`📡 ${requestOptions.method} ${url}`);

    const req = https.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`   Error:`, error.message);
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function main() {
  try {
    // Extract project info from URL
    // URL format: https://{project}-{env}-{hash}.zuplo.app
    const urlParts = ZUPLO_API_URL.replace('https://', '').replace('.zuplo.app', '').split('-');
    console.log('URL parts:', urlParts);

    // Try different Zuplo API endpoints to discover configuration
    const baseManagementUrl = 'https://api.zuplo.com';

    console.log('\n=== Test 1: List Projects ===\n');
    const projects = await makeRequest(`${baseManagementUrl}/v1/accounts/projects`);
    console.log('Projects response:', JSON.stringify(projects, null, 2));

    console.log('\n=== Test 2: Try OpenAPI/Swagger Spec ===\n');
    const openapi = await makeRequest(`${ZUPLO_API_URL}/openapi.json`);
    if (openapi.status === 200) {
      console.log('OpenAPI spec found!');
      if (openapi.data && openapi.data.paths) {
        console.log('Available paths:');
        Object.keys(openapi.data.paths).forEach(path => {
          const methods = Object.keys(openapi.data.paths[path]);
          console.log(`  ${path}: ${methods.join(', ')}`);
        });
      }
    } else {
      console.log('OpenAPI spec:', openapi);
    }

    console.log('\n=== Test 3: Try API Docs Endpoint ===\n');
    const docs = await makeRequest(`${ZUPLO_API_URL}/docs`);
    console.log('Docs response status:', docs.status);

    console.log('\n✅ Zuplo exploration complete!');

  } catch (error) {
    console.error('\n❌ Error during exploration:', error.message);
  }
}

main();
