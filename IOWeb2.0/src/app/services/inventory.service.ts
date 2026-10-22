import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';

export type EquipmentStatus = 'Operativo' | 'En Mantenimiento' | 'De Baja';

export interface Equipment {
  productoID: number;
  codigoSKU: string;
  nombreProducto: string;
  descripcion?: string;
  stockActual: number;
  categoriaID: string;
  location?: string;
  status: EquipmentStatus;
  fechaActualizacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private apiUrl = 'http://localhost:5138/api/productos';

  constructor(private http: HttpClient) { }

  private equipmentsSignal = signal<Equipment[]>([]);

  readonly equipments = this.equipmentsSignal.asReadonly();

  readonly totalEquipos = computed(() => this.equipmentsSignal().length);
  readonly operativosCount = computed(() => this.equipmentsSignal().filter(e => e.status === 'Operativo').length);
  readonly mantenimientoCount = computed(() => this.equipmentsSignal().filter(e => e.status === 'En Mantenimiento').length);
  readonly bajaCount = computed(() => this.equipmentsSignal().filter(e => e.status === 'De Baja').length);

  readonly disponibilidadPorcentaje = computed(() => {
    const total = this.totalEquipos();
    if (total === 0) return 0;
    return Math.round((this.operativosCount() / total) * 100);
  });

  readonly categories = computed(() => {
    const set = new Set(this.equipmentsSignal().map(e => e.categoriaID));
    return Array.from(set);
  });

  // (GET)
  loadProductos(): void {
    this.http.get<Equipment[]>(this.apiUrl).pipe(
      catchError(err => {
        console.error('Error al cargar productos:', err);
        return of([]);
      })
    ).subscribe(data => {
      this.equipmentsSignal.set(data);
    });
  }

  //  (POST)
  addEquipment(product: Omit<Equipment, 'productoID' | 'fechaActualizacion'>): void {
    const payload = {
      ...product,
      fechaActualizacion: new Date().toISOString()
    };
    this.http.post<Equipment>(this.apiUrl, payload).pipe(
      catchError(err => {
        console.error('Error al agregar producto:', err.error);
        return of(null);
      })
    ).subscribe(created => {
      if (created) {
        this.equipmentsSignal.update(list => [created, ...list]);
      }
    });
  }

  // (PUT) 
  updateEquipment(id: number, updates: Partial<Equipment>): void {
    const current = this.equipmentsSignal().find(e => e.productoID === id);
    if (!current) return;

    const updated: Equipment = {
      ...current,
      ...updates,
      fechaActualizacion: new Date().toISOString()
    };

    this.http.put(`${this.apiUrl}/${id}`, updated).pipe(
      catchError(err => {
        console.error('Error al actualizar producto:', err);
        return of(null);
      })
    ).subscribe({
      next: (res) => {
        this.equipmentsSignal.update(list =>
          list.map(e => e.productoID === id ? updated : e)
        );
      }
    });
  }

  // (DELETE)
  deleteEquipment(id: number): void {
    this.http.delete(`${this.apiUrl}/${id}`).pipe(
      catchError(err => {
        console.error('Error al eliminar producto:', err);
        return of(null);
      })
    ).subscribe({
      next: () => {
        this.equipmentsSignal.update(list => list.filter(e => e.productoID !== id));
      }
    });
  }

  generateSkuSuggestion(category: string): string {
    const prefixes: Record<string, string> = {
      'Servidores': 'SRV',
      'Redes': 'NET',
      'Laptops': 'LAP',
      'Periféricos': 'PEF',
      'Monitores': 'MON',
      'Impresoras': 'IMP',
      'Otros': 'OTR'
    };
    const prefix = prefixes[category] || 'EQ';
    const random = Math.floor(100 + Math.random() * 900);
    return `SKU-${prefix}-${random}`;
  }
}
