import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private router = inject(Router);

  email = '';
  password = '';
  showPassword = false;
  errorMessage = '';


  //Usuario de prueba
  private readonly mockUser = {
    email: 'admin@correo.com',
    password: 'password123',
  };

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.errorMessage = '';
    if (this.email === this.mockUser.email && this.password === this.mockUser.password) {
      console.log('Login exitoso.');
      this.router.navigate(['/home']);
    } else {
      this.errorMessage = 'Credenciales incorrectas. Intenta de nuevo.';
    }
  }
}
