import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { landingRoutes } from './landing.routes';

@NgModule({
  declarations: [
    // Components are standalone, no need to declare them here
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(landingRoutes)
  ]
})
export class LandingModule { }

