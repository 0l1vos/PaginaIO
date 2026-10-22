import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private router = inject(Router);
  private authService = inject(AuthService);

  email = 'admin@correo.com';
  password = 'password123';
  showPassword = false;
  errorMessage = '';

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.errorMessage = '';
    const success = this.authService.login(this.email, this.password);
    if (success) {
      this.router.navigate(['/home']);
    } else {
      this.errorMessage = 'Credenciales no válidas. Intenta de nuevo';
    }
  }
}
