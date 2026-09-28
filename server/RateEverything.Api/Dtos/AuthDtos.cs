namespace RateEverything.Api.Dtos;

public record RegisterUserRequest(
    string FirstName, string LastName, string Email, string? Phone,
    string? CountryCode, string? RegionId, string Password);

public record RegisterBusinessRequest(
    string Name, string Category, string? Icon, string? Image,
    string City, string? RegionId, string? CountryCode, string Description,
    List<string> Services, string Email, string? Phone, string? RegNo, string Password);

public record VerifyOtpRequest(string PendingId, string Code);
public record ResendOtpRequest(string PendingId);
public record CancelPendingRequest(string PendingId);
public record LoginRequest(string Email, string Password);

public record OtpStartedResponse(string PendingId, string Email, string DevCode);

public record AuthResult(string Token, string Kind, string Id, string? Role, string Name, string Email);

// Internal shape persisted in PendingVerification.DataJson — never sent to the
// client directly, just round-tripped through StartAsync/VerifyAsync.
public record PendingUserData(
    string Id, string FirstName, string LastName, string Email, string? Phone,
    string? CountryCode, string? RegionId, string Role, string PasswordHash, DateTime CreatedAt);

public record PendingBusinessData(
    string Id, string Name, string Category, string? Icon, string? Image,
    string City, string? RegionId, string? CountryCode, string Description,
    List<string> Services, string Email, string? Phone, string? RegNo, bool Verified,
    string PasswordHash, DateTime CreatedAt);
