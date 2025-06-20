import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DateUtil {

  /**
   * Private helper to parse dates consistently
   * @param dateString - ISO date string or date string
   * @returns Date object
   */
  private static parseDate(dateInput: string | Date): Date {
    if (dateInput instanceof Date) {
      return dateInput;
    }
    
    if (typeof dateInput === 'string') {
      const trimmedDate = dateInput.trim();
      if (!trimmedDate.endsWith('Z') && !trimmedDate.includes('+') && !trimmedDate.includes('T')) {
        // Handle date-only strings
        return new Date(trimmedDate + 'T00:00:00.000Z');
      } else if (!trimmedDate.endsWith('Z') && trimmedDate.includes('T') && !trimmedDate.includes('+')) {
        // Handle datetime strings without timezone - treat as UTC
        return new Date(trimmedDate + 'Z');
      } else {
        // Handle ISO strings or strings with timezone info
        return new Date(trimmedDate);
      }
    } else {
      return new Date(dateInput);
    }
  }

  /**
   * Format a date string to display in local timezone
   * @param dateString - ISO date string or date string
   * @returns Formatted date string in local timezone
   */
  static formatDate(dateInput: string | Date): string {
    if (!dateInput) return 'N/A';
    
    try {
      const date = DateUtil.parseDate(dateInput);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date input:', dateInput);
        return 'Invalid Date';
      }
      
      // Get user's timezone
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Use toLocaleString to properly handle timezone conversion
      // This will automatically convert UTC to local timezone
      const formatted = date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: timeZone
      });
      
      return formatted;
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', dateInput);
      return 'Invalid Date';
    }
  }

  /**
   * Format a date string to display relative time (e.g., "2 hours ago")
   * @param dateString - ISO date string or date string
   * @returns Relative time string
   */
  static formatRelativeTime(dateInput: string | Date): string {
    if (!dateInput) return 'N/A';
    
    try {
      const date = DateUtil.parseDate(dateInput);
      const now = new Date();
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date input:', dateInput);
        return 'Invalid Date';
      }
      
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) {
        return 'Just now';
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
      } else {
        // For dates older than a week, show the formatted date
        return DateUtil.formatDate(dateInput);
      }
    } catch (error) {
      console.error('Error formatting relative time:', error, 'Input:', dateInput);
      return 'Invalid Date';
    }
  }

  /**
   * Get current timestamp in ISO format
   * @returns Current timestamp as ISO string
   */
  static getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Check if a date string represents today
   * @param dateString - ISO date string or date string
   * @returns True if the date is today
   */
  static isToday(dateInput: string | Date): boolean {
    if (!dateInput) return false;
    
    try {
      const date = DateUtil.parseDate(dateInput);
      const today = new Date();
      
      if (isNaN(date.getTime())) return false;
      
      // Compare dates in local timezone
      const dateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      return dateLocal.getTime() === todayLocal.getTime();
    } catch (error) {
      console.error('Error checking if date is today:', error, 'Input:', dateInput);
      return false;
    }
  }

  /**
   * Check if a date string represents yesterday
   * @param dateString - ISO date string or date string
   * @returns True if the date is yesterday
   */
  static isYesterday(dateInput: string | Date): boolean {
    if (!dateInput) return false;
    
    try {
      const date = DateUtil.parseDate(dateInput);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (isNaN(date.getTime())) return false;
      
      // Compare dates in local timezone
      const dateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const yesterdayLocal = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      
      return dateLocal.getTime() === yesterdayLocal.getTime();
    } catch (error) {
      console.error('Error checking if date is yesterday:', error, 'Input:', dateInput);
      return false;
    }
  }
}

