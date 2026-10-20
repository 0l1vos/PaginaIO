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
                .FirstOrDefaultAsync(u => u.Correo == loginDto.Correo && u.Activo == true);

            if (usuario == null)
                return Unauthorized(new { mensaje = "Credenciales inválidas" });

            if (!VerificarContrasena(loginDto.Contrasena, usuario.ContrasenaHash))
                return Unauthorized(new { mensaje = "Credenciales inválidas" });

            var token = GenerarToken(usuario);
            var expiracion = DateTime.UtcNow.AddHours(
                double.Parse(_configuration["Jwt:DuracionHoras"] ?? "8"));

            return Ok(new LoginResponseDTO
            {
                Token = token,
                NombreUsuario = usuario.NombreUsuario,
                Correo = usuario.Correo,
                RolID = usuario.RolID,
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
                .AnyAsync(u => u.Correo == registroDto.Correo);

            if (existeCorreo)
                return Conflict(new { mensaje = "El correo ya está registrado" });

            var existeNombre = await _context.Usuarios
                .AnyAsync(u => u.NombreUsuario == registroDto.NombreUsuario);

            if (existeNombre)
                return Conflict(new { mensaje = "El nombre de usuario ya está en uso" });

            var usuario = new Usuario
            {
                NombreUsuario = registroDto.NombreUsuario,
                Correo = registroDto.Correo,
                ContrasenaHash = HashContrasena(registroDto.Contrasena),
                RolID = registroDto.RolID ?? 2,
                Activo = true,
                FechaCreacion = DateTime.Now
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

        private string GenerarToken(Usuario usuario)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, usuario.UserID.ToString()),
                new Claim(ClaimTypes.Name, usuario.NombreUsuario),
                new Claim(ClaimTypes.Email, usuario.Correo),
                new Claim(ClaimTypes.Role, usuario.RolID.ToString())
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