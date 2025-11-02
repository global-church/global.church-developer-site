// src/app/mcp-server/page.tsx
'use client';

import { useState } from 'react';
import ContentPage from '@/components/ContentPage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  query?: Record<string, unknown> | null;
  raw?: unknown;
}

const MCP_URL = 'https://global-church-main-ba4d06e.zuplo.app/mcp';

export default function McpServerPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    const historyToSend = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, history: historyToSend }),
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        type ErrorBody = { error?: string; status?: number; detail?: string };
        let errBody: ErrorBody | null = null;
        let errText: string | undefined;
        if (contentType.includes('application/json')) {
          try {
            const parsed: unknown = await res.json();
            if (parsed && typeof parsed === 'object') {
              errBody = parsed as ErrorBody;
            }
          } catch {
            errBody = null;
          }
        } else {
          try {
            errText = await res.text();
          } catch {
            // ignore
          }
        }
        if (!errBody && errText) {
          errBody = { detail: errText };
        }
        const status = res.status;
        const statusText = res.statusText;
        console.warn('ask api warning', { status, statusText, body: errBody ?? errText ?? null });
        const msg = [
          errBody?.error || 'Request failed.',
          status ? `status ${status}${statusText ? ` ${statusText}` : ''}` : '',
          errBody?.detail || errText,
        ]
          .filter(Boolean)
          .join(' - ');
        setError(msg);
      } else {
        const data = await res.json();
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: data.message || 'No response.',
            query: data.query,
            raw: data.raw,
          },
        ]);
      }
    } catch (e) {
      console.error('ask fetch error', e);
      setError(`Network error${e instanceof Error ? `: ${e.message}` : ''}`);
    }
    setLoading(false);
  };

  return (
    <ContentPage title="MCP Server">
      {/* Beta notice moved above the chat/aside layout */}
      <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
        ⚠️ Beta — Under active development. Interfaces and schemas may change.
      </p>

      <div className="mb-16 grid gap-8 md:grid-cols-2 xl:grid-cols-2">
        <div className="relative md:col-span-1 xl:col-span-1 flex h-[480px] sm:h-[520px] md:h-[600px] lg:h-[660px] xl:h-[720px] flex-col rounded-xl border border-gray-200 p-4">
          {messages.length > 0 && (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setMessages([]);
                setError('');
              }}
              className="absolute right-3 top-3 rounded border border-gray-300 bg-white/80 px-3 py-1.5 text-xs text-gray-700 shadow-sm backdrop-blur transition-colors hover:bg-white disabled:opacity-50"
              title="Clear this chat"
            >
              Clear Chat
            </button>
          )}
          <div className="flex-1 overflow-y-auto space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div
                  className={`inline-block rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {m.content}
                </div>
                {m.role === 'assistant' && m.query && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-gray-600">What was called</summary>
                    <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-left text-gray-800">
{JSON.stringify(m.query, null, 2)}
                    </pre>
                    {m.raw != null && (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(m.raw, null, 2))}
                        className="mt-1 underline"
                      >
                        Copy tool JSON
                      </button>
                    )}
                  </details>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Thinking...
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="mt-4 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about churches..."
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
          {error && (
            <div className="mt-2 rounded bg-red-100 p-2 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            <a href="#quick-start" className="underline">
              This demo is powered by the Global.Church MCP server and OpenAI models.
            </a>
          </p>
        </div>
        <aside
          id="how-it-works"
          className="md:col-span-1 xl:col-span-1 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm overflow-y-auto h-auto md:h-[600px] lg:h-[660px] xl:h-[720px]"
        >
          <h2 className="text-lg font-semibold">How it works</h2>
          <ol className="list-decimal space-y-2 pl-6">
            <li>We use the OpenAI Responses API with a remote MCP server (Zuplo) that auto-generates tools from our OpenAPI routes.</li>
            <li>We restrict tool usage to <code>churches_search_v1</code> and set approval to never, which is the recommended pattern for hosted remote MCP tools.</li>
            <li>All requests are server-side; keys are stored as sensitive variables in Vercel.</li>
          </ol>
          <div>
            <p className="font-medium">Try asking:</p>
            <ul className="list-disc pl-6">
              <li>Find Roman Catholic churches in El Cajon, CA</li>
              <li>Show 3 churches near downtown San Diego</li>
              <li>Any Anglican congregations in Toronto?</li>
            </ul>
          </div>
          <p className="text-xs text-gray-600">Beta disclaimer: schemas and routes may change.</p>
        </aside>
      </div>
      <div className="space-y-8 md:space-y-10">
        <h2>What is this?</h2>
        <p>
          The Global.Church <strong>MCP Server</strong> exposes our read-only church search tools to AI agents and editors that
          speak the Model Context Protocol (MCP). You can connect an MCP client (e.g., OpenAI Playground, Cursor) and call
          tools that proxy our API.
        </p>

        <h2 id="quick-start">Quick Start</h2>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-1 text-xs uppercase text-gray-500">Endpoint (POST)</div>
          <code className="break-all text-sm font-mono text-primary">{MCP_URL}</code>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-1 text-xs uppercase text-gray-500">Auth (recommended)</div>
            <code className="text-sm font-mono">Authorization: Bearer &lt;YOUR_API_KEY&gt;</code>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-1 text-xs uppercase text-gray-500">Alt auth (for browsers)</div>
            <div className="text-sm">
              Append <code>?apiKey=&lt;YOUR_API_KEY&gt;</code> to the URL. Our gateway converts it to the Authorization header
              server-side.
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 md:col-span-2">
            <div className="mb-1 text-xs uppercase text-gray-500">Tools</div>
            <div className="text-sm">
              Lists available tools via JSON-RPC (<code>tools/list</code>) and invoke them via <code>tools/call</code>.
            </div>
          </div>
        </div>

        <h3>Smoke tests (cURL)</h3>
        <p className="text-sm text-gray-600">Replace <code>$API_KEY</code> with your issued Global.Church gateway key.</p>

        <pre className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
{`# 1) Ping
curl -s -X POST "${MCP_URL}" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $API_KEY" \
  -d '{"jsonrpc":"2.0","id":"1","method":"ping"}'

# 2) List tools
curl -s -X POST "${MCP_URL}" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $API_KEY" \
  -d '{"jsonrpc":"2.0","id":"2","method":"tools/list"}' | jq .

# 3) Call search tool (by belief + city/state)
curl -s -X POST "${MCP_URL}" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $API_KEY" \
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
          The MCP tool is generated from our OpenAPI spec. All inputs must be nested under <code>arguments.queryParams</code>
          and must match the schema. Examples:
        </p>

        <h4>Radius search (near downtown San Diego)</h4>
        <pre className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
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
        <pre className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
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
          <li>
            Authentication: <strong>Custom headers</strong> → add <code>Authorization: Bearer &lt;YOUR_API_KEY&gt;</code>
          </li>
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
          Want to contribute? See our roadmap and open issues.
        </p>
      </div>
    </ContentPage>
  );
}
