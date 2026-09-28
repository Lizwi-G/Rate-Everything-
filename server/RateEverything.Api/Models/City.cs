namespace RateEverything.Api.Models;

public class City
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string RegionId { get; set; } = "";
    public string CountryCode { get; set; } = "";
    public double? Lat { get; set; }
    public double? Lng { get; set; }
    public Region? Region { get; set; }
}
