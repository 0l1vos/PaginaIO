
using System.ComponentModel.DataAnnotations;
namespace SistemaInventarioAPI.Models
{
    public class Usuario
    {

        [Key]    
        public int UserID { get; set; } 
        public string NombreUsuario { get; set; } = string.Empty;
        public string Correo { get; set; } = string.Empty;
        public string ContrasenaHash { get; set; } = string.Empty;
        public int RolID { get; set; }
        public bool Activo { get; set; } = true;
        public DateTime FechaCreacion { get; set; } = DateTime.Now;
    }
}