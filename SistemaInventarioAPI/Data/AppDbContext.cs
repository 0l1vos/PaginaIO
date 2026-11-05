using Microsoft.EntityFrameworkCore;
using SistemaInventarioAPI.Models;

namespace SistemaInventarioAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Producto> Productos { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Producto>(entity =>
            {
                entity.ToTable("productos");
                entity.HasKey(p => p.ProductoID);
                entity.Property(p => p.CodigoSKU).HasMaxLength(50).IsRequired();
                entity.Property(p => p.NombreProducto).HasMaxLength(150).IsRequired();
                entity.Property(p => p.Descripcion).HasMaxLength(500);
                entity.Property(p => p.CategoriaID).HasMaxLength(50).IsRequired();
                entity.Property(p => p.Location).HasMaxLength(100);
                entity.Property(p => p.Status).HasMaxLength(50).IsRequired();

                entity.HasIndex(p => p.CodigoSKU).IsUnique();
            });

            modelBuilder.Entity<Usuario>(entity =>
            {
                entity.ToTable("usuarios");
                entity.HasKey(u => u.UsuarioID);
                entity.Property(u => u.Nombre).HasMaxLength(100).IsRequired();
                entity.Property(u => u.Email).HasMaxLength(255).IsRequired();
                entity.Property(u => u.PasswordHash).HasMaxLength(500).IsRequired();
                entity.Property(u => u.Role).HasMaxLength(20).IsRequired();

                entity.HasIndex(u => u.Email).IsUnique();
                entity.HasIndex(u => u.Nombre).IsUnique();
            });
        }
    }
}
