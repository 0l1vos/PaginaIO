import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { gsap } from 'gsap';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit, AfterViewInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('loginCardRef') loginCardRef?: ElementRef<HTMLDivElement>;
  @ViewChild('loaderBarRef') loaderBarRef?: ElementRef<HTMLDivElement>;
  @ViewChild('errorAlertRef') errorAlertRef?: ElementRef<HTMLDivElement>;

  email = '';
  password = '';
  showPassword = false;
  errorMessage = '';
  loading = false;
  isSuccess = false;

  private isBrowser = false;
  private loaderAnimation?: gsap.core.Tween;
  private emberAnimation?: gsap.core.Tween;
  private entranceTimeline?: gsap.core.Timeline;

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    setTimeout(() => {
      this.initEntranceAnimation();
      this.initMicroInteractions();
    }, 20);
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      this.loaderAnimation?.kill();
      this.emberAnimation?.kill();
      this.entranceTimeline?.kill();
      gsap.killTweensOf('.login-card, .editorial-loader-bar, .ember-dot, .error-alert, .submit-btn');
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private initEntranceAnimation(): void {
    const card = this.loginCardRef?.nativeElement;
    if (!card) return;


    this.entranceTimeline = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete: () => {
        gsap.set('.submit-btn', { clearProps: 'opacity,transform' });
        gsap.set(card, { clearProps: 'opacity,transform' });
      },
    });

    this.entranceTimeline
      .fromTo(card,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, clearProps: 'opacity,transform' }
      )
      .fromTo('.brand-pill',
        { opacity: 0, x: -12 },
        { opacity: 1, x: 0, duration: 0.4, clearProps: 'opacity,transform' },
        '-=0.35'
      )
      .fromTo('.header h1, .header p',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, clearProps: 'opacity,transform' },
        '-=0.25'
      )
      .fromTo('.form-group',
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, clearProps: 'opacity,transform' },
        '-=0.25'
      )
      .fromTo('.submit-btn',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, clearProps: 'opacity,transform' },
        '-=0.2'
      )
      .fromTo('.footer-security-note',
        { opacity: 0 },
        { opacity: 1, duration: 0.35, clearProps: 'opacity' },
        '-=0.2'
      )
      .fromTo('.editorial-data-card',
        { opacity: 0, x: 18 },
        { opacity: 1, x: 0, duration: 0.55, clearProps: 'opacity,transform' },
        '-=0.5'
      )
      .fromTo('.ascii-row',
        { opacity: 0, x: 10 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, clearProps: 'opacity,transform' },
        '-=0.35'
      )
      .fromTo('.stat-pill',
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, clearProps: 'opacity,transform' },
        '-=0.25'
      );
  }

  private initMicroInteractions(): void {
    this.emberAnimation = gsap.to('.ember-dot', {
      scale: 1.35,
      opacity: 0.8,
      duration: 1.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }

  private startLoaderAnimation(): void {
    const loader = this.loaderBarRef?.nativeElement;
    if (!loader || !this.isBrowser) return;

    this.loaderAnimation?.kill();
    gsap.set(loader, { opacity: 1, scaleX: 0, transformOrigin: '0% 50%' });
    this.loaderAnimation = gsap.to(loader, {
      scaleX: 0.85,
      duration: 1.1,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut',
    });
  }

  private stopLoaderAnimation(complete = false): void {
    const loader = this.loaderBarRef?.nativeElement;
    this.loaderAnimation?.kill();
    if (!loader || !this.isBrowser) return;

    if (complete) {
      gsap.to(loader, {
        scaleX: 1,
        backgroundColor: '#ff682c',
        duration: 0.35,
        ease: 'power2.out',
      });
    } else {
      gsap.to(loader, {
        scaleX: 0,
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          gsap.set(loader, { scaleX: 0, opacity: 0 });
        },
      });
    }
  }

  private triggerErrorShake(): void {
    if (!this.isBrowser) return;
    this.cdr.detectChanges();

    setTimeout(() => {
      const alertEl = document.querySelector('.error-alert');
      if (alertEl) {
        gsap.fromTo(
          alertEl,
          { x: -8 },
          {
            x: 8,
            duration: 0.06,
            repeat: 5,
            yoyo: true,
            ease: 'power2.inOut',
            onComplete: () => {
              gsap.set(alertEl, { x: 0 });
            },
          }
        );
      }
    }, 10);
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor completa todos los campos requeridos.';
      this.triggerErrorShake();
      return;
    }

    this.errorMessage = '';
    this.loading = true;
    this.isSuccess = false;
    this.startLoaderAnimation();

    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        if (res.success) {
          this.isSuccess = true;
          this.stopLoaderAnimation(true);

          if (this.isBrowser) {
            gsap.to(this.loginCardRef?.nativeElement || '.login-card', {
              opacity: 0,
              y: -14,
              duration: 0.45,
              ease: 'power2.in',
              onComplete: () => {
                this.loading = false;
                this.router.navigate(['/home']);
              },
            });
          } else {
            this.loading = false;
            this.router.navigate(['/home']);
          }
        } else {
          this.loading = false;
          this.stopLoaderAnimation(false);
          this.errorMessage = res.message;
          this.triggerErrorShake();
        }
      },
      error: (err) => {
        this.loading = false;
        this.stopLoaderAnimation(false);
        this.errorMessage = err.error?.mensaje || 'Error al conectar con el servidor de autenticación.';
        this.triggerErrorShake();
      },
    });
  }
}
