namespace RateEverything.Api.Dtos;

// Never includes PasswordHash — admin's Users table doesn't need it and it must never leave the server.
public record UserDto(
    string Id, string FirstName, string LastName, string Email, string? Phone,
    string? CountryCode, string? RegionId, string Role, DateTime CreatedAt);

public record SetRoleRequest(string Role);
