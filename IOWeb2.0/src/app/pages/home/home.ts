import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  effect,
  HostListener
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

import { AuthService, UserRole } from '../../services/auth.service';
import { InventoryService, Equipment, EquipmentStatus } from '../../services/inventory.service';
import * as QRCode from 'qrcode';
import { environment } from '../../../environments/environment';

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
  isMobile = false;
  sidebarOpen = true;

  searchTerm = '';
  selectedStatusFilter: EquipmentStatus | 'Todos' = 'Todos';
  selectedCategoryFilter = 'Todas';
  sortBy:
    | 'recent'
    | 'sku-asc'
    | 'sku-desc'
    | 'name-asc'
    | 'name-desc'
    | 'cat-asc'
    | 'cat-desc'
    | 'stock-asc'
    | 'stock-desc' = 'recent';
  viewMode: 'table' | 'cards' = 'table';

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
  showQrModal = false;
  qrEquipment: Equipment | null = null;
  qrDataUrl = '';
  qrMode: 'sku' | 'json' | 'url' = 'sku';
  qrLoading = false;

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
  feedbackMessage: { text: string; type: 'success' | 'error' | 'info' } | null = null;

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

  private onResizeBound = () => this.checkScreenSize();

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
    if (this.isBrowser) {
      this.checkScreenSize();
      window.addEventListener('resize', this.onResizeBound);
    }
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
    if (this.isBrowser) {
      window.removeEventListener('resize', this.onResizeBound);
    }
    this.destroyCharts();
  }

  checkScreenSize(): void {
    if (!this.isBrowser) return;
    const mobile = window.innerWidth <= 900;
    if (mobile !== this.isMobile) {
      this.isMobile = mobile;
      this.sidebarOpen = !mobile;
      if (window.innerWidth <= 640) {
        this.viewMode = 'cards';
      }
      this.cdr.detectChanges();
    }
  }

  getCategoryName(categoriaID: string): string {
    return categoriaID || 'Sin Categoría';
  }

  get filteredEquipments(): Equipment[] {
    const list = this.inventoryService.equipments();
    const term = this.searchTerm.toLowerCase().trim();
    const status = this.selectedStatusFilter;
    const category = this.selectedCategoryFilter;

    let result = list.filter(item => {
      const matchesStatus = status === 'Todos' || item.status === status;
      if (!matchesStatus) return false;

      const matchesCategory = category === 'Todas' || item.categoriaID === category;
      if (!matchesCategory) return false;

      if (!term) return true;

      return (
        item.codigoSKU.toLowerCase().includes(term) ||
        item.nombreProducto.toLowerCase().includes(term) ||
        (item.descripcion || '').toLowerCase().includes(term) ||
        (item.location || '').toLowerCase().includes(term) ||
        (item.categoriaID || '').toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term)
      );
    });

    switch (this.sortBy) {
      case 'sku-asc':
        result = [...result].sort((a, b) => a.codigoSKU.localeCompare(b.codigoSKU));
        break;
      case 'sku-desc':
        result = [...result].sort((a, b) => b.codigoSKU.localeCompare(a.codigoSKU));
        break;
      case 'name-asc':
        result = [...result].sort((a, b) => a.nombreProducto.localeCompare(b.nombreProducto));
        break;
      case 'name-desc':
        result = [...result].sort((a, b) => b.nombreProducto.localeCompare(a.nombreProducto));
        break;
      case 'cat-asc':
        result = [...result].sort((a, b) => (a.categoriaID || '').localeCompare(b.categoriaID || ''));
        break;
      case 'cat-desc':
        result = [...result].sort((a, b) => (b.categoriaID || '').localeCompare(a.categoriaID || ''));
        break;
      case 'stock-desc':
        result = [...result].sort((a, b) => b.stockActual - a.stockActual);
        break;
      case 'stock-asc':
        result = [...result].sort((a, b) => a.stockActual - b.stockActual);
        break;
      case 'recent':
      default:
        break;
    }

    return result;
  }

  get activeFiltersCount(): number {
    let count = 0;
    if (this.searchTerm.trim()) count++;
    if (this.selectedStatusFilter !== 'Todos') count++;
    if (this.selectedCategoryFilter !== 'Todas') count++;
    if (this.sortBy !== 'recent') count++;
    return count;
  }

  setSortColumn(column: 'sku' | 'name' | 'stock' | 'category'): void {
    if (column === 'sku') {
      this.sortBy = this.sortBy === 'sku-asc' ? 'sku-desc' : 'sku-asc';
    } else if (column === 'name') {
      this.sortBy = this.sortBy === 'name-asc' ? 'name-desc' : 'name-asc';
    } else if (column === 'stock') {
      this.sortBy = this.sortBy === 'stock-desc' ? 'stock-asc' : 'stock-desc';
    } else if (column === 'category') {
      this.sortBy = this.sortBy === 'cat-asc' ? 'cat-desc' : 'cat-asc';
    }
  }

  @HostListener('window:keydown.escape')
  handleEscapeKey(): void {
    if (this.showQrModal) {
      this.closeQrModal();
    } else if (this.showDetailModal) {
      this.closeDetailModal();
    } else if (this.showAddEquipmentModal) {
      this.closeAddEquipmentModal();
    } else if (this.showEditEquipmentModal) {
      this.closeEditEquipmentModal();
    } else if (this.showUserManagementModal) {
      this.closeUserManagementModal();
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeMobileSidebar(): void {
    if (this.isMobile) {
      this.sidebarOpen = false;
    }
  }

  setStatusFilter(status: EquipmentStatus | 'Todos'): void {
    this.selectedStatusFilter = status;
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatusFilter = 'Todos';
    this.selectedCategoryFilter = 'Todas';
    this.sortBy = 'recent';
    this.currentPage = 1;
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
      codigoSKU: this.inventoryService.generateSkuSuggestion('Servidores'),
      nombreProducto: '',
      descripcion: '',
      categoriaID: 'Servidores',
      location: '',
      status: 'Operativo',
      stockActual: 1
    };
    this.showAddEquipmentModal = true;
  }

  closeAddEquipmentModal(): void {
    this.showAddEquipmentModal = false;
  }

  suggestSku(): void {
    const catName = this.newEquipment.categoriaID || 'Otros';
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
      location: this.newEquipment.location?.trim() || 'Almacén Central',
      status: this.newEquipment.status,
      stockActual: Number(this.newEquipment.stockActual) || 0
    };

    const request = this.inventoryService.addEquipment(payload) as any;

    if (request && typeof request.subscribe === 'function') {
      request.subscribe({
        next: () => {
          this.showToast(`Equipo "${this.newEquipment.nombreProducto}" registrado exitosamente.`, 'success');
          this.inventoryService.loadProductos();
          this.closeAddEquipmentModal();
        },
        error: (err: any) => {
          this.showToast('Error al registrar el equipo en el servidor.', 'error');
          console.error(err);
        }
      });
    } else {
      this.showToast(`Equipo "${this.newEquipment.nombreProducto}" registrado exitosamente.`, 'success');
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
      return;
    }

    this.editEquipmentForm = {
      productoID: item.productoID || item.productoId || item.producto_id || 0,
      codigoSKU: item.codigoSKU || item.codigoSku || item.codigo_sku || '',
      nombreProducto: item.nombreProducto || item.nombre_producto || '',
      descripcion: item.descripcion || '',
      categoriaID: item.categoriaID ? String(item.categoriaID).trim() : 'Servidores',
      location: item.location || '',
      status: item.status || 'Operativo',
      stockActual: Number(item.stockActual) || 0
    };

    this.showEditEquipmentModal = true;
  }

  closeEditEquipmentModal(): void {
    this.showEditEquipmentModal = false;
  }

  currentPage = 1;
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 25, 50, 100];
  jumpToPageInput: number | null = null;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEquipments.length / this.pageSize));
  }

  get pagesList(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }

    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  // Slice de elementos reactivos que se renderizan en la página activa
  get paginatedEquipments(): Equipment[] {
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredEquipments.slice(startIndex, startIndex + this.pageSize);
  }


  get startIndexDisplay(): number {
    if (this.filteredEquipments.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndexDisplay(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredEquipments.length);
  }

  // Métodos de control de navegación con scroll suave
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.scrollToTableTop();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.scrollToTableTop();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.scrollToTableTop();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.scrollToTableTop();
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  applyJumpPage(): void {
    if (this.jumpToPageInput && this.jumpToPageInput >= 1 && this.jumpToPageInput <= this.totalPages) {
      this.goToPage(this.jumpToPageInput);
      this.jumpToPageInput = null;
    } else {
      this.showToast(`Por favor ingresa un número de página válido entre 1 y ${this.totalPages}.`, 'info');
    }
  }

  private scrollToTableTop(): void {
    if (!this.isBrowser) return;
    const tableEl = document.getElementById('catalogTableCard');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  async openQrModal(equipment: Equipment, mode: 'sku' | 'json' | 'url' = 'sku'): Promise<void> {
    if (!equipment) return;
    this.qrEquipment = equipment;
    this.qrMode = mode;
    this.showQrModal = true;
    await this.generateQrDataUrl();
  }

  closeQrModal(): void {
    this.showQrModal = false;
    this.qrEquipment = null;
    this.qrDataUrl = '';
  }

  async changeQrMode(mode: 'sku' | 'json' | 'url'): Promise<void> {
    if (this.qrMode === mode) return;
    this.qrMode = mode;
    await this.generateQrDataUrl();
  }

  private async generateQrDataUrl(): Promise<void> {
    if (!this.qrEquipment) return;
    this.qrLoading = true;

    let payload = '';
    if (this.qrMode === 'sku') {
      payload = this.qrEquipment.codigoSKU;
    } else if (this.qrMode === 'json') {
      payload = JSON.stringify({
        sku: this.qrEquipment.codigoSKU,
        nombre: this.qrEquipment.nombreProducto,
        categoria: this.getCategoryName(this.qrEquipment.categoriaID),
        ubicacion: this.qrEquipment.location || 'Almacén Central',
        estado: this.qrEquipment.status,
        stock: this.qrEquipment.stockActual,
        actualizado: this.qrEquipment.fechaActualizacion
      }, null, 2);
    } else if (this.qrMode === 'url') {
      payload = `https://inventarioio.vercel.app/`;
    }

    try {
      this.qrDataUrl = await QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#202020',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
    } catch (err) {
      console.error('Error al generar código QR', err);
      this.showToast('No se pudo generar la matriz QR.', 'error');
    } finally {
      this.qrLoading = false;
      this.cdr.detectChanges();
    }
  }

  downloadQrImage(): void {
    if (!this.qrDataUrl || !this.qrEquipment || !this.isBrowser) return;

    const link = document.createElement('a');
    link.href = this.qrDataUrl;
    link.download = `QR-${this.qrEquipment.codigoSKU}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`Código QR descargado: ${this.qrEquipment.codigoSKU}`, 'success');
  }

  printQrTag(): void {
    if (!this.isBrowser) return;
    window.print();
  }

  async copyQrImage(): Promise<void> {
    if (!this.qrDataUrl || !this.qrEquipment || !this.isBrowser) return;

    try {
      if (navigator.clipboard && (window as any).ClipboardItem) {
        const res = await fetch(this.qrDataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        this.showToast('Imagen del código QR copiada al portapapeles.', 'success');
      } else {
        await navigator.clipboard.writeText(this.qrEquipment.codigoSKU);
        this.showToast(`SKU ${this.qrEquipment.codigoSKU} copiado al portapapeles.`, 'info');
      }
    } catch {
      await navigator.clipboard.writeText(this.qrEquipment.codigoSKU);
      this.showToast(`SKU ${this.qrEquipment.codigoSKU} copiado al portapapeles.`, 'info');
    }
  }

  submitEditEquipment(): void {
    if (!this.editEquipmentForm.codigoSKU.trim() || !this.editEquipmentForm.nombreProducto.trim()) {
      this.showToast('Por favor completa el código SKU y el nombre del equipo.', 'error');
      return;
    }

    const payload = {
      productoID: this.editEquipmentForm.productoID,
      codigoSKU: this.editEquipmentForm.codigoSKU.trim(),
      nombreProducto: this.editEquipmentForm.nombreProducto.trim(),
      descripcion: this.editEquipmentForm.descripcion?.trim() || '',
      categoriaID: this.editEquipmentForm.categoriaID,
      location: this.editEquipmentForm.location?.trim() || 'Almacén Central',
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
          this.showToast('Error al actualizar el equipo en el servidor.', 'error');
          console.error(err);
        }
      });
    } else {
      this.showToast('Equipo actualizado correctamente.', 'success');
      this.closeEditEquipmentModal();
    }
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
    this.http.get<any[]>(`${environment.apiUrl}/sesion/usuarios`).subscribe({
      next: (res) => {
        this.usersList = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar usuarios', err);
        this.showToast('No se pudo cargar la lista de usuarios.', 'error');
      }
    });
  }

  closeUserManagementModal(): void {
    this.showUserManagementModal = false;
  }

  submitRegisterUser(): void {
    if (!this.newUserForm.name.trim() || !this.newUserForm.email.trim() || !this.newUserForm.password.trim()) {
      this.showToast('Por favor completa todos los campos del nuevo usuario.', 'error');
      return;
    }

    const payload = {
      nombreUsuario: this.newUserForm.name.trim(),
      correo: this.newUserForm.email.trim(),
      contrasena: this.newUserForm.password,
      rolID: this.newUserForm.role === 'admin' ? 1 : 2
    };

    this.http.post(`${environment.apiUrl}/sesion/registro`, payload).subscribe({
      next: () => {
        this.showToast(`Usuario "${this.newUserForm.name}" registrado con éxito.`, 'success');
        this.newUserForm = { name: '', email: '', password: '', role: 'user' };
        this.loadUsers();
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
      this.showToast('Acción denegada: No puedes eliminar tu propia cuenta en sesión.', 'error');
      return;
    }

    if (confirm(`¿Estás seguro de eliminar al usuario "${user.nombre}"?`)) {
      this.http.delete(`${environment.apiUrl}/sesion/usuarios/${user.usuarioID}`).subscribe({
        next: () => {
          this.showToast(`Usuario "${user.nombre}" eliminado correctamente.`, 'success');
          this.loadUsers();
        },
        error: (err) => {
          console.error('Error al eliminar usuario', err);
          this.showToast('Error al intentar eliminar el usuario.', 'error');
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

  showToast(text: string, type: 'success' | 'error' | 'info'): void {
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

  copySku(sku: string): void {
    if (!sku) return;
    if (this.isBrowser && navigator.clipboard) {
      navigator.clipboard.writeText(sku).then(() => {
        this.showToast(`Código SKU "${sku}" copiado al portapapeles`, 'success');
      }).catch(() => {
        this.showToast(`SKU: ${sku}`, 'success');
      });
    } else {
      this.showToast(`SKU: ${sku}`, 'success');
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
            cutout: '76%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 10,
                  padding: 16,
                  font: { family: "'Space Grotesk', sans-serif", weight: 400, size: 12 },
                  color: '#4d4d4d'
                }
              },
              tooltip: {
                backgroundColor: '#202020',
                padding: 10,
                cornerRadius: 0,
                titleFont: { family: "'Space Grotesk', sans-serif", weight: 400 },
                bodyFont: { family: "'Inter', sans-serif", size: 12 }
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
                backgroundColor: '#202020',
                padding: 10,
                cornerRadius: 0,
                titleFont: { family: "'Space Grotesk', sans-serif", weight: 400 },
                bodyFont: { family: "'Inter', sans-serif", size: 12 }
              }
            },
            scales: {
              x: {
                ticks: {
                  color: '#828282',
                  font: { family: "'Inter', sans-serif", size: 11 }
                },
                grid: { display: false }
              },
              y: {
                ticks: {
                  color: '#828282',
                  stepSize: 1,
                  font: { family: "'Inter', sans-serif", size: 11 }
                },
                grid: {
                  color: '#e8e8e8'
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
                borderColor: '#ff682c',
                backgroundColor: 'rgba(255, 104, 44, 0.05)',
                tension: 0.25,
                fill: true,
                pointBackgroundColor: '#ff682c',
                pointRadius: 3,
                borderWidth: 2
              },
              {
                label: 'Mantenimientos',
                data: [1, 2, 1, 3, 2, this.inventoryService.mantenimientoCount()],
                borderColor: '#816729',
                backgroundColor: 'transparent',
                borderDash: [4, 4],
                tension: 0.25,
                fill: false,
                pointBackgroundColor: '#816729',
                pointRadius: 3,
                borderWidth: 1.5
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
                  font: { family: "'Space Grotesk', sans-serif", weight: 400, size: 11 },
                  color: '#4d4d4d'
                }
              },
              tooltip: {
                backgroundColor: '#202020',
                padding: 10,
                cornerRadius: 0,
                titleFont: { family: "'Space Grotesk', sans-serif", weight: 400 },
                bodyFont: { family: "'Inter', sans-serif", size: 12 }
              }
            },
            scales: {
              x: {
                ticks: { color: '#828282', font: { family: "'Inter', sans-serif", size: 11 } },
                grid: { display: false }
              },
              y: {
                ticks: { color: '#828282', font: { family: "'Inter', sans-serif", size: 11 } },
                grid: { color: '#e8e8e8' }
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
          backgroundColor: ['#202020', '#ff682c', '#828282'],
          hoverBackgroundColor: ['#333333', '#e0531b', '#666666'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    };
  }

  private getCategoryChartData(): any {
    const counts: Record<string, number> = {};
    for (const eq of this.inventoryService.equipments()) {
      const catName = eq.categoriaID || 'Otros';
      counts[catName] = (counts[catName] || 0) + 1;
    }

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    const maxVal = Math.max(...data, 0);
    const backgroundColors = data.map(val => val === maxVal && val > 0 ? '#ff682c' : '#202020');

    return {
      labels,
      datasets: [
        {
          label: 'Cantidad de Equipos',
          data,
          backgroundColor: backgroundColors,
          borderRadius: 0
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
