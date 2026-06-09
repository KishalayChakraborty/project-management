'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useJobAds, useDeleteJobAd } from '@/hooks/hr/useJobAds';
import { useJobProfiles } from '@/hooks/hr/useJobProfiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Copy, CheckCircle2, Edit2, Trash2, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { JobAdForm } from '@/components/hr/JobAdForm';
import { useToast } from '@/components/ui/use-toast';

export default function JobAdsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: adsData, isLoading: adsLoading } = useJobAds(orgId);
  const { data: profilesData } = useJobProfiles(orgId);
  const deleteAdMutation = useDeleteJobAd(orgId);

  const ads = adsData?.data || [];
  const profiles = profilesData?.data || [];

  const handleCopyLink = (token: string, title: string) => {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/apply/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(token);
    toast({
      title: 'Link copied',
      description: `Public link for "${title}" copied to clipboard`,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteAdMutation.mutateAsync(deletingId);
      toast({ title: 'Ad deleted', description: 'Job advertisement has been removed' });
      setDeletingId(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete ad',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Advertisements</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Ad
        </Button>
      </div>

      {adsLoading ? (
        <p className="text-muted-foreground">Loading advertisements...</p>
      ) : ads.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No job ads yet</p>
            <p className="text-sm text-muted-foreground mt-2">Create job profiles first, then post advertisements</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad: any) => (
            <Card key={ad.id} className="hover:shadow-lg transition">
              <CardHeader>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <CardTitle className="text-base">{ad.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {ad.jobProfile?.title}
                    </p>
                  </div>
                  <Badge
                    variant={
                      ad.status === 'ACTIVE'
                        ? 'default'
                        : ad.status === 'DRAFT'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {ad.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {ad.salaryRangeMin && ad.salaryRangeMax && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Salary:</span> ${ad.salaryRangeMin.toLocaleString()} - ${ad.salaryRangeMax.toLocaleString()}
                  </p>
                )}
                {ad.location && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Location:</span> {ad.location}
                    {ad.isRemote && ' (Remote)'}
                  </p>
                )}
                <p className="text-sm">
                  <span className="text-muted-foreground">Applications:</span> {ad._count?.applicants || 0}
                </p>

                <div className="flex gap-2 pt-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleCopyLink(ad.publicToken, ad.title)}
                  >
                    {copiedId === ad.publicToken ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Share
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingAd(ad)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeletingId(ad.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Job Advertisement</DialogTitle>
          </DialogHeader>
          <JobAdForm
            orgId={orgId}
            jobProfiles={profiles}
            onSuccess={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAd} onOpenChange={(open) => !open && setEditingAd(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Job Advertisement</DialogTitle>
          </DialogHeader>
          {editingAd && (
            <JobAdForm
              orgId={orgId}
              jobProfiles={profiles}
              initialData={editingAd}
              onSuccess={() => setEditingAd(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Job Advertisement?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The advertisement will be removed and applicants will no longer be able to apply.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
