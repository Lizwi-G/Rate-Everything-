namespace RateEverything.Api.Models;

public class AppUser
{
    public string Id { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string? CountryCode { get; set; }
    public string? RegionId { get; set; }
    public string Role { get; set; } = "user"; // "user" | "admin"
    public string PasswordHash { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
