using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SistemaInventarioAPI.Data;
using SistemaInventarioAPI.DTOs;
using SistemaInventarioAPI.Models;

namespace SistemaInventarioAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    [EnableRateLimiting("ApiLimiter")]
    public class ProductosController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ProductosController> _logger;

        public ProductosController(AppDbContext context, ILogger<ProductosController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/productos
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Producto>>> GetProductos()
        {
            return await _context.Productos
                .AsNoTracking()
                .OrderByDescending(p => p.FechaActualizacion)
                .ToListAsync();
        }

        // GET: api/productos/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Producto>> GetProductoPorId(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new { mensaje = "El ID del producto debe ser mayor a 0." });
            }

            var producto = await _context.Productos
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ProductoID == id);

            if (producto == null)
            {
                return NotFound(new { mensaje = "Producto no encontrado." });
            }

            return Ok(producto);
        }

        // POST: api/productos
        [HttpPost]
        public async Task<ActionResult<Producto>> PostProducto([FromBody] ProductoCreateDTO dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var skuLimpio = dto.CodigoSKU.Trim().ToUpperInvariant();

            var skuExiste = await _context.Productos
                .AnyAsync(p => p.CodigoSKU.ToUpper() == skuLimpio);

            if (skuExiste)
            {
                return Conflict(new { mensaje = $"Ya existe un equipo con el SKU '{skuLimpio}'." });
            }

            var producto = new Producto
            {
                CodigoSKU = skuLimpio,
                NombreProducto = dto.NombreProducto.Trim(),
                Descripcion = dto.Descripcion?.Trim(),
                StockActual = dto.StockActual,
                CategoriaID = dto.CategoriaID.Trim(),
                Location = dto.Location?.Trim(),
                Status = dto.Status,
                FechaActualizacion = DateTime.UtcNow
            };

            _context.Productos.Add(producto);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Producto {Nombre} ({SKU}) creado exitosamente con ID {Id}",
                producto.NombreProducto, producto.CodigoSKU, producto.ProductoID);

            return CreatedAtAction(nameof(GetProductoPorId), new { id = producto.ProductoID }, producto);
        }

        // PUT: api/productos/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> PutProducto(int id, [FromBody] ProductoUpdateDTO dto)
        {
            if (id <= 0 || id != dto.ProductoID)
            {
                return BadRequest(new { mensaje = "El ID proporcionado en la ruta no coincide con el ID del cuerpo." });
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var productoExistente = await _context.Productos.FindAsync(id);
            if (productoExistente == null)
            {
                return NotFound(new { mensaje = "El producto que intenta actualizar no existe." });
            }

            var skuLimpio = dto.CodigoSKU.Trim().ToUpperInvariant();

            var skuDuplicado = await _context.Productos
                .AnyAsync(p => p.CodigoSKU.ToUpper() == skuLimpio && p.ProductoID != id);

            if (skuDuplicado)
            {
                return Conflict(new { mensaje = $"El SKU '{skuLimpio}' ya está en uso por otro producto." });
            }

            productoExistente.CodigoSKU = skuLimpio;
            productoExistente.NombreProducto = dto.NombreProducto.Trim();
            productoExistente.Descripcion = dto.Descripcion?.Trim();
            productoExistente.StockActual = dto.StockActual;
            productoExistente.CategoriaID = dto.CategoriaID.Trim();
            productoExistente.Location = dto.Location?.Trim();
            productoExistente.Status = dto.Status;
            productoExistente.FechaActualizacion = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Productos.Any(e => e.ProductoID == id))
                {
                    return NotFound(new { mensaje = "El producto no fue encontrado durante la actualización concurrente." });
                }
                throw;
            }

            return Ok(productoExistente);
        }

        // DELETE: api/productos/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProducto(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new { mensaje = "El ID del producto debe ser mayor a 0." });
            }

            var producto = await _context.Productos.FindAsync(id);
            if (producto == null)
            {
                return NotFound(new { mensaje = "Producto no encontrado." });
            }

            _context.Productos.Remove(producto);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Producto ID {Id} eliminado del sistema", id);

            return NoContent();
        }
    }
}
