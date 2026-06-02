'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useProjectDocs, useCreateDoc, useUpdateDoc, useDeleteDoc, type ProjectDoc } from '@/hooks/docs/useDocs';
import { useUserRole } from '@/hooks/organization';
import { Loading } from '@/components/ui/loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import {
  Link2,
  KeyRound,
  FileText,
  Plus,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  Trash2,
  ShieldAlert,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

type DocType = 'LINK' | 'CREDENTIAL' | 'NOTE';
type DocVisibility = 'MEMBERS' | 'ADMIN_ONLY';

const TYPE_META: Record<DocType, { label: string; icon: React.ElementType; color: string }> = {
  LINK:       { label: 'Link',       icon: Link2,    color: 'text-blue-500' },
  CREDENTIAL: { label: 'Credential', icon: KeyRound,  color: 'text-amber-500' },
  NOTE:       { label: 'Note',       icon: FileText,  color: 'text-green-600' },
};

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() =>
    toast({ title: `${label} copied to clipboard` })
  );
}

// ─── blank form state ────────────────────────────────────────────────────────

interface DocForm {
  title: string;
  type: DocType;
  visibility: DocVisibility;
  url: string;
  content: string;
  username: string;
  password: string;
  notes: string;
}

const BLANK: DocForm = {
  title: '', type: 'NOTE', visibility: 'MEMBERS',
  url: '', content: '', username: '', password: '', notes: '',
};

function formFromDoc(doc: ProjectDoc): DocForm {
  const meta = (doc.metadata ?? {}) as Record<string, string>;
  return {
    title: doc.title,
    type: doc.type,
    visibility: doc.visibility,
    url: doc.url ?? '',
    content: doc.content ?? '',
    username: meta.username ?? '',
    password: meta.password ?? '',
    notes: meta.notes ?? '',
  };
}

// ─── DocForm dialog ──────────────────────────────────────────────────────────

function DocFormDialog({
  open,
  onClose,
  initial,
  onSave,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  initial?: DocForm;
  onSave: (f: DocForm) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<DocForm>(initial ?? BLANK);
  const set = (k: keyof DocForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // reset when dialog reopens with new initial
  useState(() => { setForm(initial ?? BLANK); });

  const valid = form.title.trim().length > 0 &&
    (form.type !== 'LINK' || form.url.trim().length > 0) &&
    (form.type !== 'CREDENTIAL' || form.password.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit' : 'Add'} Resource</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v as DocType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LINK">Link</SelectItem>
                  <SelectItem value="CREDENTIAL">Credential</SelectItem>
                  <SelectItem value="NOTE">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Select value={form.visibility} onValueChange={(v) => set('visibility', v as DocVisibility)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBERS">All Members</SelectItem>
                  <SelectItem value="ADMIN_ONLY">Admin / Maintainer only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input placeholder="e.g. GitHub Repo, Staging URL…" value={form.title} onChange={(e) => set('title', e.target.value)} />
          </div>

          {form.type === 'LINK' && (
            <div className="space-y-1.5">
              <Label>URL *</Label>
              <Input placeholder="https://…" value={form.url} onChange={(e) => set('url', e.target.value)} />
            </div>
          )}

          {form.type === 'CREDENTIAL' && (
            <>
              <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Credentials are stored in the database. Use this for low-sensitivity secrets only. For high-security secrets, use a dedicated vault.</span>
              </div>
              <div className="space-y-1.5">
                <Label>Username / Email</Label>
                <Input placeholder="admin@example.com" value={form.username} onChange={(e) => set('username', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Password / Token *</Label>
                <Input type="password" placeholder="••••••••" value={form.password} onChange={(e) => set('password', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>URL (optional)</Label>
                <Input placeholder="https://…" value={form.url} onChange={(e) => set('url', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea placeholder="Additional notes…" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
              </div>
            </>
          )}

          {form.type === 'NOTE' && (
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea placeholder="Write your notes here…" value={form.content} onChange={(e) => set('content', e.target.value)} rows={5} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!valid || loading}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── credential value with reveal ────────────────────────────────────────────

function RevealField({ value, label }: { value: string; label: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded flex-1 truncate">
        {visible ? value : '••••••••••••'}
      </code>
      <button onClick={() => setVisible((v) => !v)} className="text-muted-foreground hover:text-foreground">
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button onClick={() => copyToClipboard(value, label)} className="text-muted-foreground hover:text-foreground">
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── single doc card ─────────────────────────────────────────────────────────

function DocCard({
  doc,
  canEdit,
  onEdit,
  onDelete,
}: {
  doc: ProjectDoc;
  canEdit: boolean;
  onEdit: (doc: ProjectDoc) => void;
  onDelete: (doc: ProjectDoc) => void;
}) {
  const meta = (doc.metadata ?? {}) as Record<string, string>;
  const { icon: Icon, color } = TYPE_META[doc.type];

  return (
    <div className="flex gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors group">
      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{doc.title}</span>
          {doc.visibility === 'ADMIN_ONLY' && (
            <Badge variant="outline" className="text-xs py-0 px-1.5 border-amber-300 text-amber-700">Admin only</Badge>
          )}
        </div>

        {/* LINK */}
        {doc.type === 'LINK' && doc.url && (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {doc.url.length > 60 ? doc.url.slice(0, 60) + '…' : doc.url}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        )}
        {doc.type === 'LINK' && doc.content && (
          <p className="text-xs text-muted-foreground mt-1">{doc.content}</p>
        )}

        {/* CREDENTIAL */}
        {doc.type === 'CREDENTIAL' && (
          <div className="mt-1 space-y-0.5">
            {meta.username && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-16 shrink-0">Username:</span>
                <code className="bg-muted px-1.5 py-0.5 rounded flex-1 truncate">{meta.username}</code>
                <button onClick={() => copyToClipboard(meta.username, 'Username')} className="hover:text-foreground">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {meta.password && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-16 shrink-0">Password:</span>
                <RevealField value={meta.password} label="Password" />
              </div>
            )}
            {doc.url && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-16 shrink-0">URL:</span>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 truncate">
                  {doc.url.length > 50 ? doc.url.slice(0, 50) + '…' : doc.url}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            )}
            {meta.notes && (
              <p className="text-xs text-muted-foreground mt-1 italic">{meta.notes}</p>
            )}
          </div>
        )}

        {/* NOTE */}
        {doc.type === 'NOTE' && doc.content && (
          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{doc.content}</p>
        )}
      </div>

      {canEdit && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(doc)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(doc)}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── section ─────────────────────────────────────────────────────────────────

function Section({
  type,
  docs,
  canEdit,
  onAdd,
  onEdit,
  onDelete,
}: {
  type: DocType;
  docs: ProjectDoc[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (doc: ProjectDoc) => void;
  onDelete: (doc: ProjectDoc) => void;
}) {
  const { label, icon: Icon, color } = TYPE_META[type];
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            {label}s
            {docs.length > 0 && <Badge variant="secondary" className="text-xs">{docs.length}</Badge>}
          </CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={onAdd}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add {label}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No {label.toLowerCase()}s yet.{canEdit ? ' Click "Add" to create one.' : ''}
          </p>
        ) : (
          <div className="space-y-1">
            {docs.map((doc) => (
              <DocCard key={doc.id} doc={doc} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function ProjectDocsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const { data: docs = [], isLoading } = useProjectDocs(orgId, projectId);
  const { data: userRole } = useUserRole(orgId);
  const createDoc = useCreateDoc(orgId, projectId);
  const updateDoc = useUpdateDoc(orgId, projectId);
  const deleteDoc = useDeleteDoc(orgId, projectId);

  const canEdit = userRole === 'ADMIN' || userRole === 'MAINTAINER';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectDoc | null>(null);
  const [defaultType, setDefaultType] = useState<DocType>('NOTE');
  const [deleteTarget, setDeleteTarget] = useState<ProjectDoc | null>(null);

  function openAdd(type: DocType) {
    setDefaultType(type);
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEdit(doc: ProjectDoc) {
    setEditTarget(doc);
    setDialogOpen(true);
  }

  async function handleSave(form: DocForm) {
    const payload = {
      title: form.title,
      type: form.type,
      visibility: form.visibility,
      url: form.url || undefined,
      content: form.content || undefined,
      metadata: form.type === 'CREDENTIAL'
        ? { username: form.username, password: form.password, notes: form.notes }
        : undefined,
    };

    try {
      if (editTarget) {
        await updateDoc.mutateAsync({ docId: editTarget.id, ...payload });
        toast({ title: 'Resource updated' });
      } else {
        await createDoc.mutateAsync(payload);
        toast({ title: 'Resource added' });
      }
      setDialogOpen(false);
      setEditTarget(null);
    } catch {
      toast({ title: 'Failed to save resource', variant: 'destructive' });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDoc.mutateAsync(deleteTarget.id);
      toast({ title: 'Resource deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }

  const byType = (type: DocType) => docs.filter((d) => d.type === type);
  const isSaving = createDoc.isPending || updateDoc.isPending;

  const formInitial = editTarget ? formFromDoc(editTarget) : { ...BLANK, type: defaultType };

  if (isLoading) return <Loading text="Loading resources…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Project Resources</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Links, credentials, and notes for this project. Credentials are visible to admins and maintainers only by default.
        </p>
      </div>

      <Section type="LINK"       docs={byType('LINK')}       canEdit={canEdit} onAdd={() => openAdd('LINK')}       onEdit={openEdit} onDelete={setDeleteTarget} />
      <Section type="CREDENTIAL" docs={byType('CREDENTIAL')} canEdit={canEdit} onAdd={() => openAdd('CREDENTIAL')} onEdit={openEdit} onDelete={setDeleteTarget} />
      <Section type="NOTE"       docs={byType('NOTE')}       canEdit={canEdit} onAdd={() => openAdd('NOTE')}       onEdit={openEdit} onDelete={setDeleteTarget} />

      {dialogOpen && (
        <DocFormDialog
          key={editTarget?.id ?? 'new'}
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditTarget(null); }}
          initial={formInitial}
          onSave={handleSave}
          loading={isSaving}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resource?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
