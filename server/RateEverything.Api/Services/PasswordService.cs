using Microsoft.AspNetCore.Identity;

namespace RateEverything.Api.Services;

/// <summary>
/// Real server-side password hashing (PBKDF2 via ASP.NET Core Identity's
/// PasswordHasher) — replaces the prototype's client-side SHA-256 hashing.
/// The hash/verify logic now runs somewhere a browser can never see.
/// </summary>
public class PasswordService
{
    private readonly PasswordHasher<object> _hasher = new();

    public string Hash(string password) => _hasher.HashPassword(new object(), password);

    public bool Verify(string hash, string password) =>
        _hasher.VerifyHashedPassword(new object(), hash, password) != PasswordVerificationResult.Failed;
}
