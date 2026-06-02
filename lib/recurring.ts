import { addDays, isBefore, isAfter, startOfDay } from 'date-fns';
import type { RecurringTaskTemplate, RecurringTaskOccurrence } from '@/app/generated/prisma/client';
import { advancePeriod, formatPeriodLabel, type RecurrenceFrequency } from './recurring-shared';
import prisma from './prisma';

export { FREQUENCY_LABELS, advancePeriod, formatPeriodLabel, type RecurrenceFrequency } from './recurring-shared';

/** Return all period-start dates from template.startDate up to and including today */
export function getDuePeriods(
  startDate: Date,
  frequency: RecurrenceFrequency,
  endDate: Date | null | undefined,
): Array<{ periodStart: Date; periodEnd: Date }> {
  const now = startOfDay(new Date());
  const periods: Array<{ periodStart: Date; periodEnd: Date }> = [];
  let cursor = startOfDay(new Date(startDate));

  if (isAfter(cursor, now)) return [];

  while (!isAfter(cursor, now)) {
    if (endDate && isAfter(cursor, new Date(endDate))) break;
    const next = advancePeriod(cursor, frequency);
    periods.push({ periodStart: cursor, periodEnd: addDays(next, -1) });
    cursor = next;
  }

  return periods;
}

/**
 * For a template, generate Task occurrences for all periods that don't yet have one.
 * Returns the count of newly created occurrences.
 */
export async function generateMissingOccurrences(
  template: RecurringTaskTemplate & {
    occurrences: Array<Pick<RecurringTaskOccurrence, 'periodStart'>>;
  }
): Promise<number> {
  if (!template.isActive) return 0;

  const duePeriods = getDuePeriods(
    template.startDate,
    template.frequency as RecurrenceFrequency,
    template.endDate,
  );

  const existingStarts = new Set(
    template.occurrences.map((o) => startOfDay(new Date(o.periodStart)).toISOString())
  );

  const missing = duePeriods.filter(
    (p) => !existingStarts.has(p.periodStart.toISOString())
  );

  if (missing.length === 0) return 0;

  await Promise.all(
    missing.map(async ({ periodStart, periodEnd }) => {
      const label = formatPeriodLabel(periodStart, template.frequency as RecurrenceFrequency);
      const task = await prisma.task.create({
        data: {
          projectId: template.projectId,
          title: `${template.title} — ${label}`,
          description: template.description,
          type: template.type,
          priority: template.priority,
          status: 'TODO',
          assigneeUserId: template.assigneeUserId,
          reviewerUserId: template.reviewerUserId,
          deadlineDt: periodEnd,
          startDt: periodStart,
          createdBy: template.createdBy,
        },
      });
      await prisma.recurringTaskOccurrence.create({
        data: { templateId: template.id, taskId: task.id, periodStart, periodEnd },
      });
    })
  );

  await prisma.recurringTaskTemplate.update({
    where: { id: template.id },
    data: { lastGeneratedAt: new Date() },
  });

  return missing.length;
}
