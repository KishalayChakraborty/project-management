'use client';

import { useEffect, useState } from 'react';
import { useVirtualMemberProfile, useUpdateVirtualMemberProfile } from '@/hooks/organization';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loading } from '@/components/ui/loading';
import {
  Eye, EyeOff, Copy, Phone, MapPin, Github, Linkedin,
  Briefcase, GraduationCap, CreditCard, User, Calendar,
  Building2, Link2,
} from 'lucide-react';

function copyToClipboard(value: string, label: string, toast: ReturnType<typeof useToast>['toast']) {
  navigator.clipboard.writeText(value).then(() => toast({ title: `${label} copied` }));
}

function RevealField({ value, label }: { value: string; label: string }) {
  const [show, setShow] = useState(false);
  const { toast } = useToast();
  return (
    <div className="flex items-center gap-1">
      <code className="flex-1 text-xs bg-muted px-2 py-1 rounded truncate">
        {show ? value : '••••••••••••'}
      </code>
      <button onClick={() => setShow((s) => !s)} className="text-muted-foreground hover:text-foreground p-1">
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button onClick={() => copyToClipboard(value, label, toast)} className="text-muted-foreground hover:text-foreground p-1">
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

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

  useEffect(() => {
    if (!user) return;
    const p = user.virtualProfile;
    const f: FormState = {
      name: user.name ?? '',
      phone: p?.phone ?? '',
      whatsapp: p?.whatsapp ?? '',
      address: p?.address ?? '',
      githubUrl: p?.githubUrl ?? '',
      linkedinUrl: p?.linkedinUrl ?? '',
      dob: p?.dob ? p.dob.slice(0, 10) : '',
      parentOrg: p?.parentOrg ?? '',
      designation: p?.designation ?? '',
      education: p?.education ?? '',
      introducedBy: p?.introducedBy ?? '',
      bankAccount: p?.bankAccount ?? '',
      upiId: p?.upiId ?? '',
    };
    setForm(f);
    setWhatsappSameAsPhone(!p?.whatsapp || p.whatsapp === p?.phone);
  }, [user]);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
      });
      toast({ title: 'Profile saved' });
      onOpenChange(false);
    } catch {
      toast({ title: 'Failed to save profile', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <div className="flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <div className="flex items-center gap-2">
              <DialogTitle>{isLoading ? 'Loading…' : (user?.name || 'Virtual Member')} — Profile</DialogTitle>
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">Virtual</Badge>
            </div>
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
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label>Full Name</Label>
                        <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Jane Smith" />
                      </div>
                      <div className="space-y-1">
                        <Label>Date of Birth</Label>
                        <Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Introduced By</Label>
                        <Input value={form.introducedBy} onChange={(e) => set('introducedBy', e.target.value)} placeholder="Name or email of referrer" />
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
                      <div className="space-y-1">
                        <Label>Phone</Label>
                        <Input
                          value={form.phone}
                          onChange={(e) => {
                            set('phone', e.target.value);
                            if (whatsappSameAsPhone) set('whatsapp', e.target.value);
                          }}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                          WhatsApp
                          <label className="flex items-center gap-1 text-xs text-muted-foreground font-normal cursor-pointer">
                            <input
                              type="checkbox"
                              checked={whatsappSameAsPhone}
                              onChange={(e) => {
                                setWhatsappSameAsPhone(e.target.checked);
                                if (e.target.checked) set('whatsapp', form.phone);
                              }}
                            />
                            Same as phone
                          </label>
                        </Label>
                        <Input
                          value={whatsappSameAsPhone ? form.phone : form.whatsapp}
                          onChange={(e) => set('whatsapp', e.target.value)}
                          disabled={whatsappSameAsPhone}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Address</Label>
                        <Textarea
                          value={form.address}
                          onChange={(e) => set('address', e.target.value)}
                          placeholder="Street, City, State, Country"
                          rows={2}
                        />
                      </div>
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
                      <div className="space-y-1">
                        <Label>Designation / Role</Label>
                        <Input value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="Software Engineer" />
                      </div>
                      <div className="space-y-1">
                        <Label className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />External Organisation</Label>
                        <Input value={form.parentOrg} onChange={(e) => set('parentOrg', e.target.value)} placeholder="Acme Corp" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />Educational Qualification</Label>
                        <Input value={form.education} onChange={(e) => set('education', e.target.value)} placeholder="B.Tech Computer Science, IIT Delhi" />
                      </div>
                      <div className="space-y-1">
                        <Label className="flex items-center gap-1"><Github className="h-3.5 w-3.5" />GitHub</Label>
                        <Input value={form.githubUrl} onChange={(e) => set('githubUrl', e.target.value)} placeholder="https://github.com/username" />
                      </div>
                      <div className="space-y-1">
                        <Label className="flex items-center gap-1"><Linkedin className="h-3.5 w-3.5" />LinkedIn</Label>
                        <Input value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/username" />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* ── Financial ── */}
                <AccordionItem value="financial" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium py-3">
                    <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Financial <span className="text-xs text-muted-foreground font-normal ml-1">(Admin only — handle with care)</span></span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-4">
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                      Financial data is stored in plain text. Only enter what is strictly necessary and ensure your server and database access is secured.
                    </div>
                    <div className="space-y-1">
                      <Label>Bank Account Details</Label>
                      {user?.virtualProfile?.bankAccount ? (
                        <RevealField value={user.virtualProfile.bankAccount} label="Bank account" />
                      ) : null}
                      <Textarea
                        value={form.bankAccount}
                        onChange={(e) => set('bankAccount', e.target.value)}
                        placeholder="Bank name, Account No, IFSC, Branch…"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1"><Link2 className="h-3.5 w-3.5" />UPI ID / Link</Label>
                      {user?.virtualProfile?.upiId ? (
                        <RevealField value={user.virtualProfile.upiId} label="UPI ID" />
                      ) : null}
                      <Input value={form.upiId} onChange={(e) => set('upiId', e.target.value)} placeholder="name@upi" />
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
