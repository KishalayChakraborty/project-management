'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useRecurringTasks, useCreateRecurringTask, useUpdateRecurringTask,
  useDeleteRecurringTask, useGenerateOccurrences, type RecurringTemplate,
} from '@/hooks/recurring-tasks/useRecurringTasks';
import { useUserRole, useProjectTeamMembers } from '@/hooks/organization';
import { FREQUENCY_LABELS } from '@/lib/recurring-shared';
import { Loading } from '@/components/ui/loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus, RefreshCw, Pencil, Trash2, ExternalLink,
  CheckCircle2, Clock, AlertCircle, PauseCircle,
} from 'lucide-react';
import { format } from 'date-fns';

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DONE: 'default', IN_PROGRESS: 'secondary', BLOCKED: 'destructive',
  REVIEW: 'default', TODO: 'outline', BACKLOG: 'outline',
};

const TASK_STATUS_ICON: Record<string, React.ElementType> = {
  DONE: CheckCircle2, IN_PROGRESS: Clock, BLOCKED: AlertCircle, REVIEW: Clock,
};

function OccurrenceRow({
  occ, orgId, role, router,
}: {
  occ: RecurringTemplate['occurrences'][0];
  orgId: string; role: string;
  router: ReturnType<typeof useRouter>;
}) {
  const Icon = TASK_STATUS_ICON[occ.task.status] ?? Clock;
  const taskRoute = role === 'ADMIN' || role === 'MAINTAINER'
    ? `/orgs/${orgId}/projects/${occ.task.id.split('-')[0]}/tasks/${occ.task.id}`
    : undefined;

  return (
    <div className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40 rounded-md group">
      <Icon className={`h-4 w-4 shrink-0 ${occ.task.status === 'DONE' ? 'text-green-500' : occ.task.status === 'BLOCKED' ? 'text-destructive' : 'text-muted-foreground'}`} />
      <div className="flex-1 min-w-0">
        <span className="font-medium">{format(new Date(occ.periodStart), 'MMM d, yyyy')}</span>
        <span className="text-muted-foreground mx-2">→</span>
        <span>{format(new Date(occ.periodEnd), 'MMM d, yyyy')}</span>
      </div>
      <Badge variant={STATUS_COLOR[occ.task.status] ?? 'outline'} className="text-xs">
        {occ.task.status.replace('_', ' ')}
      </Badge>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        onClick={() => {
          const route = role === 'ADMIN' || role === 'MAINTAINER'
            ? `/orgs/${orgId}/projects/${occ.task.id}/tasks/${occ.task.id}`
            : undefined;
          if (route) router.push(route);
        }}
        title="Open task"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── create / edit form ───────────────────────────────────────────────────────

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  type: z.enum(['BUG', 'FEATURE', 'TASK', 'CHANGE', 'RESEARCH', 'OTHER']),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']),
  assigneeUserId: z.string().uuid().optional().nullable(),
  reviewerUserId: z.string().uuid().optional().nullable(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

function RecurringTaskForm({
  orgId, projectId, initial, open, onClose,
}: {
  orgId: string; projectId: string;
  initial?: RecurringTemplate;
  open: boolean; onClose: () => void;
}) {
  const createTask = useCreateRecurringTask(orgId, projectId);
  const updateTask = useUpdateRecurringTask(orgId, projectId);
  const { data: membersData } = useProjectTeamMembers(orgId, projectId);
  const { toast } = useToast();
  const members = membersData?.members ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initial ? {
      title: initial.title,
      description: initial.description ?? '',
      type: initial.type as FormValues['type'],
      priority: initial.priority as FormValues['priority'],
      assigneeUserId: initial.assignee?.id ?? null,
      reviewerUserId: initial.reviewer?.id ?? null,
      frequency: initial.frequency as FormValues['frequency'],
      startDate: initial.startDate.slice(0, 10),
      endDate: initial.endDate ? initial.endDate.slice(0, 10) : '',
    } : {
      type: 'TASK', priority: 'P4', frequency: 'MONTHLY',
      startDate: new Date().toISOString().slice(0, 10),
      assigneeUserId: null, reviewerUserId: null,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (initial) {
        await updateTask.mutateAsync({ templateId: initial.id, ...values });
        toast({ title: 'Recurring task updated' });
      } else {
        await createTask.mutateAsync(values);
        toast({ title: 'Recurring task created — occurrences generated for past periods' });
      }
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast({ title: 'Error', description: e.response?.data?.error ?? 'Failed', variant: 'destructive' });
    }
  };

  const busy = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <div className="flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{initial ? 'Edit' : 'Create'} Recurring Task</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">

                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl><Input placeholder="e.g. Weekly Status Report" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Task instructions…" rows={2} {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-3 gap-3">
                  <FormField control={form.control} name="frequency" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repeat *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Object.entries(FREQUENCY_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(['P0','P1','P2','P3','P4'] as const).map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(['TASK','BUG','FEATURE','CHANGE','RESEARCH','OTHER'] as const).map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl><Input type="date" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value || null)} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="assigneeUserId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Assignee</FormLabel>
                      <Select onValueChange={v => field.onChange(v === 'none' ? null : v)} value={field.value ?? 'none'}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {members.map(m => (
                            <SelectItem key={m.user.id} value={m.user.id}>{m.user.name || m.user.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="reviewerUserId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Reviewer</FormLabel>
                      <Select onValueChange={v => field.onChange(v === 'none' ? null : v)} value={field.value ?? 'none'}>
                        <FormControl><SelectTrigger><SelectValue placeholder="No reviewer" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">No reviewer</SelectItem>
                          {members.map(m => (
                            <SelectItem key={m.user.id} value={m.user.id}>{m.user.name || m.user.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

              </div>
              <DialogFooter className="px-6 py-4 border-t shrink-0">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : initial ? 'Save Changes' : 'Create Recurring Task'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── template card ────────────────────────────────────────────────────────────

function TemplateCard({
  tmpl, orgId, role, router, onEdit, onDelete,
}: {
  tmpl: RecurringTemplate; orgId: string; role: string;
  router: ReturnType<typeof useRouter>;
  onEdit: () => void; onDelete: () => void;
}) {
  const generate = useGenerateOccurrences(orgId, tmpl.projectId);
  const updateTask = useUpdateRecurringTask(orgId, tmpl.projectId);
  const { toast } = useToast();
  const canEdit = role === 'ADMIN' || role === 'MAINTAINER';

  const done = tmpl.occurrences.filter(o => o.task.status === 'DONE').length;
  const total = tmpl.occurrences.length;

  async function handleGenerate() {
    const res = await generate.mutateAsync(tmpl.id);
    toast({ title: res.message });
  }

  async function handleToggleActive() {
    await updateTask.mutateAsync({ templateId: tmpl.id, isActive: !tmpl.isActive });
  }

  return (
    <Card className={!tmpl.isActive ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base">{tmpl.title}</h3>
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {FREQUENCY_LABELS[tmpl.frequency as keyof typeof FREQUENCY_LABELS] ?? tmpl.frequency}
              </Badge>
              <Badge variant={tmpl.priority === 'P0' ? 'destructive' : tmpl.priority === 'P1' ? 'default' : 'outline'} className="text-xs">
                {tmpl.priority}
              </Badge>
              {!tmpl.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Paused</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
              <span>From {format(new Date(tmpl.startDate), 'MMM d, yyyy')}</span>
              {tmpl.endDate && <span>Until {format(new Date(tmpl.endDate), 'MMM d, yyyy')}</span>}
              {tmpl.assignee && <span>Assignee: {tmpl.assignee.name || tmpl.assignee.email}</span>}
              <span className="text-green-600 font-medium">{done}/{total} done</span>
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleGenerate} disabled={generate.isPending}>
                <RefreshCw className={`h-3.5 w-3.5 ${generate.isPending ? 'animate-spin' : ''}`} />
                Sync
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              <div className="flex items-center gap-1 ml-1">
                <Switch checked={tmpl.isActive} onCheckedChange={handleToggleActive} />
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {tmpl.description && (
          <p className="text-sm text-muted-foreground mb-3">{tmpl.description}</p>
        )}
        <Accordion type="single" collapsible>
          <AccordionItem value="occurrences" className="border-0">
            <AccordionTrigger className="py-1 text-sm font-medium hover:no-underline">
              Occurrences ({total})
            </AccordionTrigger>
            <AccordionContent>
              {total === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-2">No occurrences yet.</p>
              ) : (
                <div className="space-y-0.5 max-h-64 overflow-y-auto">
                  {tmpl.occurrences.map((occ) => {
                    const taskUrl = role === 'ADMIN' || role === 'MAINTAINER'
                      ? `/orgs/${orgId}/projects/${tmpl.projectId}/tasks/${occ.task.id}`
                      : `/orgs/${orgId}/my-work/${tmpl.projectId}/tasks/${occ.task.id}`;
                    return (
                      <div key={occ.id} className="flex items-center gap-3 px-3 py-1.5 text-sm hover:bg-muted/40 rounded-md group">
                        <span className="text-muted-foreground w-28 shrink-0">{format(new Date(occ.periodStart), 'MMM d, yyyy')}</span>
                        <span className="flex-1 truncate text-xs">{occ.task.title}</span>
                        <Badge variant={STATUS_COLOR[occ.task.status] ?? 'outline'} className="text-xs shrink-0">
                          {occ.task.status.replace('_', ' ')}
                        </Badge>
                        <button
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                          onClick={() => router.push(taskUrl)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function RecurringTasksPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const { data: templates = [], isLoading } = useRecurringTasks(orgId, projectId);
  const { data: userRole } = useUserRole(orgId);
  const deleteTask = useDeleteRecurringTask(orgId, projectId);
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RecurringTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTemplate | null>(null);

  const canEdit = userRole === 'ADMIN' || userRole === 'MAINTAINER';
  const active = templates.filter(t => t.isActive);
  const paused = templates.filter(t => !t.isActive);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteTask.mutateAsync(deleteTarget.id);
      toast({ title: 'Recurring task deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-muted-foreground" />
            Recurring Tasks
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tasks that automatically generate on a schedule. Each occurrence is tracked individually.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Recurring Task
          </Button>
        )}
      </div>

      {isLoading ? (
        <Loading text="Loading recurring tasks…" />
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No recurring tasks yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create tasks that repeat daily, weekly, monthly, or on a custom schedule.
            </p>
            {canEdit && <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Recurring Task</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Active ({active.length})</h2>
              {active.map(t => (
                <TemplateCard key={t.id} tmpl={t} orgId={orgId} role={userRole ?? 'MEMBER'}
                  router={router} onEdit={() => setEditTarget(t)} onDelete={() => setDeleteTarget(t)} />
              ))}
            </div>
          )}
          {paused.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Paused ({paused.length})</h2>
              {paused.map(t => (
                <TemplateCard key={t.id} tmpl={t} orgId={orgId} role={userRole ?? 'MEMBER'}
                  router={router} onEdit={() => setEditTarget(t)} onDelete={() => setDeleteTarget(t)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create dialog */}
      <RecurringTaskForm
        orgId={orgId} projectId={projectId}
        open={createOpen} onClose={() => setCreateOpen(false)}
      />

      {/* Edit dialog */}
      {editTarget && (
        <RecurringTaskForm
          orgId={orgId} projectId={projectId}
          initial={editTarget}
          open={!!editTarget} onClose={() => setEditTarget(null)}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring task?</AlertDialogTitle>
            <AlertDialogDescription>
              "<strong>{deleteTarget?.title}</strong>" and all its occurrence records will be deleted.
              The individual task entries already created will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
