'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const interviewSchema = z.object({
  type: z.enum(['PHONE_SCREEN', 'VIDEO_CALL', 'IN_PERSON', 'TECHNICAL', 'HR_ROUND', 'PANEL', 'REFERENCE_CHECK']),
  scheduledAt: z.string().min(1, 'Schedule date is required'),
  durationMin: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().min(15).optional()
  ),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  agenda: z.string().optional(),
});

type InterviewFormValues = z.infer<typeof interviewSchema>;

interface InterviewScheduleDialogProps {
  orgId: string;
  applicantId: string;
  onSuccess?: () => void;
}

export function InterviewScheduleDialog({
  orgId,
  applicantId,
  onSuccess,
}: InterviewScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewSchema) as any,
    defaultValues: {
      type: 'PHONE_SCREEN',
      durationMin: 45,
    },
  });

  async function onSubmit(data: InterviewFormValues) {
    try {
      const tzOffset = new Date().getTimezoneOffset();
      await axios.post(
        `/api/orgs/${orgId}/hr/applicants/${applicantId}/interviews`,
        data
      );
      toast({
        title: 'Success',
        description: 'Interview scheduled successfully',
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as any).response?.data?.error || 'Failed to schedule interview',
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Interview
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interview Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['PHONE_SCREEN', 'VIDEO_CALL', 'IN_PERSON', 'TECHNICAL', 'HR_ROUND', 'PANEL', 'REFERENCE_CHECK'].map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, ' ')}
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
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule Date & Time</FormLabel>
                  <FormControl>
                    <Input {...field} type="datetime-local" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="durationMin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="15" placeholder="45" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meetingLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Link (if virtual)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://zoom.us/..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (if in-person)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Office, Room 123" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agenda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agenda / Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Interview agenda..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Schedule Interview
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
