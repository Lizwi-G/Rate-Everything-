namespace RateEverything.Api.Models;

public class Region
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string CountryCode { get; set; } = "";
    public Country? Country { get; set; }
}
