namespace RateEverything.Api.Dtos;

public record CategoryRequest(string Icon, string Label, string Color);
public record CountryRequest(string Flag, string Name, string? Code);
public record RegionRequest(string Name, string CountryCode);
public record CityRequest(string Name, string RegionId, double? Lat, double? Lng);
