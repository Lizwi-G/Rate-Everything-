using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace RateEverything.Api.Data;

/// <summary>
/// Used only by `dotnet ef` design-time tooling (migrations add/update).
/// Without this, EF falls back to building the whole app to obtain a
/// DbContext — which would run Program.cs's startup migrate/seed block
/// and try to hit a real database just to generate a migration file.
/// This factory builds config the same way Program.cs does (appsettings +
/// user-secrets + env vars) so `dotnet ef database update` connects to
/// whatever the app itself would connect to, without ever running the
/// startup migrate/seed block. Falls back to a throwaway localhost string
/// (never actually connected to) if no real connection string is configured
/// yet, so `migrations add` still works with no setup.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddUserSecrets<AppDbContextFactory>(optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("Default")
            ?? "Host=localhost;Database=design_time_only;Username=postgres;Password=postgres";

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(connectionString);
        return new AppDbContext(optionsBuilder.Options);
    }
}
