namespace RateEverything.Api.Models;

// Numeric-only star ratings baked into the seed businesses (no written review attached).
public class LegacyRating
{
    public int Id { get; set; }
    public string BusinessId { get; set; } = "";
    public int Stars { get; set; }
}
