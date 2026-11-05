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

        [Required]
        [MaxLength(50)]
        [Column("codigo_sku")]
        public string CodigoSKU { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        [Column("nombre_producto")]
        public string NombreProducto { get; set; } = string.Empty;

        [MaxLength(500)]
        [Column("descripcion")]
        public string? Descripcion { get; set; }

        [Range(0, 1_000_000)]
        [Column("stock_actual")]
        public int StockActual { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("categoria_id")]
        public string CategoriaID { get; set; } = string.Empty;

        [MaxLength(100)]
        [Column("location")]
        public string? Location { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("status")]
        public string Status { get; set; } = "Operativo";

        [Column("fecha_actualizacion")]
        public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;
    }
}
