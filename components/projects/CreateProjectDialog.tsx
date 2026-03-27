"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import cc from "currency-codes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateProject } from '@/hooks/projects';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

const currencies = cc.data.map((c) => ({
  value: c.code,
  label: `${c.code} - ${c.currency}`,
}));

const getDefaultDates = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  
  const localNow = new Date(now.getTime() - offset);
  const startDate = localNow.toISOString().slice(0, 10);
  
  const deadlineDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const localDeadline = new Date(deadlineDate.getTime() - offset);
  const deadline = localDeadline.toISOString().slice(0, 10);
  
  return { startDate, deadline };
};

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  status: z
    .enum(["PLANNED", "IN_PROGRESS", "HOLD", "COMPLETED", "CANCELLED"])
    .optional(),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  budgetTotal: z.number().optional(),
  currency: z.string().optional(),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

interface CreateProjectDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({
  orgId,
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  const router = useRouter();
  const createProject = useCreateProject(orgId);
  const [openCurrency, setOpenCurrency] = useState(false);

  const form = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      currency: "INR",
      status: "PLANNED",
      ...getDefaultDates(),
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (open) {
      reset({
        currency: "INR",
        status: "PLANNED",
        ...getDefaultDates(),
      });
    }
  }, [open, reset]);

  const onSubmit = async (data: CreateProjectForm) => {
    try {
      const project = await createProject.mutateAsync({
        name: data.name,
        code: data.code,
        description: data.description,
        status: data.status,
        startDate: data.startDate,
        deadline: data.deadline,
        budgetTotal: data.budgetTotal,
        currency: data.currency ?? "INR",
      });

      reset();
      onOpenChange(false);
      router.push(`/orgs/${orgId}/projects/${project.id}/dashboard`);
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <div className="flex flex-col max-h-[90vh] min-h-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize tasks and track progress
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 min-h-0 overflow-y-auto px-6 space-y-4 mb-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Website Redesign" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="WEB-REDESIGN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Project description..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PLANNED">Planned</SelectItem>
                          <SelectItem value="IN_PROGRESS">
                            In Progress
                          </SelectItem>
                          <SelectItem value="HOLD">Hold</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deadline</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="budgetTotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget Total</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem className="flex flex-col mt-2.5">
                        <FormLabel>Currency</FormLabel>
                        <Popover open={openCurrency} onOpenChange={setOpenCurrency}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? currencies.find(
                                      (c) => c.value === field.value
                                    )?.label
                                  : "Select currency"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search currency..." />
                              <CommandList className="max-h-[200px] overflow-y-auto">
                                <CommandEmpty>No currency found.</CommandEmpty>
                                <CommandGroup>
                                  {currencies.map((currency) => (
                                    <CommandItem
                                      value={currency.label}
                                      key={currency.value}
                                      onSelect={() => {
                                        form.setValue("currency", currency.value);
                                        setOpenCurrency(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          currency.value === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {currency.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter className="flex-shrink-0 px-6 py-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={createProject.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
