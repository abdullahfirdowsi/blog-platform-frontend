import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-post-list',
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './post-list.component.html',
  styleUrl: './post-list.component.css'
})
export class PostListComponent implements OnInit, OnDestroy {

  constructor(@Inject(DOCUMENT) private document: Document) { }

  ngOnInit(): void {
    this.document.body.classList.add('has-header');
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('has-header');
  }
}
