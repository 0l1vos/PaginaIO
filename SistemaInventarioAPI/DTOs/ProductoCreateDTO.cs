using System.ComponentModel.DataAnnotations;

namespace SistemaInventarioAPI.DTOs
{
    public class ProductoCreateDTO
    {
        [Required(ErrorMessage = "El código SKU es obligatorio.")]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "El código SKU debe tener entre 3 y 50 caracteres.")]
        [RegularExpression(@"^[a-zA-Z0-9_\-\.]+$", ErrorMessage = "El código SKU solo puede contener caracteres alfanuméricos, guiones y puntos.")]
        public string CodigoSKU { get; set; } = string.Empty;

        [Required(ErrorMessage = "El nombre del producto es obligatorio.")]
        [StringLength(150, MinimumLength = 2, ErrorMessage = "El nombre del producto debe tener entre 2 y 150 caracteres.")]
        public string NombreProducto { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "La descripción no puede exceder los 500 caracteres.")]
        public string? Descripcion { get; set; }

        [Range(0, 1_000_000, ErrorMessage = "El stock debe ser un número entero entre 0 y 1,000,000.")]
        public int StockActual { get; set; }

        [Required(ErrorMessage = "La categoría es obligatoria.")]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "La categoría debe tener entre 2 y 50 caracteres.")]
        public string CategoriaID { get; set; } = string.Empty;

        [StringLength(100, ErrorMessage = "La ubicación no puede exceder los 100 caracteres.")]
        public string? Location { get; set; }

        [Required(ErrorMessage = "El estado del equipo es obligatorio.")]
        [RegularExpression(@"^(Operativo|En Mantenimiento|De Baja)$", ErrorMessage = "El estado debe ser: 'Operativo', 'En Mantenimiento' o 'De Baja'.")]
        public string Status { get; set; } = "Operativo";
    }
}

