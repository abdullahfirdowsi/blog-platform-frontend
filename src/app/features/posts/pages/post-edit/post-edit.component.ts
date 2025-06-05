import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-post-edit',
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './post-edit.component.html',
  styleUrl: './post-edit.component.css'
})
export class PostEditComponent implements OnInit, OnDestroy {

  constructor(@Inject(DOCUMENT) private document: Document) { }

  ngOnInit(): void {
    this.document.body.classList.add('has-header');
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('has-header');
  }
}
