import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { Subject, takeUntil } from 'rxjs';

declare global {
  interface Window {
    google: any;
  }
}

@Component({
  selector: 'app-google-test',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="test-container">
      <h1>Google Sign-In Test Page</h1>
      
      <div class="test-section">
        <h2>Google Auth Status</h2>
        <div class="status-grid">
          <div class="status-item">
            <span class="label">Script Loaded:</span>
            <span class="value" [class.success]="googleStatus.scriptLoaded" [class.error]="!googleStatus.scriptLoaded">
              {{ googleStatus.scriptLoaded ? 'Yes' : 'No' }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">Identity Services:</span>
            <span class="value" [class.success]="googleStatus.identityServicesAvailable" [class.error]="!googleStatus.identityServicesAvailable">
              {{ googleStatus.identityServicesAvailable ? 'Available' : 'Not Available' }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">OAuth2 Services:</span>
            <span class="value" [class.success]="googleStatus.oauth2Available" [class.error]="!googleStatus.oauth2Available">
              {{ googleStatus.oauth2Available ? 'Available' : 'Not Available' }}
            </span>
          </div>
        </div>
      </div>

      <div class="test-section">
        <h2>Analytics Summary</h2>
        <div class="analytics-grid">
          <div class="analytics-item">
            <span class="label">Total Events:</span>
            <span class="value">{{ analyticsSummary.totalEvents }}</span>
          </div>
          <div class="analytics-item">
            <span class="label">Script Load Success:</span>
            <span class="value success">{{ analyticsSummary.scriptLoadSuccess }}</span>
          </div>
          <div class="analytics-item">
            <span class="label">Script Load Failures:</span>
            <span class="value error">{{ analyticsSummary.scriptLoadFailures }}</span>
          </div>
          <div class="analytics-item">
            <span class="label">Button Render Success:</span>
            <span class="value success">{{ analyticsSummary.buttonRenderSuccess }}</span>
          </div>
          <div class="analytics-item">
            <span class="label">Button Render Failures:</span>
            <span class="value error">{{ analyticsSummary.buttonRenderFailures }}</span>
          </div>
          <div class="analytics-item">
            <span class="label">Auth Attempts:</span>
            <span class="value">{{ analyticsSummary.authAttempts }}</span>
          </div>
        </div>
      </div>

      <div class="test-section">
        <h2>Button Tests</h2>
        
        <div class="button-test">
          <h3>Test 1: Normal Container (400px)</h3>
          <div class="button-container normal" #normalButton></div>
        </div>
        
        <div class="button-test">
          <h3>Test 2: Small Container (250px)</h3>
          <div class="button-container small" #smallButton></div>
        </div>
        
        <div class="button-test">
          <h3>Test 3: Large Container (600px)</h3>
          <div class="button-container large" #largeButton></div>
        </div>
      </div>

      <div class="test-section">
        <h2>Actions</h2>
        <button (click)="refreshStatus()" class="test-btn">Refresh Status</button>
        <button (click)="rerenderButtons()" class="test-btn">Re-render Buttons</button>
        <button (click)="clearConsole()" class="test-btn">Clear Console</button>
        <button (click)="clearAnalytics()" class="test-btn">Clear Analytics</button>
        <button (click)="exportAnalytics()" class="test-btn">Export Analytics</button>
      </div>

      <div class="test-section">
        <h2>Console Logs</h2>
        <div class="console-output">
          <div *ngFor="let log of consoleLogs" [class]="'log-' + log.type">
            <span class="timestamp">{{ log.timestamp }}</span>
            <span class="message">{{ log.message }}</span>
          </div>
        </div>
      </div>

      <div class="navigation">
        <a [routerLink]="['/auth/login']" class="nav-link">← Back to Login</a>
      </div>
    </div>
  `,
  styles: `
    .test-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      font-family: 'Inter', sans-serif;
      background: #0a0a0a;
      color: white;
      min-height: 100vh;
    }

    h1 {
      color: #667eea;
      margin-bottom: 2rem;
    }

    h2 {
      color: #9ca3af;
      margin: 1.5rem 0 1rem 0;
      font-size: 1.25rem;
    }

    h3 {
      color: #d1d5db;
      margin: 1rem 0 0.5rem 0;
      font-size: 1rem;
    }

    .test-section {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: rgba(17, 24, 39, 0.6);
      border-radius: 12px;
      border: 1px solid rgba(75, 85, 99, 0.3);
    }

    .status-grid, .analytics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .status-item, .analytics-item {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem;
      background: rgba(31, 41, 55, 0.5);
      border-radius: 8px;
      border: 1px solid rgba(75, 85, 99, 0.3);
    }

    .label {
      color: #9ca3af;
    }

    .value {
      font-weight: 500;
    }

    .value.success {
      color: #10b981;
    }

    .value.error {
      color: #ef4444;
    }

    .button-test {
      margin-bottom: 1.5rem;
    }

    .button-container {
      margin: 0.5rem 0;
      padding: 1rem;
      border: 2px dashed rgba(75, 85, 99, 0.5);
      border-radius: 8px;
      min-height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .button-container.normal {
      width: 400px;
    }

    .button-container.small {
      width: 250px;
    }

    .button-container.large {
      width: 600px;
    }

    .test-btn {
      margin: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .test-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }

    .console-output {
      background: #000;
      border-radius: 8px;
      padding: 1rem;
      max-height: 300px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
    }

    .log-info {
      color: #3b82f6;
    }

    .log-warn {
      color: #f59e0b;
    }

    .log-error {
      color: #ef4444;
    }

    .timestamp {
      color: #6b7280;
      margin-right: 0.5rem;
    }

    .navigation {
      margin-top: 2rem;
      text-align: center;
    }

    .nav-link {
      color: #9ca3af;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.3s ease;
    }

    .nav-link:hover {
      color: #ffffff;
    }
  `
})
export class GoogleTestComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('normalButton', { static: false }) normalButton!: ElementRef;
  @ViewChild('smallButton', { static: false }) smallButton!: ElementRef;
  @ViewChild('largeButton', { static: false }) largeButton!: ElementRef;

  googleStatus = {
    scriptLoaded: false,
    identityServicesAvailable: false,
    oauth2Available: false
  };

  consoleLogs: Array<{ timestamp: string; message: string; type: string }> = [];
  analyticsSummary = {
    totalEvents: 0,
    scriptLoadSuccess: 0,
    scriptLoadFailures: 0,
    buttonRenderSuccess: 0,
    buttonRenderFailures: 0,
    authAttempts: 0,
    authSuccesses: 0
  };
  private destroy$ = new Subject<void>();
  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error
  };

  constructor(
    private authService: AuthService,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.interceptConsole();
    this.refreshStatus();
    this.refreshAnalytics();
    
    // Update status every 2 seconds
    setInterval(() => {
      this.refreshStatus();
      this.refreshAnalytics();
    }, 2000);
  }

  ngAfterViewInit(): void {
    // Wait a bit then render buttons
    setTimeout(() => {
      this.rerenderButtons();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.restoreConsole();
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshStatus(): void {
    this.googleStatus = this.authService.getGoogleAuthStatus();
  }

  refreshAnalytics(): void {
    this.analyticsSummary = this.analyticsService.getPerformanceSummary();
  }

  clearAnalytics(): void {
    this.analyticsService.clearEvents();
    this.refreshAnalytics();
  }

  exportAnalytics(): void {
    const data = this.analyticsService.exportEvents();
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `google-signin-analytics-${Date.now()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  rerenderButtons(): void {
    const buttons = [
      { element: this.normalButton, name: 'Normal' },
      { element: this.smallButton, name: 'Small' },
      { element: this.largeButton, name: 'Large' }
    ];

    buttons.forEach(({ element, name }) => {
      if (element) {
        try {
          this.authService.renderGoogleButton(element.nativeElement, '/auth/google-test');
          this.addLog(`${name} button rendered successfully`, 'info');
        } catch (error) {
          this.addLog(`Failed to render ${name} button: ${error}`, 'error');
        }
      }
    });
  }

  clearConsole(): void {
    this.consoleLogs = [];
  }

  private interceptConsole(): void {
    console.log = (...args) => {
      this.originalConsole.log(...args);
      this.addLog(args.join(' '), 'info');
    };

    console.warn = (...args) => {
      this.originalConsole.warn(...args);
      this.addLog(args.join(' '), 'warn');
    };

    console.error = (...args) => {
      this.originalConsole.error(...args);
      this.addLog(args.join(' '), 'error');
    };
  }

  private restoreConsole(): void {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
  }

  private addLog(message: string, type: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.consoleLogs.unshift({ timestamp, message, type });
    
    // Keep only last 50 logs
    if (this.consoleLogs.length > 50) {
      this.consoleLogs = this.consoleLogs.slice(0, 50);
    }
  }
}

