import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns';

export type RecurrenceFrequency =
  | 'DAILY' | 'WEEKLY' | 'BIWEEKLY'
  | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY'
  | 'SEMI_ANNUALLY' | 'ANNUALLY';

export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  DAILY:         'Daily',
  WEEKLY:        'Weekly',
  BIWEEKLY:      'Every 2 weeks',
  MONTHLY:       'Monthly',
  BIMONTHLY:     'Every 2 months',
  QUARTERLY:     'Every 3 months (Quarterly)',
  SEMI_ANNUALLY: 'Every 6 months',
  ANNUALLY:      'Annually (Yearly)',
};

export function advancePeriod(date: Date, freq: RecurrenceFrequency): Date {
  switch (freq) {
    case 'DAILY':         return addDays(date, 1);
    case 'WEEKLY':        return addWeeks(date, 1);
    case 'BIWEEKLY':      return addWeeks(date, 2);
    case 'MONTHLY':       return addMonths(date, 1);
    case 'BIMONTHLY':     return addMonths(date, 2);
    case 'QUARTERLY':     return addMonths(date, 3);
    case 'SEMI_ANNUALLY': return addMonths(date, 6);
    case 'ANNUALLY':      return addYears(date, 1);
  }
}

export function formatPeriodLabel(start: Date, freq: RecurrenceFrequency): string {
  switch (freq) {
    case 'DAILY':         return format(start, 'EEE, MMM d yyyy');
    case 'WEEKLY':        return `Week of ${format(start, 'MMM d, yyyy')}`;
    case 'BIWEEKLY':      return `Fortnight of ${format(start, 'MMM d, yyyy')}`;
    case 'MONTHLY':       return format(start, 'MMMM yyyy');
    case 'BIMONTHLY':     return `${format(start, 'MMM')}–${format(addMonths(start, 1), 'MMM yyyy')}`;
    case 'QUARTERLY': {
      const q = Math.floor(start.getMonth() / 3) + 1;
      return `Q${q} ${start.getFullYear()}`;
    }
    case 'SEMI_ANNUALLY': {
      const half = start.getMonth() < 6 ? 'H1' : 'H2';
      return `${half} ${start.getFullYear()}`;
    }
    case 'ANNUALLY': return format(start, 'yyyy');
  }
}
