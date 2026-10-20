namespace SistemaInventarioAPI.DTOs
{
    public class LoginResponseDTO
    {
        public string Token { get; set; } = string.Empty;
        public string NombreUsuario { get; set; } = string.Empty;
        public string Correo { get; set; } = string.Empty;
        public int RolID { get; set; }
        public DateTime Expiracion { get; set; }
    }
}
