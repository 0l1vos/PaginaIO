using System.ComponentModel.DataAnnotations;

namespace SistemaInventarioAPI.DTOs
{
    public class RegistroDTO
    {
        [Required(ErrorMessage = "El nombre de usuario es requerido.")]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "El nombre debe tener entre 3 y 50 caracteres.")]
        [RegularExpression(@"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\._-]+$", ErrorMessage = "El nombre de usuario contiene caracteres no permitidos.")]
        public string NombreUsuario { get; set; } = string.Empty;

        [Required(ErrorMessage = "El correo electrónico es requerido.")]
        [EmailAddress(ErrorMessage = "El formato del correo electrónico no es válido.")]
        [MaxLength(255, ErrorMessage = "El correo no puede exceder 255 caracteres.")]
        public string Correo { get; set; } = string.Empty;

        [Required(ErrorMessage = "La contraseña es requerida.")]
        [StringLength(100, MinimumLength = 8, ErrorMessage = "La contraseña debe tener entre 8 y 100 caracteres.")]
        public string Contrasena { get; set; } = string.Empty;

        [Range(1, int.MaxValue, ErrorMessage = "El RolID debe ser un número entero válido mayor a 0.")]
        public int? RolID { get; set; }
    }
}
