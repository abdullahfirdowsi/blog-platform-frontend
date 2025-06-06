import { Injectable } from '@angular/core';

interface AnalyticsEvent {
  name: string;
  timestamp: Date;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private maxEvents = 100;

  constructor() {
    console.log('AnalyticsService initialized');
  }

  // Track Google Sign-In related events
  trackGoogleSignInEvent(eventName: string, data?: any): void {
    const event: AnalyticsEvent = {
      name: `google_signin_${eventName}`,
      timestamp: new Date(),
      data
    };

    this.events.unshift(event);
    
    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    console.log(`Analytics: ${event.name}`, event);
  }

  // Track script loading events
  trackScriptLoading(success: boolean, loadTime?: number): void {
    this.trackGoogleSignInEvent('script_load', {
      success,
      loadTime,
      userAgent: navigator.userAgent
    });
  }

  // Track button rendering events
  trackButtonRender(success: boolean, containerWidth?: number, error?: string): void {
    this.trackGoogleSignInEvent('button_render', {
      success,
      containerWidth,
      error,
      timestamp: Date.now()
    });
  }

  // Track authentication attempts
  trackAuthAttempt(method: 'google' | 'email', success: boolean, error?: string): void {
    this.trackGoogleSignInEvent('auth_attempt', {
      method,
      success,
      error,
      timestamp: Date.now()
    });
  }

  // Get all events
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  // Get events by type
  getEventsByType(type: string): AnalyticsEvent[] {
    return this.events.filter(event => event.name.includes(type));
  }

  // Get performance summary
  getPerformanceSummary(): {
    totalEvents: number;
    scriptLoadSuccess: number;
    scriptLoadFailures: number;
    buttonRenderSuccess: number;
    buttonRenderFailures: number;
    authAttempts: number;
    authSuccesses: number;
  } {
    const scriptLoads = this.getEventsByType('script_load');
    const buttonRenders = this.getEventsByType('button_render');
    const authAttempts = this.getEventsByType('auth_attempt');

    return {
      totalEvents: this.events.length,
      scriptLoadSuccess: scriptLoads.filter(e => e.data?.success).length,
      scriptLoadFailures: scriptLoads.filter(e => !e.data?.success).length,
      buttonRenderSuccess: buttonRenders.filter(e => e.data?.success).length,
      buttonRenderFailures: buttonRenders.filter(e => !e.data?.success).length,
      authAttempts: authAttempts.length,
      authSuccesses: authAttempts.filter(e => e.data?.success).length
    };
  }

  // Clear all events
  clearEvents(): void {
    this.events = [];
    console.log('Analytics: All events cleared');
  }

  // Export events as JSON
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }
}

