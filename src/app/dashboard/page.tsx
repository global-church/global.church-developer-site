import { createSupabaseServerComponentClient } from '@/lib/supabaseServerClient';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Key, Settings, BookOpen, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerComponentClient();
  const session = await getCurrentSession(supabase);

  if (!session) redirect('/signin');

  const { count: keyCount } = await supabase
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.userId)
    .eq('is_active', true);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Welcome{session.displayName ? `, ${session.displayName}` : ''}
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your API keys and access the Global.Church Index.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/keys">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">API Keys</CardTitle>
                  <CardDescription>
                    {keyCount ?? 0} active key{keyCount !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Create, view, and revoke your API keys.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/api-docs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-blue-50 p-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">API Docs</CardTitle>
                  <CardDescription>Reference</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Explore endpoints, schemas, and examples.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/settings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-gray-100 p-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Profile</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Update your name, company, and bio.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Quick Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/schema" className="text-primary hover:underline">
                Data Schema
              </Link>{' '}
              &mdash; View the church data model
            </li>
            <li>
              <Link href="/mcp-server" className="text-primary hover:underline">
                MCP Server
              </Link>{' '}
              &mdash; Connect via Model Context Protocol
            </li>
            <li>
              <Link href="/feedback" className="text-primary hover:underline">
                Give Feedback
              </Link>{' '}
              &mdash; Report bugs or request features
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
