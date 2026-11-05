using System.ComponentModel.DataAnnotations;

namespace SistemaInventarioAPI.DTOs
{
    public class CambiarRolDTO
    {
        [Required(ErrorMessage = "El rol es obligatorio.")]
        [RegularExpression(@"^(admin|user)$", ErrorMessage = "El rol solo puede ser 'admin' o 'user'.")]
        public string NuevoRol { get; set; } = "user";
    }
}

