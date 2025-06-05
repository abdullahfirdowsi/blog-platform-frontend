import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface SocialLink {
  name: string;
  url: string;
  icon: string;
}

interface FooterLink {
  name: string;
  route: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  socialLinks: SocialLink[] = [
    {
      name: 'Twitter',
      url: 'https://twitter.com',
      icon: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z'
    },
    {
      name: 'LinkedIn',
      url: 'https://linkedin.com',
      icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'
    },
    {
      name: 'GitHub',
      url: 'https://github.com',
      icon: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com',
      icon: 'M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.624 5.367 11.99 11.988 11.99s11.99-5.366 11.99-11.99C24.007 5.367 18.641.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.295C3.853 14.977 3.3 13.729 3.3 12.348c0-1.381.553-2.629 1.826-3.345.875-.805 2.026-1.295 3.323-1.295s2.448.49 3.323 1.295c1.273.716 1.826 1.964 1.826 3.345 0 1.381-.553 2.629-1.826 3.345-.875.805-2.026 1.295-3.323 1.295zm7.718-4.64c0 1.381-.553 2.629-1.826 3.345-.875.805-2.026 1.295-3.323 1.295s-2.448-.49-3.323-1.295c-1.273-.716-1.826-1.964-1.826-3.345 0-1.381.553-2.629 1.826-3.345.875-.805 2.026-1.295 3.323-1.295s2.448.49 3.323 1.295c1.273.716 1.826 1.964 1.826 3.345z'
    }
  ];

  footerLinks: FooterSection[] = [
    {
      title: 'Platform',
      links: [
        { name: 'About', route: '/about' },
        { name: 'Features', route: '/features' },
        { name: 'Pricing', route: '/pricing' },
        { name: 'Contact', route: '/contact' }
      ]
    },
    {
      title: 'Community',
      links: [
        { name: 'Writers', route: '/writers' },
        { name: 'Categories', route: '/categories' },
        { name: 'Guidelines', route: '/guidelines' },
        { name: 'Support', route: '/support' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { name: 'Blog', route: '/blog' },
        { name: 'Help Center', route: '/help' },
        { name: 'API Docs', route: '/api-docs' },
        { name: 'Status', route: '/status' }
      ]
    },
    {
      title: 'Company',
      links: [
        { name: 'Careers', route: '/careers' },
        { name: 'Press', route: '/press' },
        { name: 'Partners', route: '/partners' },
        { name: 'Investors', route: '/investors' }
      ]
    }
  ];
}

