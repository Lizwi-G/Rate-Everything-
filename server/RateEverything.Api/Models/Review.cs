namespace RateEverything.Api.Models;

public class Review
{
    public string Id { get; set; } = "";
    public string BusinessId { get; set; } = "";
    public int Stars { get; set; }
    public string? Comment { get; set; }
    public string? UserId { get; set; }
    public string ReviewerName { get; set; } = "Anonymous";
    public DateTime Date { get; set; } = DateTime.UtcNow;
}
