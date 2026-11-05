using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SistemaInventarioAPI.Data;
using SistemaInventarioAPI.DTOs;
using SistemaInventarioAPI.Models;
using SistemaInventarioAPI.Services;

namespace SistemaInventarioAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SesionController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IPasswordHasherService _passwordHasher;
        private readonly ILogger<SesionController> _logger;

        public SesionController(
            AppDbContext context,
            IConfiguration configuration,
            IPasswordHasherService passwordHasher,
            ILogger<SesionController> logger)
        {
            _context = context;
            _configuration = configuration;
            _passwordHasher = passwordHasher;
            _logger = logger;
        }

        // POST: api/sesion/login
        [HttpPost("login")]
        [AllowAnonymous]
        [EnableRateLimiting("AuthLimiter")]
        public async Task<ActionResult<LoginResponseDTO>> Login([FromBody] LoginDTO loginDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var emailSanitizado = loginDto.Email.Trim().ToLowerInvariant();

            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.Email.ToLower() == emailSanitizado);

            if (usuario == null)
            {
                _logger.LogWarning("Intento fallido de inicio de sesión para el correo: {Email}", emailSanitizado);
                return Unauthorized(new { mensaje = "Credenciales inválidas" });
            }

            if (!_passwordHasher.VerifyPassword(loginDto.Contrasena, usuario.PasswordHash, out bool needsRehash))
            {
                _logger.LogWarning("Contraseña incorrecta para el usuario: {Email}", emailSanitizado);
                return Unauthorized(new { mensaje = "Credenciales inválidas" });
            }

            if (needsRehash)
            {
                usuario.PasswordHash = _passwordHasher.HashPassword(loginDto.Contrasena);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Hash de contraseña actualizado a PBKDF2 para el usuario {Email}", usuario.Email);
            }

            var token = GenerarToken(usuario);
            var duracionHoras = double.Parse(_configuration["Jwt:DuracionHoras"] ?? "8");
            var expiracion = DateTime.UtcNow.AddHours(duracionHoras);

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
        [AllowAnonymous]
        [EnableRateLimiting("AuthLimiter")]
        public async Task<ActionResult> Registro([FromBody] RegistroDTO registroDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var emailSanitizado = registroDto.Correo.Trim().ToLowerInvariant();
            var nombreSanitizado = registroDto.NombreUsuario.Trim();

            var existeCorreo = await _context.Usuarios
                .AnyAsync(u => u.Email.ToLower() == emailSanitizado);

            if (existeCorreo)
            {
                return Conflict(new { mensaje = "El correo ya está registrado" });
            }

            var existeNombre = await _context.Usuarios
                .AnyAsync(u => u.Nombre.ToLower() == nombreSanitizado.ToLower());

            if (existeNombre)
            {
                return Conflict(new { mensaje = "El nombre de usuario ya está en uso" });
            }

            var esAdminAutenticado = User.Identity?.IsAuthenticated == true && User.IsInRole("admin");
            var rolAsignado = (esAdminAutenticado && registroDto.RolID.HasValue && registroDto.RolID.Value == 1)
                ? "admin"
                : "user";

            var usuario = new Usuario
            {
                Nombre = nombreSanitizado,
                Email = emailSanitizado,
                PasswordHash = _passwordHasher.HashPassword(registroDto.Contrasena),
                Role = rolAsignado,
                FechaCreacion = DateTime.UtcNow
            };

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Nuevo usuario registrado: {Nombre} con rol {Role}", usuario.Nombre, usuario.Role);

            return Ok(new { mensaje = "Usuario registrado exitosamente" });
        }

        // POST: api/sesion/validar-token
        [HttpPost("validar-token")]
        [Authorize]
        public ActionResult ValidarToken()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var nombre = User.FindFirstValue(ClaimTypes.Name);
            var email = User.FindFirstValue(ClaimTypes.Email);
            var rol = User.FindFirstValue(ClaimTypes.Role);

            return Ok(new
            {
                valido = true,
                usuario = new
                {
                    id = userId,
                    nombre,
                    email,
                    rol
                }
            });
        }

        // GET: api/sesion/usuarios
        [HttpGet("usuarios")]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult> GetUsuarios()
        {
            var usuarios = await _context.Usuarios
                .AsNoTracking()
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
        [Authorize(Roles = "admin")]
        public async Task<ActionResult> EliminarUsuario(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new { mensaje = "El ID de usuario debe ser mayor a 0." });
            }

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (currentUserId == id.ToString())
            {
                return BadRequest(new { mensaje = "No puedes eliminar tu propia cuenta de administrador." });
            }

            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null)
            {
                return NotFound(new { mensaje = "Usuario no encontrado" });
            }

            _context.Usuarios.Remove(usuario);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Usuario con ID {Id} eliminado por administrador {AdminId}", id, currentUserId);

            return Ok(new { mensaje = "Usuario eliminado exitosamente" });
        }

        // PUT: api/sesion/usuarios/{id}/rol
        [HttpPut("usuarios/{id}/rol")]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult> CambiarRol(int id, [FromBody] CambiarRolDTO dto)
        {
            if (id <= 0)
            {
                return BadRequest(new { mensaje = "ID inválido." });
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (currentUserId == id.ToString() && dto.NuevoRol != "admin")
            {
                return BadRequest(new { mensaje = "No puedes quitarte el rol de administrador a ti mismo." });
            }

            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null)
            {
                return NotFound(new { mensaje = "Usuario no encontrado." });
            }

            usuario.Role = dto.NuevoRol;
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = $"Rol actualizado a {dto.NuevoRol} correctamente." });
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

            var jwtKey = _configuration["Jwt:Clave"]
                ?? throw new InvalidOperationException("La clave secreta Jwt:Clave no está configurada.");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
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
    }
}
