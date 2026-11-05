namespace SistemaInventarioAPI.Middlewares
{
    public class SecurityHeadersMiddleware
    {
        private readonly RequestDelegate _next;

        public SecurityHeadersMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            context.Response.OnStarting(() =>
            {
                var headers = context.Response.Headers;

                headers["X-Content-Type-Options"] = "nosniff";

                headers["X-Frame-Options"] = "DENY";

                headers["X-XSS-Protection"] = "1; mode=block";

                headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

                headers["Content-Security-Policy"] = "default-src 'self'; object-src 'none'; frame-ancestors 'none';";

                headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";

                headers.Remove("Server");
                headers.Remove("X-Powered-By");

                return Task.CompletedTask;
            });

            await _next(context);
        }
    }
}

