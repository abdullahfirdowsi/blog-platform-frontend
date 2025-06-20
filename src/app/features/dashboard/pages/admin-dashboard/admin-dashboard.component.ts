import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF interface for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

import {
  DashboardService,
  DashboardTotals,
  PostsOverTime,
  PostsByCategory,
  TopTag,
  MostLikedPost,
  MostCommentedPost,
  Activity,
  TopContributor
} from '../../../../core/services/dashboard.service';
import { AuthService } from '../../../../core/services/auth.service';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('pieChart', { static: false }) pieChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChart', { static: false }) lineChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('likesChart', { static: false }) likesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('commentsChart', { static: false }) commentsChartRef!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();
  private pieChart: Chart | null = null;
  private lineChart: Chart | null = null;
  private likesChart: Chart | null = null;
  private commentsChart: Chart | null = null;

  // Data properties
  totals: DashboardTotals | null = null;
  postsOverTime: PostsOverTime[] = [];
  postsByCategory: PostsByCategory[] = [];
  topTags: TopTag[] = [];
  mostLikedPosts: MostLikedPost[] = [];
  mostCommentedPosts: MostCommentedPost[] = [];
  recentActivity: Activity[] = [];
  topContributors: TopContributor[] = [];

  // UI state
  isLoading = true;
  isExportDropdownOpen = false;
  hasError = false;
  isDarkTheme = false;
  
  // Filters
  selectedTimePeriod = 'week';
  selectedCategory = '';
  searchTerm = '';
  startDate = '';
  endDate = '';

  // Available options
  timePeriods = [
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' },
    { value: 'year', label: 'Yearly' }
  ];

  categories: string[] = [];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService
  ) {
    // Check for user's theme preference
    this.isDarkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Charts will be initialized when data is loaded
  }

  private initializeCharts(): void {
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      if (this.postsByCategory.length > 0 && this.pieChartRef?.nativeElement) {
        this.updatePieChart();
      }
      if (this.postsOverTime.length > 0 && this.lineChartRef?.nativeElement) {
        this.updateLineChart();
      }
      if (this.mostLikedPosts.length > 0 && this.likesChartRef?.nativeElement) {
        this.updateLikesChart();
      }
      if (this.mostCommentedPosts.length > 0 && this.commentsChartRef?.nativeElement) {
        this.updateCommentsChart();
      }
    }, 200);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  private destroyCharts(): void {
    [this.pieChart, this.lineChart, this.likesChart, this.commentsChart].forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.hasError = false;
    let completedRequests = 0;
    const totalRequests = 7;

    const handleError = (error: any, context: string) => {
      console.error(`Error loading ${context}:`, error);
      completedRequests++;
      if (completedRequests === totalRequests) {
        this.isLoading = false;
        this.hasError = true;
      }
    };

    const handleSuccess = () => {
      completedRequests++;
      if (completedRequests === totalRequests) {
        this.isLoading = false;
        this.hasError = false;
        // Initialize charts after all data is loaded
        this.initializeCharts();
      }
    };

    // Load all dashboard data
    this.dashboardService.getTotals()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.totals = data;
          handleSuccess();
        },
        error: (error) => handleError(error, 'totals')
      });

    this.dashboardService.getPostsOverTime(this.selectedTimePeriod as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.postsOverTime = data;
          handleSuccess();
        },
        error: (error) => handleError(error, 'posts over time')
      });

    this.dashboardService.getPostsByCategory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.postsByCategory = data;
          this.categories = data.map(item => item.category);
          handleSuccess();
        },
        error: (error) => handleError(error, 'posts by category')
      });

    this.dashboardService.getTopTags()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.topTags = data;
          handleSuccess();
        },
        error: (error) => handleError(error, 'top tags')
      });

    this.dashboardService.getMostLikedPosts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.mostLikedPosts = data;
          handleSuccess();
        },
        error: (error) => handleError(error, 'most liked posts')
      });

    this.dashboardService.getMostCommentedPosts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.mostCommentedPosts = data;
          handleSuccess();
        },
        error: (error) => handleError(error, 'most commented posts')
      });

    this.dashboardService.getRecentActivity()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.recentActivity = data;
          handleSuccess();
        },
        error: (error) => handleError(error, 'recent activity')
      });

    this.dashboardService.getTopContributors()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.topContributors = data;
          handleSuccess();
        },
        error: (error) => handleError(error, 'top contributors')
      });
  }

  onTimePeriodChange(): void {
    this.dashboardService.getPostsOverTime(this.selectedTimePeriod as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.postsOverTime = data;
          // Wait a bit to ensure the chart container is ready
          setTimeout(() => {
            this.updateLineChart();
          }, 100);
        },
        error: (error) => console.error('Error loading posts over time:', error)
      });
  }

  updatePieChart(): void {
    if (!this.pieChartRef?.nativeElement || this.postsByCategory.length === 0) return;

    if (this.pieChart) {
      this.pieChart.destroy();
    }

    const ctx = this.pieChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Define colors based on theme
    const colors = this.isDarkTheme ? 
      ['#64b5f6', '#81c784', '#ffb74d', '#e57373', '#ba68c8', '#4fc3f7', '#aed581', '#ff8a65'] :
      ['#1976d2', '#2e7d32', '#f57f17', '#c62828', '#7b1fa2', '#0288d1', '#689f38', '#d84315'];

    this.pieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.postsByCategory.map(item => item.category),
        datasets: [{
          data: this.postsByCategory.map(item => item.count),
          backgroundColor: colors,
          borderWidth: 1,
          borderColor: this.isDarkTheme ? '#2a2a2a' : '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: this.isDarkTheme ? '#e0e0e0' : '#333',
              padding: 15,
              usePointStyle: true,
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            backgroundColor: this.isDarkTheme ? 'rgba(42, 42, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            titleColor: this.isDarkTheme ? '#e0e0e0' : '#333',
            bodyColor: this.isDarkTheme ? '#e0e0e0' : '#333',
            borderColor: this.isDarkTheme ? '#333' : '#e0e0e0',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 4,
            displayColors: true
          }
        }
      }
    });
  }

  updateLineChart(): void {
    if (!this.lineChartRef?.nativeElement || this.postsOverTime.length === 0) return;

    if (this.lineChart) {
      this.lineChart.destroy();
    }

    const ctx = this.lineChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Define colors based on theme
    const primaryColor = this.isDarkTheme ? '#64b5f6' : '#1976d2';
    const gridColor = this.isDarkTheme ? '#333' : '#e0e0e0';
    const textColor = this.isDarkTheme ? '#e0e0e0' : '#333';

    this.lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.postsOverTime.map(item => item.period),
        datasets: [{
          label: 'Posts Published',
          data: this.postsOverTime.map(item => item.count),
          borderColor: primaryColor,
          backgroundColor: this.isDarkTheme ? 'rgba(100, 181, 246, 0.1)' : 'rgba(25, 118, 210, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointBackgroundColor: primaryColor,
          pointRadius: 3,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: textColor,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: this.isDarkTheme ? 'rgba(42, 42, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            titleColor: this.isDarkTheme ? '#e0e0e0' : '#333',
            bodyColor: this.isDarkTheme ? '#e0e0e0' : '#333',
            borderColor: this.isDarkTheme ? '#333' : '#e0e0e0',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: {
              color: gridColor,
              display: true,
              drawOnChartArea: true
            },
            ticks: {
              color: textColor
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: gridColor,
              display: true,
              drawOnChartArea: true
            },
            ticks: {
              color: textColor,
              precision: 0
            }
          }
        }
      }
    });
  }

  updateLikesChart(): void {
    if (!this.likesChartRef?.nativeElement || this.mostLikedPosts.length === 0) return;

    if (this.likesChart) {
      this.likesChart.destroy();
    }

    const ctx = this.likesChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Define colors based on theme
    const barColor = this.isDarkTheme ? '#e57373' : '#c62828';
    const gridColor = this.isDarkTheme ? '#333' : '#e0e0e0';
    const textColor = this.isDarkTheme ? '#e0e0e0' : '#333';

    this.likesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.mostLikedPosts.map(post => this.truncateTitle(post.title, 20)),
        datasets: [{
          label: 'Likes',
          data: this.mostLikedPosts.map(post => post.likes_count),
          backgroundColor: barColor,
          borderWidth: 0,
          borderRadius: 4,
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: this.isDarkTheme ? 'rgba(42, 42, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            titleColor: this.isDarkTheme ? '#e0e0e0' : '#333',
            bodyColor: this.isDarkTheme ? '#e0e0e0' : '#333',
            borderColor: this.isDarkTheme ? '#333' : '#e0e0e0',
            borderWidth: 1,
            callbacks: {
              title: (tooltipItems) => {
                const post = this.mostLikedPosts[tooltipItems[0].dataIndex];
                return post.title;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: gridColor,
              display: true,
              drawOnChartArea: true
            },
            ticks: {
              color: textColor,
              precision: 0
            }
          },
          y: {
            grid: {
              display: false
            },
            ticks: {
              color: textColor
            }
          }
        }
      }
    });
  }

  updateCommentsChart(): void {
    if (!this.commentsChartRef?.nativeElement || this.mostCommentedPosts.length === 0) return;

    if (this.commentsChart) {
      this.commentsChart.destroy();
    }

    const ctx = this.commentsChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Define colors based on theme
    const barColor = this.isDarkTheme ? '#ffb74d' : '#f57f17';
    const gridColor = this.isDarkTheme ? '#333' : '#e0e0e0';
    const textColor = this.isDarkTheme ? '#e0e0e0' : '#333';

    this.commentsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.mostCommentedPosts.map(post => this.truncateTitle(post.title, 20)),
        datasets: [{
          label: 'Comments',
          data: this.mostCommentedPosts.map(post => post.comment_count),
          backgroundColor: barColor,
          borderWidth: 0,
          borderRadius: 4,
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: this.isDarkTheme ? 'rgba(42, 42, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            titleColor: this.isDarkTheme ? '#e0e0e0' : '#333',
            bodyColor: this.isDarkTheme ? '#e0e0e0' : '#333',
            borderColor: this.isDarkTheme ? '#333' : '#e0e0e0',
            borderWidth: 1,
            callbacks: {
              title: (tooltipItems) => {
                const post = this.mostCommentedPosts[tooltipItems[0].dataIndex];
                return post.title;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: gridColor,
              display: true,
              drawOnChartArea: true
            },
            ticks: {
              color: textColor,
              precision: 0
            }
          },
          y: {
            grid: {
              display: false
            },
            ticks: {
              color: textColor
            }
          }
        }
      }
    });
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    
    // Reinitialize charts with new theme
    setTimeout(() => {
      this.updatePieChart();
      this.updateLineChart();
      this.updateLikesChart();
      this.updateCommentsChart();
    }, 100);
  }

  exportToPDF(): void {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(this.isDarkTheme ? 255 : 0);
    doc.text('Blog Platform Dashboard Report', 20, 20);
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
    
    // Add totals
    if (this.totals) {
      doc.setFontSize(14);
      doc.text('Summary Statistics:', 20, 50);
      doc.setFontSize(12);
      doc.text(`Total Users: ${this.totals.total_users}`, 20, 65);
      doc.text(`Total Posts: ${this.totals.total_posts}`, 20, 75);
      doc.text(`Total Comments: ${this.totals.total_comments}`, 20, 85);
      doc.text(`Total Likes: ${this.totals.total_likes}`, 20, 95);
    }
    
    // Add top contributors table
    if (this.topContributors.length > 0) {
      const tableData = this.topContributors.map((contributor, index) => [
        (index + 1).toString(),
        contributor.username,
        contributor.post_count.toString(),
        contributor.comment_count.toString(),
        contributor.total_score.toString()
      ]);
      
      doc.autoTable({
        head: [['Rank', 'Username', 'Posts', 'Comments', 'Score']],
        body: tableData,
        startY: 110,
        theme: 'grid',
        headStyles: {
          fillColor: [25, 118, 210],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });
    }
    
    doc.save('dashboard-report.pdf');
    this.isExportDropdownOpen = false;
  }

  exportToCSV(): void {
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add summary data
    if (this.totals) {
      csvContent += 'Summary Statistics\n';
      csvContent += `Total Users,${this.totals.total_users}\n`;
      csvContent += `Total Posts,${this.totals.total_posts}\n`;
      csvContent += `Total Comments,${this.totals.total_comments}\n`;
      csvContent += `Total Likes,${this.totals.total_likes}\n\n`;
    }
    
    // Add top contributors
    if (this.topContributors.length > 0) {
      csvContent += 'Top Contributors\n';
      csvContent += 'Rank,Username,Posts,Comments,Score\n';
      this.topContributors.forEach((contributor, index) => {
        csvContent += `${index + 1},${contributor.username},${contributor.post_count},${contributor.comment_count},${contributor.total_score}\n`;
      });
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'dashboard-report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.isExportDropdownOpen = false;
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  getFilteredActivity(): Activity[] {
    if (!this.searchTerm) return this.recentActivity;
    
    return this.recentActivity.filter(activity => 
      activity.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      activity.user.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  getFilteredTags(): TopTag[] {
    if (!this.searchTerm) return this.topTags;
    
    return this.topTags.filter(tag => 
      tag.tag.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  trackByActivityId(index: number, activity: Activity): string {
    return activity.id;
  }

  toggleExportDropdown(): void {
    this.isExportDropdownOpen = !this.isExportDropdownOpen;
  }

  // Helper method to truncate post titles
  private truncateTitle(title: string, maxLength: number): string {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.isExportDropdownOpen = false;
    }
  }
}