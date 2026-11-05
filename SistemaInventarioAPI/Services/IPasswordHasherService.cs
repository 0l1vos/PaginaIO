namespace SistemaInventarioAPI.Services
{
    public interface IPasswordHasherService
    {
        string HashPassword(string password);
        bool VerifyPassword(string password, string storedHash, out bool needsRehash);
    }
}

