using System.ComponentModel.DataAnnotations;

namespace SistemaInventarioAPI.DTOs
{
    public class LoginDTO
    {
        [Required(ErrorMessage = "El correo electrónico es obligatorio.")]
        [EmailAddress(ErrorMessage = "El formato del correo electrónico no es válido.")]
        [MaxLength(255, ErrorMessage = "El correo no puede exceder 255 caracteres.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "La contraseña es obligatoria.")]
        [MaxLength(100, ErrorMessage = "La contraseña no puede exceder 100 caracteres.")]
        public string Contrasena { get; set; } = string.Empty;
    }
}
