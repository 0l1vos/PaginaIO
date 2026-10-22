import { Injectable, signal, computed } from '@angular/core';

export type UserRole = 'admin' | 'user';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private usersList = signal<UserAccount[]>([
    {
      id: 'USR-001',
      name: 'Admin(Admin)',
      email: 'admin@correo.com',
      password: 'password123',
      role: 'admin',
      createdAt: '2026-01-10'
    },
    {
      id: 'USR-002',
      name: 'User (Consulta)',
      email: 'usuario@correo.com',
      password: 'password123',
      role: 'user',
      createdAt: '2026-02-15'
    }
  ]);

  private currentUserState = signal<UserAccount | null>(this.usersList()[0]); // Por defecto admin

  readonly currentUser = this.currentUserState.asReadonly();
  readonly allUsers = this.usersList.asReadonly();

  readonly isAdmin = computed(() => this.currentUserState()?.role === 'admin');

  readonly isUser = computed(() => this.currentUserState()?.role === 'user');


  login(email: string, pass: string): boolean {
    const found = this.usersList().find(
      u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === pass
    );

    if (found) {
      this.currentUserState.set(found);
      return true;
    }
    return false;
  }

  switchRole(targetRole: UserRole): void {
    const target = this.usersList().find(u => u.role === targetRole);
    if (target) {
      this.currentUserState.set(target);
    } else {
      const current = this.currentUserState();
      if (current) {
        this.currentUserState.set({ ...current, role: targetRole });
      }
    }
  }

  registerUser(user: { name: string; email: string; password?: string; role: UserRole }): { success: boolean; message: string } {
    if (!this.isAdmin()) {
      return { success: false, message: 'Acceso denegado: solo administradores pueden registrar usuarios.' };
    }

    const emailExists = this.usersList().some(u => u.email.toLowerCase() === user.email.toLowerCase().trim());
    if (emailExists) {
      return { success: false, message: 'El correo electrónico ya se encuentra registrado.' };
    }

    const newId = `USR-00${this.usersList().length + 1}`;
    const newUser: UserAccount = {
      id: newId,
      name: user.name.trim(),
      email: user.email.toLowerCase().trim(),
      password: user.password || 'password123',
      role: user.role,
      createdAt: new Date().toISOString().split('T')[0]
    };

    this.usersList.update(list => [newUser, ...list]);
    return { success: true, message: `Usuario ${newUser.name} registrado con éxito con rol ${newUser.role}.` };
  }


  deleteUser(userId: string): { success: boolean; message: string } {
    if (!this.isAdmin()) {
      return { success: false, message: 'Solo administradores pueden eliminar usuarios.' };
    }
    const current = this.currentUserState();
    if (current && current.id === userId) {
      return { success: false, message: 'No puedes eliminar tu propio usuario activo.' };
    }
    this.usersList.update(list => list.filter(u => u.id !== userId));
    return { success: true, message: 'Usuario eliminado del sistema.' };
  }


  logout(): void {
    this.currentUserState.set(null);
  }
}
