'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Shield, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  fetchUsers,
  assignRole,
  removeRole,
  toggleApiAccess,
  type UserListItem,
  type UserListResult,
} from '@/app/admin/actions';
import type { UserRole } from '@/lib/session';

const ALL_ROLES: UserRole[] = ['admin', 'support', 'editor'];

export function AdminUsersTable({ canAssignRoles }: { canAssignRoles: boolean }) {
  const [result, setResult] = useState<UserListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmApiToggle, setConfirmApiToggle] = useState<UserListItem | null>(null);
  const [confirmRoleToggle, setConfirmRoleToggle] = useState<{ user: UserListItem; role: UserRole } | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async (searchQuery: string, cursorValue: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers({ query: searchQuery, cursor: cursorValue, limit: 25 });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(query, cursor);
  }, [cursor, load, query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCursor(null);
    load(query, null);
  };

  const handleConfirmRoleToggle = async () => {
    if (!confirmRoleToggle) return;
    setToggling(true);
    const { user, role } = confirmRoleToggle;
    const hasRole = user.roles.includes(role);
    const res = hasRole
      ? await removeRole(user.id, role)
      : await assignRole(user.id, role);
    setToggling(false);
    setConfirmRoleToggle(null);
    if (!res.success) {
      setError(res.error ?? 'Failed to update role.');
      return;
    }
    load(query, cursor);
  };

  const handleConfirmApiAccess = async () => {
    if (!confirmApiToggle) return;
    setToggling(true);
    const res = await toggleApiAccess(confirmApiToggle.id, !confirmApiToggle.api_access_approved);
    setToggling(false);
    setConfirmApiToggle(null);
    if (!res.success) {
      setError(res.error ?? 'Failed to update API access.');
      return;
    }
    load(query, cursor);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by email or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="px-4 py-3 text-left font-medium text-slate-400">User</th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">Roles</th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">API Access</th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">Keys</th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : !result?.items.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            ) : (
              result.items.map((user) => (
                <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-slate-200">
                        {user.display_name || user.email}
                      </div>
                      {user.display_name && (
                        <div className="text-xs text-slate-500">{user.email}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {canAssignRoles ? (
                        ALL_ROLES.map((role) => {
                          const active = user.roles.includes(role);
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => setConfirmRoleToggle({ user, role })}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition-colors ${
                                active
                                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30'
                                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                              }`}
                              title={active ? `Remove ${role} role` : `Assign ${role} role`}
                            >
                              {active ? (
                                <Shield className="h-3 w-3" />
                              ) : (
                                <ShieldOff className="h-3 w-3" />
                              )}
                              {role}
                            </button>
                          );
                        })
                      ) : (
                        user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge key={role} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">&mdash;</span>
                        )
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setConfirmApiToggle(user)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${
                        user.api_access_approved
                          ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30'
                          : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                      }`}
                      title={user.api_access_approved ? 'Revoke API access' : 'Approve API access'}
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                        user.api_access_approved ? 'bg-emerald-400' : 'bg-slate-600'
                      }`} />
                      {user.api_access_approved ? 'Approved' : 'Pending'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {user.api_key_count}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {result && (result.previousCursor || result.nextCursor) && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {result.count != null ? `${result.count} total users` : ''}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!result.previousCursor}
              onClick={() => setCursor(result.previousCursor)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!result.nextCursor}
              onClick={() => setCursor(result.nextCursor)}
              className="gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* API Access confirmation dialog */}
      {confirmApiToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => { if (!toggling) setConfirmApiToggle(null); }}
          />
          <div className="relative bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">
              {confirmApiToggle.api_access_approved ? 'Revoke API Access' : 'Approve API Access'}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              {confirmApiToggle.api_access_approved
                ? <>Are you sure you want to revoke API access for <span className="text-slate-200 font-medium">{confirmApiToggle.display_name || confirmApiToggle.email}</span>? They will no longer be able to create API keys.</>
                : <>Approve API access for <span className="text-slate-200 font-medium">{confirmApiToggle.display_name || confirmApiToggle.email}</span>? They will be able to create and manage API keys.</>
              }
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={toggling}
                onClick={() => setConfirmApiToggle(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={toggling}
                onClick={handleConfirmApiAccess}
                className={confirmApiToggle.api_access_approved
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }
              >
                {toggling ? 'Updating...' : confirmApiToggle.api_access_approved ? 'Revoke' : 'Approve'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Role toggle confirmation dialog */}
      {confirmRoleToggle && (() => {
        const { user, role } = confirmRoleToggle;
        const hasRole = user.roles.includes(role);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => { if (!toggling) setConfirmRoleToggle(null); }}
            />
            <div className="relative bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-sm font-semibold text-slate-100 mb-2">
                {hasRole ? `Remove ${role} role` : `Assign ${role} role`}
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                {hasRole
                  ? <>Remove the <span className="text-blue-300 font-medium">{role}</span> role from <span className="text-slate-200 font-medium">{user.display_name || user.email}</span>?</>
                  : <>Assign the <span className="text-blue-300 font-medium">{role}</span> role to <span className="text-slate-200 font-medium">{user.display_name || user.email}</span>?</>
                }
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={toggling}
                  onClick={() => setConfirmRoleToggle(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={toggling}
                  onClick={handleConfirmRoleToggle}
                  className={hasRole
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                >
                  {toggling ? 'Updating...' : hasRole ? 'Remove' : 'Assign'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
