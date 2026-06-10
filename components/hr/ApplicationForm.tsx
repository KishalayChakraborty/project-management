'use client';

import { useState } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import { Upload, X } from 'lucide-react';

export const applicationSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Phone is required'),
  linkedinUrl: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().url('Invalid LinkedIn URL').optional()
  ),
  githubUrl: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().url('Invalid GitHub URL').optional()
  ),
  portfolioUrl: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().url('Invalid Portfolio URL').optional()
  ),
  city: z.string().optional(),
  country: z.string().optional(),
  expectedSalaryMin: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().optional()
  ),
  expectedSalaryMax: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().optional()
  ),
  noticePeriodDays: z.preprocess(
    (val) => (val === '' || val === null ? 0 : val),
    z.coerce.number().min(0)
  ),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      fieldOfStudy: z.string().optional(),
      endYear: z.preprocess(
        (val) => (val === '' || val === null ? undefined : val),
        z.coerce.number().optional()
      ),
    })
  ),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      description: z.string().optional(),
    })
  ),
  coverLetter: z.string().optional(),
  cvFile: z.any().optional(),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

interface ApplicationFormProps {
  onSuccess?: () => void;
  submitUrl?: string;
  initialData?: Partial<ApplicationFormValues>;
  isHRForm?: boolean;
}

export function ApplicationForm({
  onSuccess,
  submitUrl,
  initialData,
  isHRForm = false,
}: ApplicationFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [selectedEducation, setSelectedEducation] = useState<any[]>(initialData?.education || []);
  const [selectedExperience, setSelectedExperience] = useState<any[]>(initialData?.experience || []);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema) as any,
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '+91 ',
      linkedinUrl: initialData?.linkedinUrl || '',
      githubUrl: initialData?.githubUrl || '',
      portfolioUrl: initialData?.portfolioUrl || '',
      city: initialData?.city || '',
      country: initialData?.country || 'India',
      expectedSalaryMin: initialData?.expectedSalaryMin,
      expectedSalaryMax: initialData?.expectedSalaryMax,
      noticePeriodDays: initialData?.noticePeriodDays || 30,
      education: selectedEducation,
      experience: selectedExperience,
      coverLetter: initialData?.coverLetter || '',
      cvFile: undefined,
    },
  });

  const addEducation = (edu: any) => {
    if (edu.degree && edu.institution) {
      setSelectedEducation([...selectedEducation, edu]);
      form.setValue('education', [...selectedEducation, edu]);
    }
  };

  const removeEducation = (index: number) => {
    const updated = selectedEducation.filter((_, i) => i !== index);
    setSelectedEducation(updated);
    form.setValue('education', updated);
  };

  const addExperience = (exp: any) => {
    if (exp.company && exp.title) {
      setSelectedExperience([...selectedExperience, exp]);
      form.setValue('experience', [...selectedExperience, exp]);
    }
  };

  const removeExperience = (index: number) => {
    const updated = selectedExperience.filter((_, i) => i !== index);
    setSelectedExperience(updated);
    form.setValue('experience', updated);
  };

  async function onSubmit(data: ApplicationFormValues) {
    try {
      setSubmitting(true);
      const { cvFile, ...formData } = data;

      if (!submitUrl) {
        toast({
          title: 'Error',
          description: 'Submit URL not configured',
          variant: 'destructive',
        });
        return;
      }

      const submitData = new FormData();
      submitData.append('data', JSON.stringify(formData));
      if (cvFile) {
        submitData.append('cv', cvFile);
      }

      await axios.post(submitUrl, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast({
        title: 'Success',
        description: 'Application submitted successfully',
      });

      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as any).message || 'Failed to submit application',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Rajesh" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Kumar" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="rajesh.kumar@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+91 98765 43210" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="linkedinUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LinkedIn</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="linkedin.com/in/..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="githubUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GitHub</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="github.com/..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="portfolioUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Portfolio</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="yoursite.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Bangalore" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="India" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="expectedSalaryMin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Salary Min (₹ INR)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="600000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expectedSalaryMax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Salary Max (₹ INR)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="1200000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="noticePeriodDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notice Period (Days)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min="0" placeholder="30" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-3">Education</h3>
            {selectedEducation.map((edu, idx) => (
              <div key={idx} className="flex items-center justify-between bg-muted p-2 rounded mb-2">
                <span className="text-sm">{edu.degree} from {edu.institution}</span>
                <button
                  type="button"
                  onClick={() => removeEducation(idx)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input placeholder="Degree" id={`edu-degree-${selectedEducation.length}`} />
              <Input placeholder="Institution" id={`edu-inst-${selectedEducation.length}`} />
              <Input placeholder="Field of Study" id={`edu-field-${selectedEducation.length}`} />
              <Input
                placeholder="End Year"
                type="number"
                id={`edu-year-${selectedEducation.length}`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const degreeInput = document.getElementById(
                    `edu-degree-${selectedEducation.length}`
                  ) as HTMLInputElement;
                  const instInput = document.getElementById(
                    `edu-inst-${selectedEducation.length}`
                  ) as HTMLInputElement;
                  const fieldInput = document.getElementById(
                    `edu-field-${selectedEducation.length}`
                  ) as HTMLInputElement;
                  const yearInput = document.getElementById(
                    `edu-year-${selectedEducation.length}`
                  ) as HTMLInputElement;
                  addEducation({
                    degree: degreeInput?.value || '',
                    institution: instInput?.value || '',
                    fieldOfStudy: fieldInput?.value || '',
                    endYear: yearInput?.value ? parseInt(yearInput.value) : undefined,
                  });
                  degreeInput.value = '';
                  instInput.value = '';
                  fieldInput.value = '';
                  yearInput.value = '';
                }}
                className="col-span-2"
              >
                Add Education
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-3">Experience</h3>
            {selectedExperience.map((exp, idx) => (
              <div key={idx} className="flex items-center justify-between bg-muted p-2 rounded mb-2">
                <span className="text-sm">{exp.title} at {exp.company}</span>
                <button
                  type="button"
                  onClick={() => removeExperience(idx)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input placeholder="Company" id={`exp-company-${selectedExperience.length}`} />
              <Input placeholder="Job Title" id={`exp-title-${selectedExperience.length}`} />
              <Textarea
                placeholder="Description"
                className="col-span-2"
                id={`exp-desc-${selectedExperience.length}`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const companyInput = document.getElementById(
                    `exp-company-${selectedExperience.length}`
                  ) as HTMLInputElement;
                  const titleInput = document.getElementById(
                    `exp-title-${selectedExperience.length}`
                  ) as HTMLInputElement;
                  const descInput = document.getElementById(
                    `exp-desc-${selectedExperience.length}`
                  ) as HTMLTextAreaElement;
                  addExperience({
                    company: companyInput?.value || '',
                    title: titleInput?.value || '',
                    description: descInput?.value || '',
                  });
                  companyInput.value = '';
                  titleInput.value = '';
                  descInput.value = '';
                }}
                className="col-span-2"
              >
                Add Experience
              </Button>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="coverLetter"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Letter</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Tell us why you're interested in this role..." rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cvFile"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>CV/Resume (PDF or DOC, max 5MB)</FormLabel>
              <FormControl>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PDF or DOC (MAX. 5MB)</p>
                    </div>
                    <input
                      {...field}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            form.setError('cvFile', { message: 'File size must be less than 5MB' });
                            return;
                          }
                          if (
                            ![
                              'application/pdf',
                              'application/msword',
                              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            ].includes(file.type)
                          ) {
                            form.setError('cvFile', { message: 'Only PDF and DOC files are allowed' });
                            return;
                          }
                          onChange(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </FormControl>
              {value?.name && <p className="text-sm text-green-600">Selected: {value.name}</p>}
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Submitting...' : 'Submit Application'}
        </Button>
      </form>
    </Form>
  );
}
