using System.Security.Cryptography;
using System.Text;

namespace SistemaInventarioAPI.Services
{
    public class PasswordHasherService : IPasswordHasherService
    {
        private const int SaltSize = 16;      
        private const int KeySize = 32;      
        private const int Iterations = 100_000;
        private static readonly HashAlgorithmName HashAlgorithm = HashAlgorithmName.SHA256;
        private const string Pbkdf2Prefix = "$pbkdf2$";

        public string HashPassword(string password)
        {
            if (string.IsNullOrEmpty(password))
            {
                throw new ArgumentException("La contraseña no puede estar vacía.", nameof(password));
            }

            byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);
            byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
                Encoding.UTF8.GetBytes(password),
                salt,
                Iterations,
                HashAlgorithm,
                KeySize
            );

            return $"{Pbkdf2Prefix}{Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
        }

        public bool VerifyPassword(string password, string storedHash, out bool needsRehash)
        {
            needsRehash = false;

            if (string.IsNullOrEmpty(storedHash) || string.IsNullOrEmpty(password))
            {
                return false;
            }

            if (storedHash.StartsWith(Pbkdf2Prefix))
            {
                var parts = storedHash.Split('$');
                if (parts.Length != 5) return false;

                if (!int.TryParse(parts[2], out int iterations)) return false;
                byte[] salt;
                byte[] expectedHash;
                try
                {
                    salt = Convert.FromBase64String(parts[3]);
                    expectedHash = Convert.FromBase64String(parts[4]);
                }
                catch
                {
                    return false;
                }

                byte[] actualHash = Rfc2898DeriveBytes.Pbkdf2(
                    Encoding.UTF8.GetBytes(password),
                    salt,
                    iterations,
                    HashAlgorithm,
                    KeySize
                );

                return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
            }

            try
            {
                using var sha256 = SHA256.Create();
                byte[] legacyHashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                string legacyHash = Convert.ToBase64String(legacyHashBytes);

                byte[] storedBytes = Encoding.UTF8.GetBytes(storedHash);
                byte[] legacyBytes = Encoding.UTF8.GetBytes(legacyHash);

                if (storedBytes.Length == legacyBytes.Length && CryptographicOperations.FixedTimeEquals(storedBytes, legacyBytes))
                {
                    needsRehash = true; 
                    return true;
                }
            }
            catch
            {
                return false;
            }

            return false;
        }
    }
}

