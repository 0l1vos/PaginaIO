import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export type UserRole = 'admin' | 'user';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  nombreUsuario: string;
  correo: string;
  role: string;
  expiracion: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:5138/api/sesion';
  private readonly tokenKey = 'auth_token';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private currentUserState = signal<UserAccount | null>(null);

  readonly currentUser = this.currentUserState.asReadonly();

  readonly isAdmin = computed(() => this.currentUserState()?.role === 'admin');
  readonly isUser = computed(() => this.currentUserState()?.role === 'user');
  readonly isLoggedIn = computed(() => this.currentUserState() !== null);

  constructor(private http: HttpClient) {
    this.restoreSession();
  }

  login(email: string, password: string): Observable<{ success: boolean; message: string }> {
    const payload = { email: email.trim(), contrasena: password };

    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, payload).pipe(
      map(res => {
        const roleString = (res as any).role || (res as any).rol || 'user';
        const userRole: UserRole = roleString.toLowerCase() === 'admin' ? 'admin' : 'user';

        const user: UserAccount = {
          id: '',
          name: res.nombreUsuario,
          email: res.correo,
          role: userRole,
          createdAt: new Date().toISOString(),
        };

        this.currentUserState.set(user);
        if (this.isBrowser) {
          localStorage.setItem(this.tokenKey, res.token);
          localStorage.setItem('auth_user', JSON.stringify(user));
        }
        return { success: true, message: 'Inicio de sesión exitoso' };
      }),
      catchError(err => {
        const mensaje =
          err.status === 401
            ? 'Credenciales no válidas. Intenta de nuevo.'
            : err.error?.mensaje || 'Error al conectar con el servidor. Verifica tu conexión.';
        return of({ success: false, message: mensaje });
      })
    );
  }

  logout(): void {
    this.currentUserState.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem('auth_user');
    }
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem(this.tokenKey) : null;
  }

  private restoreSession(): void {
    if (!this.isBrowser) return;
    const token = localStorage.getItem(this.tokenKey);
    const userRaw = localStorage.getItem('auth_user');
    if (token && userRaw) {
      try {
        const user: UserAccount = JSON.parse(userRaw);
        this.currentUserState.set(user);
      } catch {
        this.logout();
      }
    }
  }
}