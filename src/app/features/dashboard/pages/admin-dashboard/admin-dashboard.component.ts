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
  isUserView = false;
  isExportDropdownOpen = false;
  hasError = false;
  
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
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Charts will be initialized when data is loaded
    // This ensures proper timing and avoids duplicate initialization
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

    this.pieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.postsByCategory.map(item => item.category),
        datasets: [{
          data: this.postsByCategory.map(item => item.count),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Posts by Category'
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

    this.lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.postsOverTime.map(item => item.period),
        datasets: [{
          label: 'Posts Published',
          data: this.postsOverTime.map(item => item.count),
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Posts Published Over Time (${this.selectedTimePeriod})`
          }
        },
        scales: {
          y: {
            beginAtZero: true
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

    this.likesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.mostLikedPosts.map(post => post.title.substring(0, 20) + '...'),
        datasets: [{
          label: 'Likes',
          data: this.mostLikedPosts.map(post => post.likes_count),
          backgroundColor: '#FF6384',
          borderColor: '#FF6384',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Most Liked Posts'
          }
        },
        scales: {
          y: {
            beginAtZero: true
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

    this.commentsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.mostCommentedPosts.map(post => post.title.substring(0, 20) + '...'),
        datasets: [{
          label: 'Comments',
          data: this.mostCommentedPosts.map(post => post.comment_count),
          backgroundColor: '#FFCE56',
          borderColor: '#FFCE56',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Most Commented Posts'
          }
        },
        scales: {
          x: {
            beginAtZero: true
          }
        }
      }
    });
  }

  toggleView(): void {
    this.isUserView = !this.isUserView;
  }

  exportToPDF(): void {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
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
      const tableData = this.topContributors.map(contributor => [
        contributor.username,
        contributor.post_count.toString(),
        contributor.comment_count.toString(),
        contributor.total_score.toString()
      ]);
      
      doc.autoTable({
        head: [['Username', 'Posts', 'Comments', 'Score']],
        body: tableData,
        startY: 110,
        theme: 'grid'
      });
    }
    
    doc.save('dashboard-report.pdf');
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
      csvContent += 'Username,Posts,Comments,Score\n';
      this.topContributors.forEach(contributor => {
        csvContent += `${contributor.username},${contributor.post_count},${contributor.comment_count},${contributor.total_score}\n`;
      });
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'dashboard-report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  getFilteredActivity(): Activity[] {
    return this.recentActivity.filter(activity => 
      activity.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      activity.user.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  getFilteredTags(): TopTag[] {
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

  closeExportDropdown(): void {
    this.isExportDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.closeExportDropdown();
    }
  }
}

