export interface TaskEstimation {
  months?: number | null;
  days?: number | null;
  hours?: number | null;
  minutes?: number | null;
}

export function formatEstimatedTime(estimation: TaskEstimation): string {
  const parts: string[] = [];

  if (estimation.months) parts.push(`${estimation.months}m`);
  if (estimation.days) parts.push(`${estimation.days}d`);
  if (estimation.hours) parts.push(`${estimation.hours}h`);
  if (estimation.minutes) parts.push(`${estimation.minutes}min`);

  return parts.length > 0 ? parts.join(' ') : '-';
}

export function getTotalMinutes(estimation: TaskEstimation): number {
  let total = 0;
  if (estimation.months) total += estimation.months * 30 * 24 * 60;
  if (estimation.days) total += estimation.days * 24 * 60;
  if (estimation.hours) total += estimation.hours * 60;
  if (estimation.minutes) total += estimation.minutes;
  return total;
}

export function formatCost(cost: number | null | undefined): string {
  if (!cost) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(cost);
}

export interface TaskWithChildren {
  estimatedMonths?: number | null;
  estimatedDays?: number | null;
  estimatedHours?: number | null;
  estimatedMinutes?: number | null;
  costOfExecution?: number | null;
  children?: TaskWithChildren[];
}

export function calculateTotalEstimatedTime(task: TaskWithChildren): TaskEstimation {
  let totalMonths = task.estimatedMonths ?? 0;
  let totalDays = task.estimatedDays ?? 0;
  let totalHours = task.estimatedHours ?? 0;
  let totalMinutes = task.estimatedMinutes ?? 0;

  if (task.children && task.children.length > 0) {
    task.children.forEach((child) => {
      const childTime = calculateTotalEstimatedTime(child);
      totalMonths += childTime.months ?? 0;
      totalDays += childTime.days ?? 0;
      totalHours += childTime.hours ?? 0;
      totalMinutes += childTime.minutes ?? 0;
    });
  }

  return {
    months: totalMonths || undefined,
    days: totalDays || undefined,
    hours: totalHours || undefined,
    minutes: totalMinutes || undefined,
  };
}

export function calculateTotalCost(task: TaskWithChildren): number {
  let totalCost = task.costOfExecution ?? 0;

  if (task.children && task.children.length > 0) {
    task.children.forEach((child) => {
      totalCost += calculateTotalCost(child);
    });
  }

  return totalCost;
}
