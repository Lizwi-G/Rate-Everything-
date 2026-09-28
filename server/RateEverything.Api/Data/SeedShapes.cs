namespace RateEverything.Api.Data;

// Plain shapes matching the seed/*.json files exactly (camelCase, deserialized
// case-insensitively) — kept separate from the EF entities/DTOs since this is
// purely a one-time loading format.
public record SeedCategory(string Key, string Label, string Icon, string Color);
public record SeedCountry(string Code, string Name, string Flag);
public record SeedRegion(string Id, string Name, string CountryCode);
public record SeedCity(string Id, string Name, string RegionId, string CountryCode, double? Lat, double? Lng);
public record SeedBusiness(
    string Id, string Name, string Category, string? Icon, string City, string RegionId, string CountryCode,
    string Description, List<string> Services, bool Verified, List<int> Ratings);
