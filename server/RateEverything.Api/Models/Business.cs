namespace RateEverything.Api.Models;

public class Business
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public string? Icon { get; set; }
    public string? Image { get; set; } // base64 data URL, resized client-side before upload
    public string City { get; set; } = "";
    public string? RegionId { get; set; }
    public string? CountryCode { get; set; }
    public string Description { get; set; } = "";
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? RegNo { get; set; }
    public bool Verified { get; set; }
    public string? PasswordHash { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<BusinessService> Services { get; set; } = new();
    public List<LegacyRating> LegacyRatings { get; set; } = new();
}
