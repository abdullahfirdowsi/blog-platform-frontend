import { Pipe, PipeTransform } from '@angular/core';
import { DateUtil } from '../utils/date.util';

@Pipe({
  name: 'dateFormat',
  standalone: true
})
export class DateFormatPipe implements PipeTransform {

  transform(value: string | Date, format: 'full' | 'relative' = 'full'): string {
    if (!value) {
      return '';
    }

    if (format === 'relative') {
      return DateUtil.formatRelativeTime(value);
    }

    return DateUtil.formatDate(value);
  }
}

