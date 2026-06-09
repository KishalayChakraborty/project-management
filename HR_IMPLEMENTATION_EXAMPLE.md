# HR Module - Detailed Implementation Example

This document shows how to implement each component type with a concrete example.

---

## Example 1: API Route - Job Advertisements List & Create

**File:** `/app/api/orgs/[orgId]/hr/job-ads/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const createJobAdSchema = z.object({
  jobProfileId: z.string().uuid('Invalid job profile ID'),
  title: z.string().min(1, 'Title is required'),
  salaryRangeMin: z.number().positive().optional(),
  salaryRangeMax: z.number().positive().optional(),
  location: z.string().optional(),
  isRemote: z.boolean().optional().default(false),
  deadline: z.string().datetime().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED']).optional().default('DRAFT'),
});

type CreateJobAdRequest = z.infer<typeof createJobAdSchema>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const status = request.nextUrl.searchParams.get('status');
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const where: any = { orgId };
    if (status && ['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED'].includes(status)) {
      where.status = status;
    }

    const [ads, total] = await Promise.all([
      prisma.jobAdvertisement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          jobProfile: { select: { id: true, title: true, level: true } },
          creator: { select: { id: true, name: true, email: true } },
          _count: { select: { applicants: true } },
        },
      }),
      prisma.jobAdvertisement.count({ where }),
    ]);

    return NextResponse.json({
      data: ads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    if ((error as any).message?.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const body = await request.json();
    const data = createJobAdSchema.parse(body);

    // Verify job profile exists and belongs to org
    const profile = await prisma.jobProfile.findUnique({
      where: { id: data.jobProfileId },
    });

    if (!profile || profile.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Job profile not found' },
        { status: 404 }
      );
    }

    // Generate unique public token
    const publicToken = randomBytes(16).toString('hex');

    const ad = await prisma.jobAdvertisement.create({
      data: {
        orgId,
        jobProfileId: data.jobProfileId,
        title: data.title,
        adContent: `Job Title: ${data.title}\n\nProfile: ${profile.title}`,
        aiProvider: 'TEMPLATE',
        publicToken,
        salaryRangeMin: data.salaryRangeMin,
        salaryRangeMax: data.salaryRangeMax,
        location: data.location,
        isRemote: data.isRemote,
        deadline: data.deadline ? new Date(data.deadline) : null,
        status: data.status,
        createdBy: user.id,
      },
      include: {
        jobProfile: { select: { id: true, title: true, level: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'JobAdvertisement',
      entityId: ad.id,
      action: 'CREATE',
    });

    return NextResponse.json({ data: ad }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    if ((error as any).message?.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    console.error('Error creating job ad:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Example 2: Hook - useJobAds

**File:** `/hooks/hr/useJobAds.ts`

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

interface JobAdsListParams {
  page?: number;
  limit?: number;
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
}

export function useJobAds(orgId: string, params?: JobAdsListParams) {
  return useQuery({
    queryKey: ['job-ads', orgId, params],
    queryFn: async () => {
      const { data } = await api.get(`/orgs/${orgId}/hr/job-ads`, { params });
      return data;
    },
    enabled: !!orgId,
  });
}

export function useJobAd(orgId: string, adId: string) {
  return useQuery({
    queryKey: ['job-ads', orgId, adId],
    queryFn: async () => {
      const { data } = await api.get(`/orgs/${orgId}/hr/job-ads/${adId}`);
      return data;
    },
    enabled: !!orgId && !!adId,
  });
}

export function useCreateJobAd(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post(`/orgs/${orgId}/hr/job-ads`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-ads', orgId] });
    },
  });
}

export function useUpdateJobAd(orgId: string, adId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.patch(`/orgs/${orgId}/hr/job-ads/${adId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-ads', orgId] });
      queryClient.invalidateQueries({ queryKey: ['job-ads', orgId, adId] });
    },
  });
}

export function useGenerateJobAd(orgId: string, adId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { provider: 'CLAUDE' | 'OPENAI' | 'GEMINI' | 'TEMPLATE'; modifications?: string }) => {
      const { data } = await api.post(`/orgs/${orgId}/hr/job-ads/${adId}/generate`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-ads', orgId, adId] });
    },
  });
}

export function useDeleteJobAd(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (adId: string) => {
      await api.delete(`/orgs/${orgId}/hr/job-ads/${adId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-ads', orgId] });
    },
  });
}
```

---

## Example 3: Component - JobAdForm

**File:** `/components/hr/JobAdForm.tsx`

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateJobAd, useUpdateJobAd } from '@/hooks/hr/useJobAds';
import { useToast } from '@/hooks/use-toast';

const jobAdSchema = z.object({
  jobProfileId: z.string().uuid('Invalid job profile'),
  title: z.string().min(1, 'Title is required'),
  salaryRangeMin: z.coerce.number().positive('Must be positive').optional(),
  salaryRangeMax: z.coerce.number().positive('Must be positive').optional(),
  location: z.string().optional(),
  isRemote: z.boolean().optional().default(false),
  deadline: z.string().optional(),
});

type JobAdFormValues = z.infer<typeof jobAdSchema>;

interface JobAdFormProps {
  orgId: string;
  jobProfiles: Array<{ id: string; title: string }>;
  initialData?: any;
  onSuccess?: () => void;
}

export function JobAdForm({
  orgId,
  jobProfiles,
  initialData,
  onSuccess,
}: JobAdFormProps) {
  const { toast } = useToast();
  const createMutation = useCreateJobAd(orgId);
  const updateMutation = useUpdateJobAd(orgId, initialData?.id);

  const form = useForm<JobAdFormValues>({
    resolver: zodResolver(jobAdSchema),
    defaultValues: initialData || {
      jobProfileId: '',
      title: '',
      isRemote: false,
    },
  });

  async function onSubmit(data: JobAdFormValues) {
    try {
      const mutation = initialData ? updateMutation : createMutation;
      await mutation.mutateAsync(data);
      toast({
        title: initialData ? 'Ad updated' : 'Ad created',
        description: 'Job advertisement saved successfully',
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as any).message || 'Failed to save ad',
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="jobProfileId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Profile</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select profile" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {jobProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Senior Engineer" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="salaryRangeMin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Salary</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="100000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="salaryRangeMax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Salary</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="150000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input {...field} placeholder="San Francisco, CA" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isRemote"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4"
                />
              </FormControl>
              <FormLabel>Remote Position</FormLabel>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Application Deadline (Optional)</FormLabel>
              <FormControl>
                <Input {...field} type="datetime-local" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className="w-full"
        >
          {createMutation.isPending || updateMutation.isPending
            ? initialData ? 'Updating...' : 'Creating...'
            : initialData ? 'Update Ad' : 'Create Ad'}
        </Button>
      </form>
    </Form>
  );
}
```

---

## Example 4: Page - Job Ads List

**File:** `/app/(main)/orgs/[orgId]/hr/job-ads/page.tsx`

```typescript
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useJobAds } from '@/hooks/hr/useJobAds';
import { useJobProfiles } from '@/hooks/hr/useJobProfiles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function JobAdsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const router = useRouter();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: adsData, isLoading: adsLoading } = useJobAds(orgId);
  const { data: profilesData } = useJobProfiles(orgId);

  const ads = adsData?.data || [];

  const handleCopyLink = (token: string, title: string) => {
    const link = `${window.location.origin}/apply/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(token);
    toast({
      title: 'Link copied',
      description: `Public link for "${title}" copied to clipboard`,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Advertisements</h1>
        <Button
          onClick={() => router.push(`/orgs/${orgId}/hr/job-ads/new`)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Ad
        </Button>
      </div>

      {adsLoading ? (
        <p className="text-muted-foreground">Loading advertisements...</p>
      ) : ads.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No job advertisements yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create a job ad to start posting positions
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad: any) => (
            <Card key={ad.id} className="hover:shadow-lg transition">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
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
                    <span className="text-muted-foreground">Salary:</span>{' '}
                    ${ad.salaryRangeMin.toLocaleString()} - ${ad.salaryRangeMax.toLocaleString()}
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

                <div className="flex gap-2 pt-2">
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
                    className="flex-1"
                    onClick={() => router.push(`/orgs/${orgId}/hr/job-ads/${ad.id}`)}
                  >
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Copy-Paste Pattern Summary

Use these patterns for all remaining implementation:

### API Route Template
```typescript
// Auth
const { orgId } = await params;
const user = await requireAuth();
await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

// Validation
const data = schema.parse(body);

// Database
const result = await prisma.modelName.create/update/delete({...});

// Audit
await createAuditLog({orgId, actorUserId: user.id, entityType, entityId, action});

// Response
return NextResponse.json({data}, {status: 201/200});
```

### Hook Template
```typescript
// Query
useQuery({
  queryKey: ['resource', orgId, params],
  queryFn: async () => (await api.get(...)).data,
  enabled: !!orgId,
})

// Mutation
useMutation({
  mutationFn: async (payload) => (await api.post(..., payload)).data,
  onSuccess: () => queryClient.invalidateQueries({queryKey: ['resource', orgId]})
})
```

### Component Template
```typescript
// Form
const form = useForm({resolver: zodResolver(schema), defaultValues})

// Mutation
const mutation = useMutation();

// Submit
async function onSubmit(data) {
  await mutation.mutateAsync(data);
  toast({title: 'Success'});
}

// Render
<Form><FormField><FormControl></FormControl></FormField></Form>
```

---

## Progress Checklist

```
API Routes:
- [x] job-profiles (GET, POST)
- [ ] job-profiles/[id] (GET, PATCH, DELETE)
- [ ] job-ads (GET, POST)
- [ ] job-ads/[id] (GET, PATCH, DELETE)
- [ ] job-ads/[id]/generate (POST)
- ... (continue for all 23 routes)

Hooks:
- [x] useJobProfiles
- [ ] useJobAds
- [ ] useApplicants
- ... (continue for all 11 hooks)

Components:
- [ ] JobProfileForm
- [ ] JobAdForm
- [ ] ApplicantPipeline
- ... (continue for all 15 components)

Pages:
- [x] dashboard
- [ ] job-profiles
- [ ] job-ads
- ... (continue for all 8 pages)
```

Each completed route/hook/component/page unlocks the next layer!
