using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SistemaInventarioAPI.Data;
using SistemaInventarioAPI.DTOs;
using SistemaInventarioAPI.Models;

namespace SistemaInventarioAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SesionController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public SesionController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // POST: api/sesion/login
        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDTO>> Login([FromBody] LoginDTO loginDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

            if (usuario == null)
                return Unauthorized(new { mensaje = "Credenciales inválidas" });

            if (!VerificarContrasena(loginDto.Contrasena, usuario.PasswordHash))
                return Unauthorized(new { mensaje = "Credenciales inválidas" });

            var token = GenerarToken(usuario);
            var expiracion = DateTime.UtcNow.AddHours(
                double.Parse(_configuration["Jwt:DuracionHoras"] ?? "8"));

            return Ok(new LoginResponseDTO
            {
                Token = token,
                NombreUsuario = usuario.Nombre,
                Email = usuario.Email,
                Rol = usuario.Role,
                Expiracion = expiracion
            });
        }

        // POST: api/sesion/registro
        [HttpPost("registro")]
        public async Task<ActionResult> Registro([FromBody] RegistroDTO registroDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var existeCorreo = await _context.Usuarios
                .AnyAsync(u => u.Email == registroDto.Correo);

            if (existeCorreo)
                return Conflict(new { mensaje = "El correo ya está registrado" });

            var existeNombre = await _context.Usuarios
                .AnyAsync(u => u.Nombre == registroDto.NombreUsuario);

            if (existeNombre)
                return Conflict(new { mensaje = "El nombre de usuario ya está en uso" });

            var usuario = new Usuario
            {
                Nombre = registroDto.NombreUsuario,
                Email = registroDto.Correo,
                PasswordHash = HashContrasena(registroDto.Contrasena),
                Role = registroDto.RolID.HasValue && registroDto.RolID.Value == 1 ? "admin" : "user",
                FechaCreacion = DateTime.UtcNow
            };

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Usuario registrado exitosamente" });
        }

        // POST: api/sesion/validar-token
        [HttpPost("validar-token")]
        public ActionResult ValidarToken()
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
                return Unauthorized(new { valido = false, mensaje = "Token no proporcionado" });

            var token = authHeader.Substring("Bearer ".Length);

            try
            {
                var key = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(_configuration["Jwt:Clave"]!));

                var tokenHandler = new JwtSecurityTokenHandler();
                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = key,
                    ValidateIssuer = true,
                    ValidIssuer = _configuration["Jwt:Emisor"],
                    ValidateAudience = true,
                    ValidAudience = _configuration["Jwt:Audiencia"],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                }, out _);

                return Ok(new { valido = true });
            }
            catch
            {
                return Unauthorized(new { valido = false, mensaje = "Token inválido o expirado" });
            }
        }

        // GET: api/sesion/usuarios
        [HttpGet("usuarios")]
        public async Task<ActionResult> GetUsuarios()
        {
            var usuarios = await _context.Usuarios
                .Select(u => new
                {
                    u.UsuarioID,
                    Nombre = u.Nombre,
                    Email = u.Email,
                    Role = u.Role,
                    FechaCreacion = u.FechaCreacion
                })
                .ToListAsync();

            return Ok(usuarios);
        }


        // DELETE: api/sesion/usuarios/{id}
        [HttpDelete("usuarios/{id}")]
        public async Task<ActionResult> EliminarUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null)
                return NotFound(new { mensaje = "Usuario no encontrado" });

            _context.Usuarios.Remove(usuario);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Usuario eliminado exitosamente" });
        }
        

        private string GenerarToken(Usuario usuario)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, usuario.UsuarioID.ToString()),
                new Claim(ClaimTypes.Name, usuario.Nombre),
                new Claim(ClaimTypes.Email, usuario.Email),
                new Claim(ClaimTypes.Role, usuario.Role)
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Clave"]!));
            var credenciales = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var duracionHoras = double.Parse(_configuration["Jwt:DuracionHoras"] ?? "8");

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Emisor"],
                audience: _configuration["Jwt:Audiencia"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(duracionHoras),
                signingCredentials: credenciales
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static string HashContrasena(string contrasena)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(contrasena));
            return Convert.ToBase64String(bytes);
        }

        private static bool VerificarContrasena(string contrasena, string hash)
        {
            var hashIngresado = HashContrasena(contrasena);
            return hashIngresado == hash;
        }
    }
}