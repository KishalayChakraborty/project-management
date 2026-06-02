'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateVirtualMember } from '@/hooks/organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { UserX } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  role: z.enum(['MAINTAINER', 'MEMBER']),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateVirtualMemberDialog({ orgId, open, onOpenChange }: Props) {
  const createVirtual = useCreateVirtualMember(orgId);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', role: 'MEMBER' },
  });

  const { reset } = form;

  useEffect(() => {
    if (open) reset({ name: '', email: '', role: 'MEMBER' });
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await createVirtual.mutateAsync({
        name: values.name,
        email: values.email || undefined,
        role: values.role,
      });
      toast({ title: 'Virtual member created', description: `${values.name} has been added to the organisation.` });
      onOpenChange(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast({ title: 'Error', description: e.response?.data?.error ?? 'Failed to create virtual member', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-muted-foreground" />
            Create Virtual Member
          </DialogTitle>
          <DialogDescription>
            Add a person who doesn't have an account yet. You can assign them to tasks and teams
            immediately, and merge this placeholder with their real account later.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email <span className="text-muted-foreground font-normal">(optional — used for future merge)</span></FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="MAINTAINER">Maintainer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              Virtual members <strong>cannot log in</strong>. They exist only for assignment and tracking purposes until merged with a real account.
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createVirtual.isPending}>
                {createVirtual.isPending ? 'Creating…' : 'Create Virtual Member'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
