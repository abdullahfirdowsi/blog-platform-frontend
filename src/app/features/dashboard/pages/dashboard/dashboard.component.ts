import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  
  constructor(@Inject(DOCUMENT) private document: Document) { }

  ngOnInit(): void {
    // Add body class for header spacing
    this.document.body.classList.add('has-header');
    // Initialize dashboard data
  }

  ngOnDestroy(): void {
    // Remove body class when component is destroyed
    this.document.body.classList.remove('has-header');
  }
}

