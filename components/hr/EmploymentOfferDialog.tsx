'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import axios from 'axios';
import { Plus } from 'lucide-react';

const offerSchema = z.object({
  jobProfileId: z.string().min(1, 'Job profile is required'),
  salaryStructureId: z.string().min(1, 'Salary structure is required'),
  assignedRole: z.enum(['ADMIN', 'MAINTAINER', 'MEMBER']).default('MEMBER'),
  joiningDate: z.string().optional(),
  expiresAt: z.string().optional(),
});

type OfferFormValues = z.infer<typeof offerSchema>;

interface EmploymentOfferDialogProps {
  orgId: string;
  applicantId: string;
  jobProfiles: Array<{ id: string; title: string }>;
  salaryStructures: Array<{ id: string; baseSalary: number }>;
  onSuccess?: () => void;
}

export function EmploymentOfferDialog({
  orgId,
  applicantId,
  jobProfiles,
  salaryStructures,
  onSuccess,
}: EmploymentOfferDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema) as any,
    defaultValues: {
      assignedRole: 'MEMBER',
    },
  });

  async function onSubmit(data: OfferFormValues) {
    try {
      await axios.post(
        `/api/orgs/${orgId}/hr/applicants/${applicantId}/offer`,
        data
      );
      toast({
        title: 'Success',
        description: 'Employment offer created successfully',
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as any).response?.data?.error || 'Failed to create offer',
        variant: 'destructive',
      });
    }
  }

  if (jobProfiles.length === 0 || salaryStructures.length === 0) {
    return (
      <Button size="sm" variant="outline" disabled title="Create job profile and salary structure first">
        <Plus className="h-4 w-4 mr-2" />
        Create Offer
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Create Offer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Employment Offer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="jobProfileId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Profile *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select job profile" />
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
              name="salaryStructureId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salary Structure *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select salary structure" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {salaryStructures.map((salary) => (
                        <SelectItem key={salary.id} value={salary.id}>
                          Base: ₹ {salary.baseSalary.toLocaleString('en-IN')}
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
              name="assignedRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Role in Organization</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="MAINTAINER">Maintainer</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="joiningDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Joining Date (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Offer Expiry Date (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Create Offer
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
