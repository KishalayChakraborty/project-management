'use client';

import { useState } from 'react';
import { useMergeVirtualMember, useSearchUser } from '@/hooks/organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Search, ArrowRight, CheckCircle2 } from 'lucide-react';

interface SearchResult {
  user: { id: string; email: string; name?: string | null } | null;
  exists: boolean;
  isMember: boolean;
}

interface Props {
  orgId: string;
  virtualUser: { id: string; name?: string | null; email: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MergeVirtualMemberDialog({ orgId, virtualUser, open, onOpenChange }: Props) {
  const [searchEmail, setSearchEmail] = useState('');
  const [found, setFound] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const searchUser = useSearchUser(orgId);
  const merge = useMergeVirtualMember(orgId);
  const { toast } = useToast();

  async function handleSearch() {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setFound(null);
    try {
      const result = await searchUser.mutateAsync(searchEmail.trim());
      setFound(result as SearchResult);
    } catch {
      toast({ title: 'Search failed', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  }

  async function handleMerge() {
    if (!found?.user) return;
    try {
      const res = await merge.mutateAsync({ virtualUserId: virtualUser.id, realUserId: found.user.id });
      toast({ title: 'Merged successfully', description: res.message });
      onOpenChange(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast({ title: 'Merge failed', description: e.response?.data?.error ?? 'An error occurred', variant: 'destructive' });
    }
  }

  function handleClose() {
    setSearchEmail('');
    setFound(null);
    onOpenChange(false);
  }

  const canMerge = found?.exists && found.user && !found.user.id === false;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Merge Virtual Account</DialogTitle>
          <DialogDescription>
            Find the real account to merge <strong>{virtualUser.name || virtualUser.email}</strong> into.
            All task assignments, team memberships, and work logs will be transferred.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Virtual user summary */}
          <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/30">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{virtualUser.name || '—'}</p>
              <p className="text-xs text-muted-foreground truncate">{virtualUser.email}</p>
            </div>
            <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 shrink-0">Virtual</Badge>
          </div>

          <div className="flex items-center justify-center text-muted-foreground gap-2">
            <ArrowRight className="h-4 w-4" />
            <span className="text-xs">will be merged into</span>
          </div>

          {/* Search */}
          <div className="space-y-1.5">
            <Label>Search for real account by email</Label>
            <div className="flex gap-2">
              <Input
                placeholder="user@example.com"
                value={searchEmail}
                onChange={(e) => { setSearchEmail(e.target.value); setFound(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="outline" onClick={handleSearch} disabled={searching || !searchEmail.trim()}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search result */}
          {found !== null && (
            <div className="rounded-md border p-3">
              {!found.exists || !found.user ? (
                <p className="text-sm text-muted-foreground">No account found with this email. The person must have signed up first.</p>
              ) : (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{found.user.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{found.user.email}</p>
                    {found.isMember && (
                      <Badge variant="secondary" className="text-xs mt-1">Already in this org</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {found?.user && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-800">
              <strong>This action cannot be undone.</strong> The virtual account will be deactivated and all its data transferred to the real account.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleMerge}
            disabled={!found?.user || merge.isPending}
          >
            {merge.isPending ? 'Merging…' : 'Merge Accounts'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
