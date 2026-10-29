using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SistemaInventarioAPI.Models
{
    [Table("productos")] 
    public class Producto
    {
        [Key]
        [Column("producto_id")] 
        public int ProductoID { get; set; }

        [Column("codigo_sku")]
        public string CodigoSKU { get; set; } = string.Empty;

        [Column("nombre_producto")]
        public string NombreProducto { get; set; } = string.Empty;

        [Column("descripcion")]
        public string? Descripcion { get; set; }

        [Column("stock_actual")]
        public int StockActual { get; set; }

        [Column("categoria_id")]
        public string CategoriaID { get; set; } = string.Empty;

        [Column("location")]
        public string? Location { get; set; }

        [Column("status")]
        public string Status { get; set; } = "Operativo";

        [Column("fecha_actualizacion")]
        public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;
    }
}