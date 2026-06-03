'use client';

import { useEffect, useState } from 'react';
import { useVirtualMemberProfile, useUpdateVirtualMemberProfile } from '@/hooks/organization';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/components/ui/use-toast';
import { Loading } from '@/components/ui/loading';
import {
  Eye, EyeOff, Copy, Phone, MapPin, Github, Linkedin,
  Briefcase, GraduationCap, CreditCard, User, Calendar, Building2, Link2,
  Shield,
} from 'lucide-react';
import {
  VISIBILITY_LABELS, DEFAULT_FIELD_VISIBILITY, MIN_VISIBILITY,
  type FieldVisibility, type ProfileField,
} from '@/lib/field-visibility';

// ─── helpers ─────────────────────────────────────────────────────────────────

const VISIBILITY_OPTIONS: FieldVisibility[] = ['ALL_MEMBERS', 'TEAM_MEMBERS', 'SELF_ADMIN', 'ADMIN_ONLY'];

const VISIBILITY_RANK: Record<FieldVisibility, number> = {
  ALL_MEMBERS: 0, TEAM_MEMBERS: 1, SELF_ADMIN: 2, ADMIN_ONLY: 3,
};

const VISIBILITY_COLOR: Record<FieldVisibility, string> = {
  ALL_MEMBERS:  'bg-green-100 text-green-800 border-green-300',
  TEAM_MEMBERS: 'bg-blue-100 text-blue-800 border-blue-300',
  SELF_ADMIN:   'bg-amber-100 text-amber-800 border-amber-300',
  ADMIN_ONLY:   'bg-red-100 text-red-800 border-red-300',
};

function copyToClipboard(value: string, label: string, toast: ReturnType<typeof useToast>['toast']) {
  navigator.clipboard.writeText(value).then(() => toast({ title: `${label} copied` }));
}

function RevealField({ value, label }: { value: string; label: string }) {
  const [show, setShow] = useState(false);
  const { toast } = useToast();
  return (
    <div className="flex items-center gap-1">
      <code className="flex-1 text-xs bg-muted px-2 py-1 rounded truncate">{show ? value : '••••••••••••'}</code>
      <button onClick={() => setShow(s => !s)} className="text-muted-foreground hover:text-foreground p-1">
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button onClick={() => copyToClipboard(value, label, toast)} className="text-muted-foreground hover:text-foreground p-1">
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Compact visibility badge + select inline next to a field label */
function VisibilityPicker({
  field,
  value,
  onChange,
}: {
  field: ProfileField;
  value: FieldVisibility;
  onChange: (v: FieldVisibility) => void;
}) {
  const min = MIN_VISIBILITY[field];
  const minRank = min ? VISIBILITY_RANK[min] : 0;
  const allowed = VISIBILITY_OPTIONS.filter(v => VISIBILITY_RANK[v] >= minRank);

  return (
    <Select value={value} onValueChange={v => onChange(v as FieldVisibility)}>
      <SelectTrigger className="h-5 text-xs border-0 p-0 shadow-none focus:ring-0 w-auto gap-1 ml-auto">
        <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${VISIBILITY_COLOR[value]}`}>
          {value === 'ALL_MEMBERS' ? 'All' : value === 'TEAM_MEMBERS' ? 'Team' : value === 'SELF_ADMIN' ? 'Self+Admin' : 'Admin only'}
        </span>
      </SelectTrigger>
      <SelectContent align="end">
        {allowed.map(v => (
          <SelectItem key={v} value={v}>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${VISIBILITY_COLOR[v]}`}>
              {VISIBILITY_LABELS[v]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  phone: string; whatsapp: string; address: string;
  githubUrl: string; linkedinUrl: string;
  dob: string; parentOrg: string; designation: string;
  education: string; introducedBy: string;
  bankAccount: string; upiId: string;
}

const BLANK: FormState = {
  name: '', phone: '', whatsapp: '', address: '',
  githubUrl: '', linkedinUrl: '',
  dob: '', parentOrg: '', designation: '',
  education: '', introducedBy: '',
  bankAccount: '', upiId: '',
};

interface Props {
  orgId: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VirtualMemberProfileDialog({ orgId, userId, open, onOpenChange }: Props) {
  const { data: user, isLoading } = useVirtualMemberProfile(orgId, open ? userId : null);
  const update = useUpdateVirtualMemberProfile(orgId, userId);
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(BLANK);
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(false);
  const [visibility, setVisibility] = useState<Record<ProfileField, FieldVisibility>>(
    { ...DEFAULT_FIELD_VISIBILITY }
  );

  useEffect(() => {
    if (!user) return;
    const p = user.virtualProfile as Record<string, unknown> | null;
    const savedVis = (p?.fieldVisibility ?? {}) as Partial<Record<ProfileField, FieldVisibility>>;

    setForm({
      name: user.name ?? '',
      phone: (p?.phone as string) ?? '',
      whatsapp: (p?.whatsapp as string) ?? '',
      address: (p?.address as string) ?? '',
      githubUrl: (p?.githubUrl as string) ?? '',
      linkedinUrl: (p?.linkedinUrl as string) ?? '',
      dob: p?.dob ? (p.dob as string).slice(0, 10) : '',
      parentOrg: (p?.parentOrg as string) ?? '',
      designation: (p?.designation as string) ?? '',
      education: (p?.education as string) ?? '',
      introducedBy: (p?.introducedBy as string) ?? '',
      bankAccount: (p?.bankAccount as string) ?? '',
      upiId: (p?.upiId as string) ?? '',
    });

    const merged = { ...DEFAULT_FIELD_VISIBILITY, ...savedVis };
    setVisibility(merged);
    const wa = (p?.whatsapp as string) ?? '';
    const ph = (p?.phone as string) ?? '';
    setWhatsappSameAsPhone(!wa || wa === ph);
  }, [user]);

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setVis = (field: ProfileField, v: FieldVisibility) => setVisibility(prev => ({ ...prev, [field]: v }));

  async function handleSave() {
    try {
      await update.mutateAsync({
        name: form.name || undefined,
        phone: form.phone || null,
        whatsapp: whatsappSameAsPhone ? (form.phone || null) : (form.whatsapp || null),
        address: form.address || null,
        githubUrl: form.githubUrl || null,
        linkedinUrl: form.linkedinUrl || null,
        dob: form.dob || null,
        parentOrg: form.parentOrg || null,
        designation: form.designation || null,
        education: form.education || null,
        introducedBy: form.introducedBy || null,
        bankAccount: form.bankAccount || null,
        upiId: form.upiId || null,
        fieldVisibility: visibility,
      });
      toast({ title: 'Profile saved' });
      onOpenChange(false);
    } catch {
      toast({ title: 'Failed to save profile', variant: 'destructive' });
    }
  }

  // Helper: label row with visibility picker
  const FieldLabel = ({ label, field }: { label: string; field: ProfileField }) => (
    <div className="flex items-center gap-2 mb-1.5">
      <Label className="text-sm">{label}</Label>
      <VisibilityPicker field={field} value={visibility[field]} onChange={v => setVis(field, v)} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <div className="flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 pt-5 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <DialogTitle>{isLoading ? 'Loading…' : (user?.name || 'Virtual Member')} — Profile</DialogTitle>
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">Virtual</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Each field has a visibility setting controlling who can see it. Click the coloured badge next to a label to change it.
            </p>
          </DialogHeader>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-10"><Loading /></div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 pb-4">
              <Accordion type="multiple" defaultValue={['basic', 'contact', 'professional']} className="space-y-2">

                {/* ── Basic ── */}
                <AccordionItem value="basic" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium py-3">
                    <span className="flex items-center gap-2"><User className="h-4 w-4" />Basic Info</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" className="mt-1.5" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel label="Date of Birth" field="dob" />
                        <Input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
                      </div>
                      <div>
                        <FieldLabel label="Introduced By" field="introducedBy" />
                        <Input value={form.introducedBy} onChange={e => set('introducedBy', e.target.value)} placeholder="Name / email of referrer" />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* ── Contact ── */}
                <AccordionItem value="contact" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium py-3">
                    <span className="flex items-center gap-2"><Phone className="h-4 w-4" />Contact</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel label="Phone" field="phone" />
                        <Input value={form.phone} onChange={e => {
                          set('phone', e.target.value);
                          if (whatsappSameAsPhone) set('whatsapp', e.target.value);
                        }} placeholder="+91 98765 43210" />
                      </div>
                      <div>
                        <FieldLabel label="WhatsApp" field="whatsapp" />
                        <div className="flex items-center gap-2 mb-1.5">
                          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                            <input type="checkbox" checked={whatsappSameAsPhone} onChange={e => {
                              setWhatsappSameAsPhone(e.target.checked);
                              if (e.target.checked) set('whatsapp', form.phone);
                            }} className="h-3 w-3" />
                            Same as phone
                          </label>
                        </div>
                        <Input
                          value={whatsappSameAsPhone ? form.phone : form.whatsapp}
                          onChange={e => set('whatsapp', e.target.value)}
                          disabled={whatsappSameAsPhone}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel label="Address" field="address" />
                      <Textarea value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street, City, State, Country" rows={2} />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* ── Professional ── */}
                <AccordionItem value="professional" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium py-3">
                    <span className="flex items-center gap-2"><Briefcase className="h-4 w-4" />Professional</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel label="Designation / Role" field="designation" />
                        <Input value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="Software Engineer" />
                      </div>
                      <div>
                        <FieldLabel label="External Organisation" field="parentOrg" />
                        <Input value={form.parentOrg} onChange={e => set('parentOrg', e.target.value)} placeholder="Acme Corp" />
                      </div>
                      <div className="col-span-2">
                        <FieldLabel label="Educational Qualification" field="education" />
                        <Input value={form.education} onChange={e => set('education', e.target.value)} placeholder="B.Tech Computer Science" />
                      </div>
                      <div>
                        <FieldLabel label="GitHub" field="githubUrl" />
                        <Input value={form.githubUrl} onChange={e => set('githubUrl', e.target.value)} placeholder="https://github.com/…" />
                      </div>
                      <div>
                        <FieldLabel label="LinkedIn" field="linkedinUrl" />
                        <Input value={form.linkedinUrl} onChange={e => set('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/…" />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* ── Financial ── */}
                <AccordionItem value="financial" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium py-3">
                    <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Financial <span className="text-xs text-muted-foreground font-normal ml-1">(min: Self+Admin)</span></span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-4">
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                      Financial fields are stored in plain text. Bank & UPI fields cannot be set below <strong>Self+Admin</strong> visibility.
                    </div>
                    <div>
                      <FieldLabel label="Bank Account Details" field="bankAccount" />
                      {user?.virtualProfile && typeof user.virtualProfile === 'object' && 'bankAccount' in user.virtualProfile && (user.virtualProfile as any).bankAccount ? (
                        <RevealField value={String((user.virtualProfile as any).bankAccount)} label="Bank account" />
                      ) : null}
                      <Textarea value={form.bankAccount} onChange={e => set('bankAccount', e.target.value)} placeholder="Bank, Account No, IFSC…" rows={2} className="mt-1" />
                    </div>
                    <div>
                      <FieldLabel label="UPI ID / Link" field="upiId" />
                      {user?.virtualProfile && typeof user.virtualProfile === 'object' && 'upiId' in user.virtualProfile && (user.virtualProfile as any).upiId ? (
                        <RevealField value={String((user.virtualProfile as any).upiId)} label="UPI ID" />
                      ) : null}
                      <Input value={form.upiId} onChange={e => set('upiId', e.target.value)} placeholder="name@upi" className="mt-1" />
                    </div>
                  </AccordionContent>
                </AccordionItem>

              </Accordion>
            </div>
          )}

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={update.isPending || isLoading}>
              {update.isPending ? 'Saving…' : 'Save Profile'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
