namespace RateEverything.Api.Dtos;

// Flat shape matching what the frontend has always worked with
// (services/ratings as plain arrays, not child-table objects).
public record BusinessDto(
    string Id, string Name, string Category, string? Icon, string? Image,
    string City, string? RegionId, string? CountryCode, string Description,
    List<string> Services, List<int> Ratings, string? Email, string? Phone,
    string? RegNo, bool Verified, DateTime CreatedAt);

// Matches the admin edit modal's field subset (js/admin.js renderBusinessFields).
public record AdminBusinessUpdateRequest(string Name, string Category, string Description, bool Verified);

public record VerifiedRequest(bool Verified);

// Matches the business owner's own edit form (js/business-dashboard.js).
// ImageChanged disambiguates "didn't touch the photo control" (false) from
// "explicitly cleared it" (true, Image: null) vs "uploaded a new one" (true, Image: "data:...").
public record MyBusinessUpdateRequest(
    string Name, string Category, string City, string Description,
    List<string> Services, string? Email, string? Phone,
    bool ImageChanged, string? Image);
