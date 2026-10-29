import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
  signal,
  computed,
  effect,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

import { AuthService, UserAccount, UserRole } from '../../services/auth.service';
import { InventoryService, Equipment, EquipmentStatus } from '../../services/inventory.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatBadgeModule,
    MatProgressBarModule
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit, AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  public authService = inject(AuthService);
  public inventoryService = inject(InventoryService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  isBrowser = false;
  sidebarOpen = true;

  searchTerm = '';
  selectedStatusFilter: EquipmentStatus | 'Todos' = 'Todos';

  @ViewChild('statusChartRef') statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChartRef') categoryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendChartRef') trendChartRef!: ElementRef<HTMLCanvasElement>;

  private statusChartInstance: Chart | null = null;
  private categoryChartInstance: Chart | null = null;
  private trendChartInstance: Chart | null = null;

  showAddEquipmentModal = false;
  showEditEquipmentModal = false;
  showUserManagementModal = false;
  showDetailModal = false;

  selectedEquipment: Equipment | null = null;

  newEquipment: {
    codigoSKU: string;
    nombreProducto: string;
    descripcion: string;
    categoriaID: string;
    location: string;
    status: EquipmentStatus;
    stockActual: number;
  } = {
      codigoSKU: '',
      nombreProducto: '',
      descripcion: '',
      categoriaID: '',
      location: '',
      status: 'Operativo',
      stockActual: 0
    };

  editEquipmentForm: {
    productoID: number;
    codigoSKU: string;
    nombreProducto: string;
    descripcion: string;
    categoriaID: string;
    location: string;
    status: EquipmentStatus;
    stockActual: number;
  } = {
      productoID: 0,
      codigoSKU: '',
      nombreProducto: '',
      descripcion: '',
      categoriaID: '',
      location: '',
      status: 'Operativo',
      stockActual: 0
    };

  newUserForm: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  } = {
      name: '',
      email: '',
      password: '',
      role: 'user'
    };
  usersList: any[] = [];

  feedbackMessage: { text: string; type: 'success' | 'error' } | null = null;

  readonly categoryOption: string[] = [
    'Servidores',
    'Redes & Switches',
    'Laptops & Portátiles',
    'Periféricos',
    'Monitores',
    'Impresoras',
    'Otros'

  ];

  readonly statusOptions: EquipmentStatus[] = [
    'Operativo',
    'En Mantenimiento',
    'De Baja'
  ];

  constructor() {
    effect(() => {
      const _ = this.inventoryService.equipments();
      if (this.isBrowser) {
        setTimeout(() => this.updateCharts(), 50);
      }
    });
  }

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.inventoryService.loadProductos();
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      setTimeout(() => {
        this.initCharts();
      }, 150);
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  getCategoryName(categoriaID: string): string {
    return categoriaID || `Sin Categoría`;
  }

  get filteredEquipments(): Equipment[] {
    const list = this.inventoryService.equipments();
    const term = this.searchTerm.toLowerCase().trim();
    const status = this.selectedStatusFilter;

    return list.filter(item => {
      const matchesStatus = status === 'Todos' || item.status === status;
      if (!matchesStatus) return false;

      if (!term) return true;

      return (
        item.codigoSKU.toLowerCase().includes(term) ||
        item.nombreProducto.toLowerCase().includes(term) ||
        (item.descripcion || '').toLowerCase().includes(term) ||
        (item.location || '').toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term)
      );
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  setStatusFilter(status: EquipmentStatus | 'Todos'): void {
    this.selectedStatusFilter = status;
  }


  openEquipmentDetail(item: Equipment): void {
    this.selectedEquipment = item;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedEquipment = null;
  }

  openAddEquipmentModal(): void {
    if (!this.authService.isAdmin()) {
      this.showToast('Acceso denegado: solo administradores pueden registrar equipos.', 'error');
      return;
    }
    this.newEquipment = {
      codigoSKU: this.inventoryService.generateSkuSuggestion('Servidores & Rack'),
      nombreProducto: '',
      descripcion: '',
      categoriaID: '',
      location: '',
      status: 'Operativo',
      stockActual: 0
    };
    this.showAddEquipmentModal = true;
  }

  closeAddEquipmentModal(): void {
    this.showAddEquipmentModal = false;
  }

  suggestSku(): void {
    const catName = this.newEquipment.categoriaID;
    this.newEquipment.codigoSKU = this.inventoryService.generateSkuSuggestion(catName);
  }

  submitAddEquipment(): void {
    if (!this.newEquipment.codigoSKU.trim() || !this.newEquipment.nombreProducto.trim() || !this.newEquipment.categoriaID) {
      this.showToast('Por favor completa el código SKU, nombre y selecciona una categoría.', 'error');
      return;
    }

    const payload = {
      codigoSKU: this.newEquipment.codigoSKU.trim(),
      nombreProducto: this.newEquipment.nombreProducto.trim(),
      descripcion: this.newEquipment.descripcion?.trim() || '',
      categoriaID: this.newEquipment.categoriaID,
      location: this.newEquipment.location?.trim() || 'Almacén General',
      status: this.newEquipment.status,
      stockActual: Number(this.newEquipment.stockActual) || 0
    };

    const request = this.inventoryService.addEquipment(payload) as any;

    if (request && typeof request.subscribe === 'function') {
      request.subscribe({
        next: () => {
          this.showToast(`Equipo ${this.newEquipment.nombreProducto} registrado exitosamente.`, 'success');
          this.inventoryService.loadProductos();
          this.closeAddEquipmentModal();
        },
        error: (err: any) => {
          this.showToast('Error al registrar el equipo en el servidor.', 'error');
          console.error(err);
        }
      });
    } else {
      this.showToast(`Equipo ${this.newEquipment.nombreProducto} registrado exitosamente.`, 'success');
      this.closeAddEquipmentModal();
    }
  }

  openEditEquipmentModal(item: any): void {
    if (!this.authService.isAdmin()) {
      this.showToast('Acceso denegado: solo administradores pueden modificar equipos.', 'error');
      return;
    }

    if (!item) {
      this.showToast('No se pudo cargar la información del equipo para editar.', 'error');
      console.error('Item vacío en openEditEquipmentModal', item);
      return;
    }

    this.editEquipmentForm = {
      productoID: item.productoID || item.productoId || item.producto_id || 0,
      codigoSKU: item.codigoSKU || item.codigoSku || item.codigo_sku || '',
      nombreProducto: item.nombreProducto || item.nombre_producto || '',
      descripcion: item.descripcion || '',
      categoriaID: item.categoriaID ? String(item.categoriaID).trim() : '',
      location: item.location || '',
      status: item.status || 'Operativo',
      stockActual: Number(item.stockActual) || 0
    };

    this.showEditEquipmentModal = true;
  }

  closeEditEquipmentModal(): void {
    this.showEditEquipmentModal = false;
  }

  submitEditEquipment(): void {
    if (!this.editEquipmentForm.codigoSKU.trim() || !this.editEquipmentForm.nombreProducto.trim()) {
      this.showToast('Por favor completa el código SKU y el nombre del equipo.', 'error');
      return;
    }

    const payload = {
      codigoSKU: this.editEquipmentForm.codigoSKU.trim(),
      nombreProducto: this.editEquipmentForm.nombreProducto.trim(),
      descripcion: this.editEquipmentForm.descripcion?.trim() || '',
      categoriaID: this.editEquipmentForm.categoriaID,
      location: this.editEquipmentForm.location?.trim() || 'Almacén General',
      status: this.editEquipmentForm.status,
      stockActual: Number(this.editEquipmentForm.stockActual) || 0
    };

    const request = this.inventoryService.updateEquipment(this.editEquipmentForm.productoID, payload) as any;

    if (request && typeof request.subscribe === 'function') {
      request.subscribe({
        next: () => {
          this.showToast('Equipo actualizado correctamente.', 'success');
          this.inventoryService.loadProductos();
          this.closeEditEquipmentModal();
        },
        error: (err: any) => {
          this.showToast('Error al actualizar el equipo.', 'error');
          console.error(err);
        }
      });
    } else {
      this.showToast('Equipo actualizado correctamente.', 'success');
      this.closeEditEquipmentModal();
    }
  }

  quickChangeStatus(item: Equipment, newStatus: EquipmentStatus): void {
    if (!this.authService.isAdmin()) return;
    this.inventoryService.updateEquipment(item.productoID, { status: newStatus });
    this.showToast(`Estado de ${item.codigoSKU} actualizado a "${newStatus}"`, 'success');
  }

  deleteEquipment(item: Equipment): void {
    if (!this.authService.isAdmin()) {
      this.showToast('Acceso denegado: solo administradores pueden eliminar equipos.', 'error');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar el equipo "${item.nombreProducto}" (${item.codigoSKU}) del inventario?`)) {
      this.inventoryService.deleteEquipment(item.productoID);
      this.showToast('Equipo eliminado del inventario.', 'success');
    }
  }

  openUserManagementModal(): void {
    if (!this.authService.isAdmin()) {
      this.showToast('Acceso denegado: solo administradores pueden gestionar usuarios.', 'error');
      return;
    }
    this.newUserForm = { name: '', email: '', password: '', role: 'user' };
    this.showUserManagementModal = true;
    this.loadUsers();
  }

  loadUsers(): void {
    this.http.get<any[]>('http://localhost:5138/api/sesion/usuarios').subscribe({
      next: (res) => {
        this.usersList = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar usuarios', err);
        this.showToast('No se pudo cargar la lista de usuarios', 'error');
      }
    });
  }

  closeUserManagementModal(): void {
    this.showUserManagementModal = false;
  }

  submitRegisterUser(): void {
    if (!this.newUserForm.name.trim() || !this.newUserForm.email.trim() || !this.newUserForm.password.trim()) {
      this.showToast('Por favor ingresa nombre, correo y contraseña para el nuevo usuario.', 'error');
      return;
    }

    const payload = {
      nombreUsuario: this.newUserForm.name.trim(),
      correo: this.newUserForm.email.trim(),
      contrasena: this.newUserForm.password,
      rolID: this.newUserForm.role === 'admin' ? 1 : 2
    };

    this.http.post('http://localhost:5138/api/sesion/registro', payload).subscribe({
      next: () => {
        this.showToast(`Usuario ${this.newUserForm.name} registrado con éxito.`, 'success');
        this.closeUserManagementModal();
      },
      error: (err) => {
        const mensajeError = err.error?.mensaje || 'Error al conectar con el servidor';
        this.showToast(mensajeError, 'error');
        console.error(err);
      }
    });
  }

  deleteUser(user: any): void {
    const currentUser = this.authService.currentUser();
    if (currentUser && user.email === currentUser.email) {
      this.showToast('Acción denegada: No puedes eliminar tu propia cuenta mientras estás en sesión.', 'error');
      return;
    }

    if (confirm(`¿Estás seguro de eliminar permanentemente al usuario "${user.nombre}"? Esta acción no se puede deshacer.`)) {

      this.http.delete(`http://localhost:5138/api/sesion/usuarios/${user.usuarioID}`).subscribe({
        next: () => {
          this.showToast(`Usuario ${user.nombre} eliminado correctamente.`, 'success');
          this.loadUsers();
        },
        error: (err) => {
          console.error('Error al eliminar usuario', err);
          this.showToast('Error al intentar eliminar el usuario del servidor.', 'error');
        }
      });
    }
  }

  logout(): void {
    this.authService.logout();

    localStorage.clear();
    sessionStorage.clear();

    this.router.navigate(['/']);
  }

  showToast(text: string, type: 'success' | 'error'): void {
    this.feedbackMessage = { text, type };
    setTimeout(() => {
      this.feedbackMessage = null;
    }, 4500);
  }

  getStatusBadgeClass(status: EquipmentStatus): string {
    switch (status) {
      case 'Operativo':
        return 'status-badge-operativo';
      case 'En Mantenimiento':
        return 'status-badge-mantenimiento';
      case 'De Baja':
        return 'status-badge-baja';
      default:
        return 'status-badge-neutral';
    }
  }


  private initCharts(): void {
    if (!this.isBrowser) return;

    if (this.statusChartRef?.nativeElement) {
      const ctx = this.statusChartRef.nativeElement.getContext('2d');
      if (ctx) {
        this.statusChartInstance = new Chart(ctx, {
          type: 'doughnut',
          data: this.getStatusChartData(),
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 12,
                  padding: 16,
                  font: { family: "'Plus Jakarta Sans', sans-serif", weight: 600, size: 12 },
                  color: '#475569'
                }
              },
              tooltip: {
                backgroundColor: '#0f172a',
                padding: 12,
                cornerRadius: 8,
                titleFont: { family: "'Plus Jakarta Sans', sans-serif", weight: 700 },
                bodyFont: { family: "'Plus Jakarta Sans', sans-serif" }
              }
            }
          }
        });
      }
    }

    if (this.categoryChartRef?.nativeElement) {
      const ctx = this.categoryChartRef.nativeElement.getContext('2d');
      if (ctx) {
        this.categoryChartInstance = new Chart(ctx, {
          type: 'bar',
          data: this.getCategoryChartData(),
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#0f172a',
                padding: 10,
                cornerRadius: 8
              }
            },
            scales: {
              x: {
                ticks: {
                  color: '#64748b',
                  font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }
                },
                grid: { display: false }
              },
              y: {
                ticks: {
                  color: '#64748b',
                  stepSize: 1,
                  font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }
                },
                grid: {
                  color: 'rgba(226, 232, 240, 0.7)'
                }
              }
            }
          }
        });
      }
    }

    if (this.trendChartRef?.nativeElement) {
      const ctx = this.trendChartRef.nativeElement.getContext('2d');
      if (ctx) {
        this.trendChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'],
            datasets: [
              {
                label: 'Equipos Activos',
                data: [6, 7, 8, 8, 9, this.inventoryService.totalEquipos()],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.35,
                fill: true,
                pointBackgroundColor: '#2563eb',
                pointRadius: 4
              },
              {
                label: 'Mantenimientos',
                data: [1, 2, 1, 3, 2, this.inventoryService.mantenimientoCount()],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.05)',
                borderDash: [5, 5],
                tension: 0.35,
                fill: true,
                pointBackgroundColor: '#f59e0b',
                pointRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                align: 'end',
                labels: {
                  boxWidth: 10,
                  font: { family: "'Plus Jakarta Sans', sans-serif", weight: 600, size: 11 },
                  color: '#475569'
                }
              }
            },
            scales: {
              x: {
                ticks: { color: '#64748b', font: { size: 11 } },
                grid: { display: false }
              },
              y: {
                ticks: { color: '#64748b', font: { size: 11 } },
                grid: { color: 'rgba(226, 232, 240, 0.7)' }
              }
            }
          }
        });
      }
    }
  }

  private updateCharts(): void {
    if (!this.isBrowser) return;

    if (this.statusChartInstance) {
      this.statusChartInstance.data = this.getStatusChartData();
      this.statusChartInstance.update();
    }

    if (this.categoryChartInstance) {
      this.categoryChartInstance.data = this.getCategoryChartData();
      this.categoryChartInstance.update();
    }

    if (this.trendChartInstance) {
      const data = this.trendChartInstance.data;
      if (data.datasets[0]) {
        data.datasets[0].data[5] = this.inventoryService.totalEquipos();
      }
      if (data.datasets[1]) {
        data.datasets[1].data[5] = this.inventoryService.mantenimientoCount();
      }
      this.trendChartInstance.update();
    }
  }

  private getStatusChartData(): any {
    return {
      labels: ['Operativo', 'En Mantenimiento', 'De Baja'],
      datasets: [
        {
          data: [
            this.inventoryService.operativosCount(),
            this.inventoryService.mantenimientoCount(),
            this.inventoryService.bajaCount()
          ],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          hoverBackgroundColor: ['#059669', '#d97706', '#dc2626'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    };
  }

  private getCategoryChartData(): any {
    const counts: Record<string, number> = {};
    for (const eq of this.inventoryService.equipments()) {
      const catName = eq.categoriaID;
      counts[catName] = (counts[catName] || 0) + 1;
    }

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    return {
      labels,
      datasets: [
        {
          label: 'Cantidad de Equipos',
          data,
          backgroundColor: [
            '#3b82f6',
            '#6366f1',
            '#06b6d4',
            '#10b981',
            '#f59e0b',
            '#8b5cf6',
            '#ec4899',
            '#64748b'
          ],
          borderRadius: 6
        }
      ]
    };
  }

  private destroyCharts(): void {
    if (this.statusChartInstance) {
      this.statusChartInstance.destroy();
      this.statusChartInstance = null;
    }
    if (this.categoryChartInstance) {
      this.categoryChartInstance.destroy();
      this.categoryChartInstance = null;
    }
    if (this.trendChartInstance) {
      this.trendChartInstance.destroy();
      this.trendChartInstance = null;
    }
  }
}
