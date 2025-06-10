import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntil, Subject } from 'rxjs';
import { InterestsService } from '../../../core/services/interests.service';
import { UserInterests } from '../../interfaces/user.interface';

@Component({
  selector: 'app-interests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interests.component.html',
  styleUrl: './interests.component.css'
})
export class InterestsComponent implements OnInit, OnDestroy {
  @Input() isFirstTimeSetup = false;
  @Output() interestsSelected = new EventEmitter<string[]>();
  @Output() setupCompleted = new EventEmitter<void>();

  userInterests: UserInterests | null = null;
  suggestions: string[] = [];
  selectedInterests: string[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  customInterest = '';
  private destroy$ = new Subject<void>();

  constructor(private interestsService: InterestsService) {}

  ngOnInit(): void {
    this.loadInterestSuggestions();
    
    if (!this.isFirstTimeSetup) {
      this.loadUserInterests();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInterestSuggestions(): void {
    this.interestsService.getInterestSuggestions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (suggestions) => {
          this.suggestions = suggestions;
        },
        error: (error) => {
          console.error('Error loading suggestions:', error);
          this.errorMessage = 'Failed to load interest suggestions.';
        }
      });
  }

  private loadUserInterests(): void {
    this.isLoading = true;
    this.interestsService.getUserInterests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (interests) => {
          this.userInterests = interests;
          this.selectedInterests = [...interests.interests];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading user interests:', error);
          this.isLoading = false;
          // User might not have interests yet, which is ok for first time
          if (error.status !== 404) {
            this.errorMessage = 'Failed to load your interests.';
          }
        }
      });
  }

  toggleInterest(interest: string): void {
    const index = this.selectedInterests.indexOf(interest);
    if (index > -1) {
      this.selectedInterests.splice(index, 1);
    } else {
      if (this.selectedInterests.length < 20) {
        this.selectedInterests.push(interest);
      } else {
        this.errorMessage = 'You can select up to 20 interests only.';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    }
    this.interestsSelected.emit(this.selectedInterests);
  }

  addCustomInterest(): void {
    const interest = this.customInterest.trim();
    if (interest && !this.selectedInterests.includes(interest)) {
      if (this.selectedInterests.length < 20) {
        this.selectedInterests.push(interest);
        this.customInterest = '';
        this.interestsSelected.emit(this.selectedInterests);
      } else {
        this.errorMessage = 'You can select up to 20 interests only.';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    } else if (this.selectedInterests.includes(interest)) {
      this.errorMessage = 'Interest already selected.';
      setTimeout(() => this.errorMessage = '', 3000);
    }
  }

  removeInterest(interest: string): void {
    const index = this.selectedInterests.indexOf(interest);
    if (index > -1) {
      this.selectedInterests.splice(index, 1);
      this.interestsSelected.emit(this.selectedInterests);
    }
  }

  saveInterests(): void {
    if (this.selectedInterests.length === 0) {
      this.errorMessage = 'Please select at least one interest.';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const interestsData = { interests: this.selectedInterests };

    // Use create for first time setup or if user has no interests
    // Use update if user already has interests
    const operation = this.userInterests ? 
      this.interestsService.updateUserInterests(interestsData) :
      this.interestsService.createUserInterests(interestsData);

    operation.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (interests) => {
          this.userInterests = interests;
          this.successMessage = 'Interests saved successfully!';
          this.isLoading = false;
          
          if (this.isFirstTimeSetup) {
            setTimeout(() => {
              this.setupCompleted.emit();
            }, 1500);
          } else {
            setTimeout(() => this.successMessage = '', 5000);
          }
        },
        error: (error) => {
          console.error('Error saving interests:', error);
          this.errorMessage = error.error?.message || 'Failed to save interests. Please try again.';
          this.isLoading = false;
        }
      });
  }

  isSelected(interest: string): boolean {
    return this.selectedInterests.includes(interest);
  }
}

