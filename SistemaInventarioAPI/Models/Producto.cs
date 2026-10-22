using System.ComponentModel.DataAnnotations;

namespace SistemaInventarioAPI.Models
{
    public class Producto
    {
        [Key]
        public int ProductoID { get; set; }
        public string CodigoSKU { get; set; } = string.Empty;
        public string NombreProducto { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public int StockActual { get; set; }
        public string CategoriaID { get; set; }
        public string? Location { get; set; }
        public string Status { get; set; } = "Operativo";
        public DateTime FechaActualizacion { get; set; } = DateTime.Now;
    }
}