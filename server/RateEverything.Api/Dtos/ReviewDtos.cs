namespace RateEverything.Api.Dtos;

public record CreateReviewRequest(string BusinessId, int Stars, string? Comment);
