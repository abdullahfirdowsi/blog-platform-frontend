import { Pipe, PipeTransform } from '@angular/core';
import { DateUtil } from '../utils/date.util';

@Pipe({
  name: 'dateFormat',
  standalone: true
})
export class DateFormatPipe implements PipeTransform {
  transform(value: string, format: 'date' | 'relative' = 'date'): string {
    if (!value) return 'N/A';
    
    switch (format) {
      case 'relative':
        return DateUtil.formatRelativeTime(value);
      case 'date':
      default:
        return DateUtil.formatDate(value);
    }
  }
}

