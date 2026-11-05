using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SistemaInventarioAPI.Data;
using SistemaInventarioAPI.Middlewares;
using SistemaInventarioAPI.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddControllers();

builder.Services.AddSingleton<IPasswordHasherService, PasswordHasherService>();

var connectionString = builder.Configuration.GetConnectionString("ConexionSQL")
    ?? throw new InvalidOperationException("La cadena de conexión 'ConexionSQL' no está configurada.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

var jwtClave = builder.Configuration["Jwt:Clave"]
    ?? throw new InvalidOperationException("La clave secreta 'Jwt:Clave' no está configurada.");
var jwtEmisor = builder.Configuration["Jwt:Emisor"] ?? "SistemaInventarioAPI";
var jwtAudiencia = builder.Configuration["Jwt:Audiencia"] ?? "SistemaInventarioFrontend";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtClave)),
        ValidateIssuer = true,
        ValidIssuer = jwtEmisor,
        ValidateAudience = true,
        ValidAudience = jwtAudiencia,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        var errorResponse = new
        {
            mensaje = "Demasiadas solicitudes. Por motivos de seguridad su petición ha sido limitada temporalmente.",
            estado = StatusCodes.Status429TooManyRequests
        };
        await context.HttpContext.Response.WriteAsJsonAsync(errorResponse, cancellationToken);
    };

    options.AddFixedWindowLimiter("AuthLimiter", opt =>
    {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });

    options.AddFixedWindowLimiter("ApiLimiter", opt =>
    {
        opt.PermitLimit = 120;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

app.UseMiddleware<SecurityHeadersMiddleware>();

app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseMiddleware<SqlInjectionProtectionMiddleware>();

app.UseCors("PermitirFrontend");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();


app.MapControllers();


using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning("Nota al migrar base de datos: {Message}", ex.Message);
    }
}

app.Run();
