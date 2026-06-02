'use client';

import { useState } from 'react';
import { useMyVirtualMembers, useAddExistingVirtualMember } from '@/hooks/organization';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { useToast } from '@/components/ui/use-toast';
import { Search, Building2, Plus } from 'lucide-react';

interface Props {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddExistingVirtualMemberDialog({ orgId, open, onOpenChange }: Props) {
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState<Record<string, 'MAINTAINER' | 'MEMBER'>>({});
  const [adding, setAdding] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const { toast } = useToast();

  const { data: virtualUsers = [], isLoading } = useMyVirtualMembers(orgId, debouncedSearch);
  const addExisting = useAddExistingVirtualMember(orgId);

  async function handleAdd(userId: string, name: string | null) {
    setAdding(userId);
    try {
      await addExisting.mutateAsync({ virtualUserId: userId, role: roles[userId] ?? 'MEMBER' });
      toast({ title: `${name || 'Virtual member'} added to organisation` });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast({ title: 'Failed to add', description: e.response?.data?.error, variant: 'destructive' });
    } finally {
      setAdding(null);
    }
  }

  function handleClose() {
    setSearch('');
    setRoles({});
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Existing Virtual Member</DialogTitle>
          <DialogDescription>
            Pick a virtual member you created to add to this organisation. Members already in this org are hidden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* List */}
          <div className="border rounded-md divide-y max-h-[360px] overflow-y-auto">
            {isLoading ? (
              <Loading text="Loading…" />
            ) : virtualUsers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {debouncedSearch
                  ? 'No matching virtual members'
                  : 'All your virtual members are already in this org, or you haven\'t created any.'}
              </p>
            ) : (
              virtualUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name || '—'}</p>
                    {!u.email.includes('@placeholder.local') && (
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    )}
                    {u.orgMemberships.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {u.orgMemberships.map((m) => (
                          <span key={m.orgId} className="text-xs text-muted-foreground">{m.org.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Select
                    value={roles[u.id] ?? 'MEMBER'}
                    onValueChange={(v) => setRoles((r) => ({ ...r, [u.id]: v as 'MEMBER' | 'MAINTAINER' }))}
                  >
                    <SelectTrigger className="w-[110px] h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="MAINTAINER">Maintainer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    disabled={adding === u.id}
                    onClick={() => handleAdd(u.id, u.name ?? null)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={handleClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
