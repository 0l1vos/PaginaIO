using System.Text.RegularExpressions;

namespace SistemaInventarioAPI.Middlewares
{
    public class SqlInjectionProtectionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<SqlInjectionProtectionMiddleware> _logger;

        private static readonly Regex SqlInjectionRegex = new Regex(
            @"(\b(UNION(\s+ALL)?\s+SELECT|SELECT\s+.*\s+FROM\s+|INSERT\s+INTO\s+|DELETE\s+FROM\s+|UPDATE\s+.*\s+SET\s+|DROP\s+(TABLE|DATABASE|VIEW|PROCEDURE)|ALTER\s+TABLE|TRUNCATE\s+TABLE|EXEC(\s+|\()|EXECUTE(\s+|\()|XP_CMDSHELL|SP_EXECUTESQL|PG_SLEEP|WAITFOR\s+DELAY)\b)" +
            @"|('(\s*(OR|AND)\s+('?\w+'?\s*=\s*'?\w+'?|1\s*=\s*1|0\s*=\s*0)))" +
            @"|(--|/\*|\*/|;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE)\b)" +
            @"|(\b(INFORMATION_SCHEMA|PG_CATALOG|SYS\.TABLES)\b)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled,
            TimeSpan.FromMilliseconds(150)
        );

        private static readonly Regex XssRegex = new Regex(
            @"<\s*script\b[^>]*>|<\s*/\s*script\s*>|javascript:\s*|<\s*iframe\b|onerror\s*=|onload\s*=|document\.cookie",
            RegexOptions.IgnoreCase | RegexOptions.Compiled,
            TimeSpan.FromMilliseconds(150)
        );

        public SqlInjectionProtectionMiddleware(RequestDelegate next, ILogger<SqlInjectionProtectionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (context.Request.QueryString.HasValue)
            {
                var queryDecoded = Uri.UnescapeDataString(context.Request.QueryString.Value);
                if (ContainsMaliciousPattern(queryDecoded))
                {
                    _logger.LogWarning("Intento de inyección detectado en QueryString desde {IP}: {Query}",
                        context.Connection.RemoteIpAddress, queryDecoded);

                    await RejectRequest(context, "Parámetros en URL contienen patrones no permitidos.");
                    return;
                }
            }

            var pathDecoded = Uri.UnescapeDataString(context.Request.Path.Value ?? string.Empty);
            if (ContainsMaliciousPattern(pathDecoded))
            {
                _logger.LogWarning("Intento de inyección detectado en Path desde {IP}: {Path}",
                    context.Connection.RemoteIpAddress, pathDecoded);

                await RejectRequest(context, "La ruta de la solicitud contiene patrones no permitidos.");
                return;
            }

            var esRutaLogin = pathDecoded.EndsWith("/login", StringComparison.OrdinalIgnoreCase);
            if (!esRutaLogin &&
                context.Request.ContentType != null &&
                context.Request.ContentType.StartsWith("application/json", StringComparison.OrdinalIgnoreCase) &&
                context.Request.ContentLength is > 0 and < 500_000)
            {
                context.Request.EnableBuffering();
                using var reader = new StreamReader(context.Request.Body, leaveOpen: true);
                var body = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0;

                if (ContainsMaliciousPattern(body))
                {
                    _logger.LogWarning("Intento de inyección detectado en el cuerpo JSON desde {IP} para ruta {Path}",
                        context.Connection.RemoteIpAddress, pathDecoded);

                    await RejectRequest(context, "El cuerpo de la solicitud contiene comandos SQL o etiquetas de script no permitidos.");
                    return;
                }
            }

            await _next(context);
        }

        private static bool ContainsMaliciousPattern(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return false;

            try
            {
                return SqlInjectionRegex.IsMatch(value) || XssRegex.IsMatch(value);
            }
            catch (RegexMatchTimeoutException)
            {
                return true;
            }
        }

        private static async Task RejectRequest(HttpContext context, string mensaje)
        {
            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/json";

            var respuesta = new
            {
                mensaje = "Solicitud rechazada por políticas de seguridad.",
                detalle = mensaje,
                estado = StatusCodes.Status400BadRequest
            };

            await context.Response.WriteAsJsonAsync(respuesta);
        }
    }
}

