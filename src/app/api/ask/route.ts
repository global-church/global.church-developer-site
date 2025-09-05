import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  timestamp: number;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, RateLimitEntry>();

type ChatTurn = { role: 'user' | 'assistant'; content: string };

export async function POST(req: NextRequest) {
  try {
    const { question, history, previousResponseId } = (await req.json()) as {
      question?: unknown;
      history?: unknown;
      previousResponseId?: unknown;
    };
    const parsedHistory: ChatTurn[] = Array.isArray(history)
      ? (history as unknown[])
          .map((h) => {
            if (!h || typeof h !== 'object') return null;
            const obj = h as Record<string, unknown>;
            const role = obj.role;
            const content = obj.content;
            if (role !== 'user' && role !== 'assistant') return null;
            if (typeof content !== 'string' || !content.trim()) return null;
            return { role, content } as ChatTurn;
          })
          .filter((x): x is ChatTurn => !!x)
      : [];
    const safeHistory = parsedHistory.slice(-12); // cap context
    const q = typeof question === 'string' ? question : '';
    if (!q.trim()) {
      return NextResponse.json({ error: 'Question required.' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip) ?? { count: 0, timestamp: now };
    if (now - entry.timestamp > RATE_LIMIT_WINDOW_MS) {
      entry.count = 0;
      entry.timestamp = now;
    }
    entry.count += 1;
    rateLimitMap.set(ip, entry);
    if (entry.count > RATE_LIMIT_MAX) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const start = Date.now();
    const mcpUrl = process.env.NEXT_PUBLIC_MCP_URL;
    const mcpApiKey = process.env.GLOBAL_CHURCH_API_KEY || process.env.NEXT_PUBLIC_ZUPLO_API_KEY;
    if (!mcpUrl) {
      console.error('MCP URL not configured. Set NEXT_PUBLIC_MCP_URL');
      return NextResponse.json(
        { error: 'Server misconfiguration.', detail: 'NEXT_PUBLIC_MCP_URL is not set.' },
        { status: 500 },
      );
    }
    if (!mcpApiKey) {
      console.error('MCP API key not configured. Set GLOBAL_CHURCH_API_KEY');
      return NextResponse.json(
        { error: 'Server misconfiguration.', detail: 'GLOBAL_CHURCH_API_KEY is not set.' },
        { status: 500 },
      );
    }
    const serverUrl = mcpUrl;

    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        // Keep developer instructions via prompt id
        prompt: {
          id: 'pmpt_68ba191fff508193a1b2d77008a32fa401db62f89e66a7a6',
          version: '4',
        },
        previous_response_id: typeof previousResponseId === 'string' ? previousResponseId : undefined,
        // Supply chat history as messages so the model has context
        input: [
          ...safeHistory.map((t) => ({
            role: t.role,
            content: [
              { type: (t.role === 'assistant' ? 'output_text' : 'input_text'), text: t.content },
            ],
          })),
          { role: 'user', content: [{ type: 'input_text', text: q }] },
        ],
        reasoning: { effort: 'low' },
        text: { format: { type: 'text' }, verbosity: 'low' },
        max_output_tokens: 3000,
        store: false,
        tool_choice: 'auto',
        parallel_tool_calls: false,
        tools: [
          {
            type: 'mcp',
            server_label: 'global_church',
            server_url: serverUrl,
            allowed_tools: ['churches_search_v1'],
            require_approval: 'never',
            headers: {
              Authorization: `Bearer ${mcpApiKey}`,
            },
          },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.warn('openai request failed', {
        status: openaiRes.status,
        statusText: openaiRes.statusText,
        body: errText,
      });
      let detail: string | undefined;
      try {
        const parsed = JSON.parse(errText);
        detail = parsed.error?.message ?? errText;
      } catch {
        detail = errText;
      }
      return NextResponse.json(
        {
          error: 'OpenAI request failed.',
          status: openaiRes.status,
          detail,
        },
        { status: 500 },
      );
    }
    const data = await openaiRes.json();
    console.dir(data, { depth: 4 });
    interface OutputItem {
      type: string;
      // legacy tool result shape
      tool_name?: string;
      call?: { arguments?: { queryParams?: Record<string, unknown> } };
      arguments?: { queryParams?: Record<string, unknown> };
      result?: unknown;
      // direct text item shape
      text?: string;
      // message shape
      role?: string;
      content?: Array<{ type: string; text?: string }>;
      // mcp_call shape
      name?: string;
      output?: string;
    }

    const outputs = Array.isArray(data.output) ? (data.output as OutputItem[]) : [];
    const mcpCalls = outputs.filter(
      (item) => item.type === 'tool_result' && item.tool_name === 'churches_search_v1',
    );
    const mcpCallItem = outputs.find((item) => item.type === 'mcp_call') as OutputItem | undefined;
    if (mcpCalls.length > 1) {
      console.warn('multiple MCP calls detected', mcpCalls.length);
    }
    const mcpCall = mcpCalls[0];

    let queryParams: Record<string, unknown> | null = null;
    let raw: unknown = null;
    if (mcpCall) {
      queryParams = mcpCall.call?.arguments?.queryParams ?? mcpCall.arguments?.queryParams ?? null;
      raw = mcpCall.result ?? null;
    } else if (mcpCallItem) {
      // arguments and output are JSON strings in mcp_call
      try {
        if (typeof mcpCallItem.arguments === 'object' && mcpCallItem.arguments) {
          // already parsed form (unlikely)
          const a = mcpCallItem.arguments as unknown as { queryParams?: Record<string, unknown> };
          queryParams = a.queryParams ?? null;
        } else if (typeof (mcpCallItem as unknown as { arguments?: string }).arguments === 'string') {
          const parsedArgs = JSON.parse((mcpCallItem as unknown as { arguments: string }).arguments);
          queryParams = (parsedArgs?.queryParams as Record<string, unknown> | undefined) ?? null;
        }
      } catch (e) {
        console.warn('failed to parse mcp_call.arguments', e);
      }
      try {
        if (typeof mcpCallItem.output === 'string') {
          raw = JSON.parse(mcpCallItem.output);
        } else {
          raw = mcpCallItem.output ?? null;
        }
      } catch {
        raw = mcpCallItem.output ?? null;
      }
    }

    // Prefer the top-level convenience field if present.
    const outputText =
      typeof (data as { output_text?: unknown }).output_text === 'string'
        ? ((data as { output_text?: string }).output_text as string)
        : undefined;
    const textItem = outputs.find((item) => item.type === 'output_text');
    // Newer shape: message item with content array containing output_text
    const messageItem = outputs.find((item) => item.type === 'message');
    const contentText = Array.isArray(messageItem?.content)
      ? messageItem?.content
          .filter((c) => c.type === 'output_text' && typeof c.text === 'string')
          .map((c) => c.text as string)
          .join('\n\n')
      : undefined;
    let message = outputText ?? textItem?.text ?? contentText ?? '';
    if (!message) {
      const countFromRaw = (() => {
        const r = raw as unknown;
        if (Array.isArray(r)) return r.length;
        if (r && typeof r === 'object') {
          const obj = r as Record<string, unknown>;
          const keys = ['items', 'results', 'data'];
          for (const k of keys) {
            const v = obj[k];
            if (Array.isArray(v)) return v.length;
          }
        }
        return undefined;
      })();
      if (typeof countFromRaw === 'number') {
        message = `Found ${countFromRaw} result${countFromRaw === 1 ? '' : 's'}.`;
      }
    }

    const durationMs = Date.now() - start;
    console.log(
      JSON.stringify({
        ts: new Date(start).toISOString(),
        mcp: Boolean(mcpCall || mcpCallItem),
        durationMs,
        hasOutputText: Boolean(outputText || textItem?.text || contentText),
      }),
    );

    return NextResponse.json({ message, query: queryParams, raw, responseId: data.id });
  } catch (err) {
    console.error('ask route error', err);
    return NextResponse.json(
      {
        error: 'Unexpected error.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
