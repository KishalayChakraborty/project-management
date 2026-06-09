'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useJobProfiles, useDeleteJobProfile } from '@/hooks/hr/useJobProfiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
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
import { JobProfileForm } from '@/components/hr/JobProfileForm';
import { useToast } from '@/components/ui/use-toast';

export default function JobProfilesPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: profilesData, isLoading } = useJobProfiles(orgId);
  const deleteMutation = useDeleteJobProfile(orgId);

  const profiles = profilesData?.data || [];

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast({ title: 'Profile deleted', description: 'Job profile has been removed' });
      setDeletingId(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete profile',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Profiles</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Profile
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading profiles...</p>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No job profiles yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first job profile to define roles and requirements
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {profiles.map((profile: any) => (
            <Card key={profile.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{profile.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {profile.code} • {profile.level} • {profile.employmentType}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingProfile(profile)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeletingId(profile.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {profile.description && <p className="text-sm">{profile.description}</p>}
                {profile.requirements && Array.isArray(profile.requirements) && profile.requirements.length > 0 && (
                  <div>
                    <p className="text-sm font-medium">Requirements:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {profile.requirements.slice(0, 3).map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                      {profile.requirements.length > 3 && <li>+{profile.requirements.length - 3} more</li>}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Job Profile</DialogTitle>
          </DialogHeader>
          <JobProfileForm
            orgId={orgId}
            onSuccess={() => {
              setIsCreateOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Profile</DialogTitle>
          </DialogHeader>
          {editingProfile && (
            <JobProfileForm
              orgId={orgId}
              initialData={editingProfile}
              onSuccess={() => {
                setEditingProfile(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Job Profile?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. All associated job advertisements will also be affected.
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
