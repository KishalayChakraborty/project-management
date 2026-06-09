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
import { useToast } from '@/components/ui/use-toast';
import { useCreateJobAd, useUpdateJobAd } from '@/hooks/hr/useJobAds';

const jobAdSchema = z.object({
  jobProfileId: z.string().min(1, 'Job profile is required'),
  title: z.string().min(1, 'Title is required'),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED']),
  salaryRangeMin: z.preprocess(val => val === '' || val === null ? undefined : val, z.coerce.number().optional()),
  salaryRangeMax: z.preprocess(val => val === '' || val === null ? undefined : val, z.coerce.number().optional()),
  location: z.preprocess(val => val === '' || val === null ? undefined : val, z.string().optional()),
  isRemote: z.boolean(),
  deadline: z.preprocess(val => val === '' || val === null ? undefined : val, z.string().optional()),
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
    resolver: zodResolver(jobAdSchema) as any,
    defaultValues: initialData || {
      jobProfileId: '',
      title: '',
      status: 'DRAFT',
      isRemote: false,
      salaryRangeMin: '',
      salaryRangeMax: '',
      location: '',
      deadline: '',
      currency: 'INR',
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
              <FormLabel>Job Title (optional - defaults to profile title)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Senior Engineer" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED'].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <FormLabel>Min Salary (₹ INR)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="600000" />
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
                <FormLabel>Max Salary (₹ INR)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="1200000" />
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
                <Input {...field} placeholder="Bangalore, Karnataka" />
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
