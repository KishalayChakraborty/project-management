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
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import { Plus } from 'lucide-react';

const salarySchema = z.object({
  baseSalary: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().min(0, 'Base salary must be positive')
  ),
  variablePay: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().optional()
  ),
  signingBonus: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().optional()
  ),
  stockOptions: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().optional()
  ),
  annualLeave: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().optional()
  ),
  workingHoursPerWeek: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().optional()
  ),
  workLocation: z.string().optional(),
  specialConsiderations: z.string().optional(),
});

type SalaryFormValues = z.infer<typeof salarySchema>;

interface SalaryStructureDialogProps {
  orgId: string;
  applicantId: string;
  onSuccess?: () => void;
}

export function SalaryStructureDialog({
  orgId,
  applicantId,
  onSuccess,
}: SalaryStructureDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<SalaryFormValues>({
    resolver: zodResolver(salarySchema) as any,
    defaultValues: {
      baseSalary: undefined,
      variablePay: undefined,
      signingBonus: undefined,
    },
  });

  async function onSubmit(data: SalaryFormValues) {
    try {
      await axios.post(
        `/api/orgs/${orgId}/hr/applicants/${applicantId}/salary`,
        {
          ...data,
          currency: 'INR',
        }
      );
      toast({
        title: 'Success',
        description: 'Salary structure created successfully',
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as any).response?.data?.error || 'Failed to create salary structure',
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Create Salary Structure
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Salary Structure</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="baseSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Salary (₹ INR) *</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="600000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="variablePay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Pay / Bonus (₹ INR)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="100000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="signingBonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Signing Bonus (₹ INR)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="50000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stockOptions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Options / ESOPs</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="10000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="annualLeave"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Leave (days)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workingHoursPerWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Working Hours Per Week</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="40" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Location</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Bangalore, Karnataka" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialConsiderations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Considerations / Benefits</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Health insurance, relocation assistance, etc." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Create Salary Structure
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
