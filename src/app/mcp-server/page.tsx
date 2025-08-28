// src/app/mcp-server/page.tsx

import ContentPage from '@/components/ContentPage';
import Link from 'next/link';

const MCP_URL = 'https://global-church-main-ba4d06e.zuplo.app/mcp';

export default function McpServerPage() {
  return (
    <ContentPage title="Global.Church MCP Server (Beta)">
      <div className="space-y-8 md:space-y-10">
        <p className="text-sm inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-900">
          ⚠️ Beta — Under active development. Interfaces and schemas may change.
        </p>

        <h2>What is this?</h2>
        <p>
          The Global.Church <strong>MCP Server</strong> exposes our read-only church search tools to
          AI agents and editors that speak the Model Context Protocol (MCP). You can connect an MCP
          client (e.g., OpenAI Playground, Cursor) and call tools that proxy our API.
        </p>

        <h2>Quick Start</h2>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-xs uppercase text-gray-500 mb-1">Endpoint (POST)</div>
          <code className="text-sm font-mono text-primary break-all">{MCP_URL}</code>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs uppercase text-gray-500 mb-1">Auth (recommended)</div>
            <code className="text-sm font-mono">Authorization: Bearer &lt;YOUR_API_KEY&gt;</code>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs uppercase text-gray-500 mb-1">Alt auth (for browsers)</div>
            <div className="text-sm">
              Append <code>?apiKey=&lt;YOUR_API_KEY&gt;</code> to the URL. Our gateway converts it to the Authorization header server-side.
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 md:col-span-2">
            <div className="text-xs uppercase text-gray-500 mb-1">Tools</div>
            <div className="text-sm">
              Lists available tools via JSON-RPC (<code>tools/list</code>) and invoke them via <code>tools/call</code>.
            </div>
          </div>
        </div>

        <h3>Smoke tests (cURL)</h3>
        <p className="text-sm text-gray-600">
          Replace <code>$API_KEY</code> with your issued Global.Church gateway key.
        </p>

        <pre className="overflow-x-auto rounded-xl bg-gray-50 border border-gray-200 p-4 text-gray-800 text-sm">
{`# 1) Ping
curl -s -X POST "${MCP_URL}" \\
  -H "content-type: application/json" \\
  -H "authorization: Bearer $API_KEY" \\
  -d '{"jsonrpc":"2.0","id":"1","method":"ping"}'

# 2) List tools
curl -s -X POST "${MCP_URL}" \\
  -H "content-type: application/json" \\
  -H "authorization: Bearer $API_KEY" \\
  -d '{"jsonrpc":"2.0","id":"2","method":"tools/list"}' | jq .

# 3) Call search tool (by belief + city/state)
curl -s -X POST "${MCP_URL}" \\
  -H "content-type: application/json" \\
  -H "authorization: Bearer $API_KEY" \\
  -d '{
    "jsonrpc":"2.0","id":"3","method":"tools/call",
    "params":{ "name":"churches_search_v1",
      "arguments":{ "queryParams": {
        "country":"US", "belief":"roman_catholic",
        "locality":"El Cajon", "region":"CA", "limit":3
      }}
  }}' | jq .
`}
        </pre>

        <h2>Important: Arguments go under <code>queryParams</code></h2>
        <p>
          The MCP tool is generated from our OpenAPI spec. All inputs must be nested under
          <code> arguments.queryParams </code> and must match the schema. Examples:
        </p>

        <h4>Radius search (near downtown San Diego)</h4>
        <pre className="overflow-x-auto rounded-xl bg-gray-50 border border-gray-200 p-4 text-gray-800 text-sm">
{`{
  "jsonrpc":"2.0","id":"rad","method":"tools/call",
  "params":{ "name":"churches_search_v1",
    "arguments":{ "queryParams": {
      "center_lat": 32.7157, "center_lng": -117.1611,
      "radius_km": 25, "limit": 5
    }}
}}`}
        </pre>

        <h4>Bounding box</h4>
        <pre className="overflow-x-auto rounded-xl bg-gray-50 border border-gray-200 p-4 text-gray-800 text-sm">
{`{
  "jsonrpc":"2.0","id":"bbox","method":"tools/call",
  "params":{ "name":"churches_search_v1",
    "arguments":{ "queryParams": {
      "min_lat": 32.5, "max_lat": 33.4,
      "min_lng": -117.5, "max_lng": -116.8,
      "limit": 5
    }}
}}`}
        </pre>

        <h2>Use with OpenAI Playground</h2>
        <ol>
          <li>Tools → “Connect to MCP Server”</li>
          <li>URL: <code>{MCP_URL}</code></li>
          <li>Authentication: <strong>Custom headers</strong> → add{' '}
            <code>Authorization: Bearer &lt;YOUR_API_KEY&gt;</code></li>
          <li>Tool choice: <strong>Required</strong> (prevents model-only answers)</li>
          <li>
            In the Developer instructions, remind the model to:
            <ul>
              <li>Always call <code>churches_search_v1</code></li>
              <li>Use <code>arguments.queryParams</code></li>
              <li>Respect enum values (e.g., <code>belief=&quot;roman_catholic&quot;</code>)</li>
            </ul>
          </li>
        </ol>

        <h2>Notes & Limits</h2>
        <ul>
          <li>Read-only access; write endpoints are not exposed.</li>
          <li>Schemas and routes may evolve during beta.</li>
          <li>Rate limits and API keys may be rotated as needed.</li>
        </ul>

        <p className="text-sm text-gray-600">
          Questions? <Link href="/contact" className="underline">Get in touch</Link>.  
          Want to contribute? See our roadmap and open issues.
        </p>
      </div>
    </ContentPage>
  );
}


