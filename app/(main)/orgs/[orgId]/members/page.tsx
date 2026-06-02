'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useOrganization,
  useOrganizationMembers,
  useUserRole,
  useRemoveMember,
} from '@/hooks/organization';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { InviteMemberDialog } from '@/components/organization/InviteMemberDialog';
import { CreateVirtualMemberDialog } from '@/components/organization/CreateVirtualMemberDialog';
import { MergeVirtualMemberDialog } from '@/components/organization/MergeVirtualMemberDialog';
import { AddExistingVirtualMemberDialog } from '@/components/organization/AddExistingVirtualMemberDialog';
import { VirtualMemberProfileDialog } from '@/components/organization/VirtualMemberProfileDialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  UserX,
  GitMerge,
  Trash2,
  Pencil,
  Users,
} from 'lucide-react';
import { Loading } from '@/components/ui/loading';

type OrgMemberUser = {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  isVirtual?: boolean;
  mergedIntoId?: string | null;
};

type OrgMember = {
  role: string;
  joinedAt: string;
  user: OrgMemberUser;
};

export default function MembersPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const orgId = params.orgId as string;

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [virtualOpen, setVirtualOpen] = useState(false);
  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<OrgMemberUser | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OrgMemberUser | null>(null);
  const [profileTarget, setProfileTarget] = useState<OrgMemberUser | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);
  const { data: membersData, isLoading: membersLoading } = useOrganizationMembers(
    orgId, page, debouncedSearch, sort, 20
  );
  const removeMember = useRemoveMember(orgId);

  useEffect(() => { setPage(1); }, [debouncedSearch, sort]);

  useEffect(() => {
    if (!roleLoading && userRole === 'MEMBER') {
      router.replace(`/orgs/${orgId}/my-work`);
    }
  }, [userRole, roleLoading, orgId, router]);

  if (orgLoading || roleLoading) return <Loading fullPage />;
  if (!org) return <div>Organization not found</div>;
  if (userRole === 'MEMBER') return <div>Redirecting…</div>;
  if (userRole !== 'ADMIN' && userRole !== 'MAINTAINER') return <div>Access denied.</div>;

  const isAdmin = userRole === 'ADMIN';
  const pagination = membersData?.pagination;

  async function handleRemove() {
    if (!removeTarget) return;
    try {
      await removeMember.mutateAsync(removeTarget.id);
      toast({ title: `${removeTarget.name || removeTarget.email} removed` });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast({ title: 'Failed to remove', description: e.response?.data?.error, variant: 'destructive' });
    } finally {
      setRemoveTarget(null);
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-muted-foreground">{org.name}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Members</CardTitle>
              <div className="flex gap-2">
                {isAdmin && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" onClick={() => setAddExistingOpen(true)}>
                          <Users className="h-4 w-4 mr-2" />
                          Add My Virtual Member
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add a virtual member you created in another org</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" onClick={() => setVirtualOpen(true)}>
                          <UserX className="h-4 w-4 mr-2" />
                          Create Virtual Member
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add a placeholder for someone without an account</TooltipContent>
                    </Tooltip>
                  </>
                )}
                <Button onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant="outline" size="sm"
                onClick={() => setSort(sort === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1 shrink-0"
              >
                <ArrowUpDown className="h-4 w-4" />
                {sort === 'desc' ? 'Newest first' : 'Oldest first'}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {membersLoading ? (
              <Loading text="Loading members…" />
            ) : membersData && membersData.members.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    {isAdmin && <TableHead className="w-[100px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(membersData.members as OrgMember[]).map((member) => {
                    const u = member.user;
                    const isMerged = !!u.mergedIntoId;
                    return (
                      <TableRow key={u.id} className={isMerged ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{u.name || 'No name'}</span>
                            {u.isVirtual && !isMerged && (
                              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 py-0">
                                Virtual
                              </Badge>
                            )}
                            {isMerged && (
                              <Badge variant="outline" className="text-xs border-gray-300 text-gray-500 py-0">
                                Merged
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.email.includes('@placeholder.local') ? (
                            <span className="italic text-muted-foreground/60">No email set</span>
                          ) : (
                            u.email
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1 justify-end">
                              {u.isVirtual && !isMerged && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={() => setProfileTarget(u)}
                                      >
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit profile</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={() => setMergeTarget(u)}
                                      >
                                        <GitMerge className="h-3.5 w-3.5 text-blue-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Merge with real account</TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                              {!isMerged && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost" size="icon" className="h-7 w-7"
                                      onClick={() => setRemoveTarget(u)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Remove from organisation</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                {debouncedSearch ? 'No members match your search' : 'No members yet'}
              </p>
            )}
          </CardContent>

          {pagination && pagination.totalPages > 1 && (
            <CardFooter className="flex items-center justify-between border-t px-6 py-4">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrev}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNext}
                className="flex items-center gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Invite dialog */}
        <InviteMemberDialog orgId={orgId} open={inviteOpen} onOpenChange={setInviteOpen} />

        {/* Create virtual member dialog */}
        <CreateVirtualMemberDialog orgId={orgId} open={virtualOpen} onOpenChange={setVirtualOpen} />

        {/* Merge dialog */}
        {mergeTarget && (
          <MergeVirtualMemberDialog
            orgId={orgId}
            virtualUser={mergeTarget}
            open={!!mergeTarget}
            onOpenChange={(o) => { if (!o) setMergeTarget(null); }}
          />
        )}

        {/* Add existing virtual member */}
        <AddExistingVirtualMemberDialog
          orgId={orgId}
          open={addExistingOpen}
          onOpenChange={setAddExistingOpen}
        />

        {/* Virtual member profile */}
        {profileTarget && (
          <VirtualMemberProfileDialog
            orgId={orgId}
            userId={profileTarget.id}
            open={!!profileTarget}
            onOpenChange={(o) => { if (!o) setProfileTarget(null); }}
          />
        )}

        {/* Remove confirmation */}
        <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove member?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{removeTarget?.name || removeTarget?.email}</strong> will be removed from the organisation.
                Their tasks and data will remain but they will lose access.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                className="bg-destructive hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
