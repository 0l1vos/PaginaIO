namespace SistemaInventarioAPI.Middlewares
{
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Excepción no controlada detectada al procesar {Method} en {Path}",
                    context.Request.Method, context.Request.Path);

                if (!context.Response.HasStarted)
                {
                    context.Response.Clear();
                    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    context.Response.ContentType = "application/json";

                    var respuesta = new
                    {
                        mensaje = "Se ha producido un error interno en el servidor. Por razones de seguridad, los detalles técnicos no se exponen al cliente.",
                        estado = StatusCodes.Status500InternalServerError,
                        timestamp = DateTime.UtcNow
                    };

                    await context.Response.WriteAsJsonAsync(respuesta);
                }
            }
        }
    }
}

