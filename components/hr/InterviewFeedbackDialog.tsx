'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import { MessageSquare } from 'lucide-react';

const feedbackSchema = z.object({
  recommendation: z.enum(['STRONG_HIRE', 'HIRE', 'NEUTRAL', 'NO_HIRE', 'STRONG_NO_HIRE']),
  technicalScore: z.number().min(1).max(10).optional(),
  communicationScore: z.number().min(1).max(10).optional(),
  problemSolvingScore: z.number().min(1).max(10).optional(),
  cultureScore: z.number().min(1).max(10).optional(),
  overallScore: z.number().min(1).max(10),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  notes: z.string().optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

interface InterviewFeedbackDialogProps {
  orgId: string;
  applicantId: string;
  roundId: string;
  onSuccess?: () => void;
}

export function InterviewFeedbackDialog({
  orgId,
  applicantId,
  roundId,
  onSuccess,
}: InterviewFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [technicalScore, setTechnicalScore] = useState(5);
  const [communicationScore, setCommunicationScore] = useState(5);
  const [problemSolvingScore, setProblemSolvingScore] = useState(5);
  const [cultureScore, setCultureScore] = useState(5);
  const [overallScore, setOverallScore] = useState(5);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema) as any,
    defaultValues: {
      recommendation: 'HIRE',
      overallScore: 5,
    },
  });

  async function onSubmit(data: FeedbackFormValues) {
    try {
      await axios.post(
        `/api/orgs/${orgId}/hr/applicants/${applicantId}/interviews/${roundId}/feedback`,
        {
          ...data,
          technicalScore: technicalScore || undefined,
          communicationScore: communicationScore || undefined,
          problemSolvingScore: problemSolvingScore || undefined,
          cultureScore: cultureScore || undefined,
          overallScore: overallScore,
        }
      );
      toast({
        title: 'Success',
        description: 'Interview feedback submitted',
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as any).response?.data?.error || 'Failed to submit feedback',
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Add Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Interview Feedback</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recommendation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recommendation *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="STRONG_HIRE">Strong Hire</SelectItem>
                      <SelectItem value="HIRE">Hire</SelectItem>
                      <SelectItem value="NEUTRAL">Neutral</SelectItem>
                      <SelectItem value="NO_HIRE">No Hire</SelectItem>
                      <SelectItem value="STRONG_NO_HIRE">Strong No Hire</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="technicalScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technical Score: {technicalScore}/10</FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[technicalScore]}
                        onValueChange={(val) => setTechnicalScore(val[0])}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="communicationScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Communication Score: {communicationScore}/10</FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[communicationScore]}
                        onValueChange={(val) => setCommunicationScore(val[0])}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="problemSolvingScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Problem Solving Score: {problemSolvingScore}/10</FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[problemSolvingScore]}
                        onValueChange={(val) => setProblemSolvingScore(val[0])}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cultureScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Culture Fit Score: {cultureScore}/10</FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[cultureScore]}
                        onValueChange={(val) => setCultureScore(val[0])}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="overallScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overall Score: {overallScore}/10 *</FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[overallScore]}
                        onValueChange={(val) => setOverallScore(val[0])}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="strengths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Strengths</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="What went well..." rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weaknesses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Areas for Improvement</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="What could be improved..." rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>General Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional comments..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Submit Feedback
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
