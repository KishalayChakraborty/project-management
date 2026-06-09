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
import { useCreateJobProfile, useUpdateJobProfile } from '@/hooks/hr/useJobProfiles';
import { X } from 'lucide-react';

const jobProfileSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  code: z.string().min(1, 'Code is required'),
  department: z.string().optional(),
  level: z.enum(['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'DIRECTOR', 'VP', 'C_LEVEL']),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']),
  description: z.string().optional(),
  responsibilities: z.array(z.string()),
  requirements: z.array(z.string()),
  niceToHave: z.array(z.string()),
  minExperienceYears: z.preprocess(val => val === '' || val === null ? undefined : val, z.coerce.number().int().optional()),
  maxExperienceYears: z.preprocess(val => val === '' || val === null ? undefined : val, z.coerce.number().int().optional()),
  skills: z.array(z.string()),
  educationLevel: z.string().optional(),
});

type JobProfileFormValues = z.infer<typeof jobProfileSchema>;

interface JobProfileFormProps {
  orgId: string;
  initialData?: any;
  onSuccess?: () => void;
}

export function JobProfileForm({ orgId, initialData, onSuccess }: JobProfileFormProps) {
  const { toast } = useToast();
  const createMutation = useCreateJobProfile(orgId);
  const updateMutation = useUpdateJobProfile(orgId, initialData?.id);

  const form = useForm<JobProfileFormValues>({
    resolver: zodResolver(jobProfileSchema) as any,
    defaultValues: initialData || {
      title: '',
      code: '',
      level: 'MID',
      employmentType: 'FULL_TIME',
      responsibilities: [],
      requirements: [],
      niceToHave: [],
      skills: [],
      minExperienceYears: undefined,
      maxExperienceYears: undefined,
      educationLevel: '',
    },
  });

  async function onSubmit(data: JobProfileFormValues) {
    try {
      const mutation = initialData ? updateMutation : createMutation;
      await mutation.mutateAsync(data);
      toast({
        title: initialData ? 'Profile updated' : 'Profile created',
        description: 'Job profile saved successfully',
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as any).message || 'Failed to save profile',
        variant: 'destructive',
      });
    }
  }

  const addToArray = (field: 'responsibilities' | 'requirements' | 'niceToHave' | 'skills', value: string) => {
    if (!value) return;
    const current = form.getValues(field) || [];
    form.setValue(field, [...current, value]);
  };

  const removeFromArray = (field: 'responsibilities' | 'requirements' | 'niceToHave' | 'skills', index: number) => {
    const current = form.getValues(field) || [];
    form.setValue(field, current.filter((_, i) => i !== index));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Senior Software Engineer" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="SE-001" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'DIRECTOR', 'VP', 'C_LEVEL'].map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
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
            name="employmentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employment Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Job description..." rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="responsibilities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsibilities</FormLabel>
              <div className="space-y-2">
                {field.value?.map((resp, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted p-2 rounded">
                    <span className="text-sm">{resp}</span>
                    <button
                      type="button"
                      onClick={() => removeFromArray('responsibilities', idx)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add responsibility..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('responsibilities', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="requirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requirements</FormLabel>
              <div className="space-y-2">
                {field.value?.map((req, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted p-2 rounded">
                    <span className="text-sm">{req}</span>
                    <button
                      type="button"
                      onClick={() => removeFromArray('requirements', idx)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add requirement..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('requirements', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="skills"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Required Skills</FormLabel>
              <div className="space-y-2">
                {field.value?.map((skill, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted p-2 rounded">
                    <span className="text-sm">{skill}</span>
                    <button
                      type="button"
                      onClick={() => removeFromArray('skills', idx)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add skill..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('skills', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="minExperienceYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Experience (Years)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min="0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxExperienceYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Experience (Years)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min="0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full">
          {createMutation.isPending || updateMutation.isPending
            ? initialData ? 'Updating...' : 'Creating...'
            : initialData ? 'Update Profile' : 'Create Profile'}
        </Button>
      </form>
    </Form>
  );
}
