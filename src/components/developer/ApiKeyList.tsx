'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Trash2, Plus, Key, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listApiKeys, createApiKey, revokeApiKey, type ApiKeyRecord } from '@/app/developer/actions';

export function ApiKeyList() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create key state
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showRevoked, setShowRevoked] = useState(false);

  const loadKeys = async () => {
    setLoading(true);
    const result = await listApiKeys();
    setKeys(result.keys);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    const result = await createApiKey(newLabel);
    setCreating(false);

    if (result.success && result.apiKey) {
      setNewKey(result.apiKey);
      setNewLabel('');
      loadKeys();
    } else {
      setError(result.error ?? 'Failed to create key.');
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;
    setRevokingId(id);
    const result = await revokeApiKey(id);
    setRevokingId(null);
    if (result.success) {
      loadKeys();
    } else {
      setError(result.error ?? 'Failed to revoke key.');
    }
  };

  const dismissNewKey = () => {
    setNewKey(null);
    setShowCreate(false);
  };

  const activeKeys = keys.filter((k) => k.is_active);
  const revokedKeys = keys.filter((k) => !k.is_active);

  return (
    <div className="space-y-6">
      {/* New key display */}
      {newKey && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-base text-green-800">API Key Created</CardTitle>
            <CardDescription className="text-green-700">
              Copy this key now. You won&apos;t be able to see it again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white p-3 text-sm font-mono border break-all">
                {newKey}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={dismissNewKey}>
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create key */}
      {!newKey && (
        <div>
          {showCreate ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-2">
                    <label htmlFor="key-label" className="text-sm font-medium">
                      Key label
                    </label>
                    <Input
                      id="key-label"
                      placeholder="e.g. Production, Development"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? 'Creating...' : 'Create'}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create API Key
            </Button>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Active keys */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3">
          Active Keys ({activeKeys.length})
        </h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : activeKeys.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Key className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No API keys yet. Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeKeys.map((k) => (
              <Card key={k.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{k.label}</span>
                      <Badge variant="secondary" className="text-xs">Active</Badge>
                    </div>
                    <code className="text-xs text-gray-500 font-mono">{k.key_hint}</code>
                    <p className="text-xs text-gray-400">
                      Created {new Date(k.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevoke(k.id)}
                    disabled={revokingId === k.id}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Revoke key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <div>
          <button
            onClick={() => setShowRevoked(!showRevoked)}
            className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 mb-3"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${showRevoked ? 'rotate-90' : ''}`} />
            Revoked Keys ({revokedKeys.length})
          </button>
          {showRevoked && (
            <div className="space-y-2 opacity-60">
              {revokedKeys.map((k) => (
                <Card key={k.id}>
                  <CardContent className="py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm line-through">{k.label}</span>
                        <Badge variant="outline" className="text-xs">Revoked</Badge>
                      </div>
                      <code className="text-xs text-gray-400 font-mono">{k.key_hint}</code>
                      <p className="text-xs text-gray-400">
                        Revoked {k.revoked_at ? new Date(k.revoked_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
