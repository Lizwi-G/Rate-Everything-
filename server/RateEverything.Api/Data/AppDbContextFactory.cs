using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace RateEverything.Api.Data;

/// <summary>
/// Used only by `dotnet ef` design-time tooling (migrations add/update).
/// Without this, EF falls back to building the whole app to obtain a
/// DbContext — which would run Program.cs's startup migrate/seed block
/// and try to hit a real database just to generate a migration file.
/// This factory gives the tooling a throwaway, never-connected context
/// instead. It has no effect at runtime — Program.cs's own DI registration
/// (with the real Supabase connection string) is what the app actually uses.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Database=design_time_only;Username=postgres;Password=postgres");
        return new AppDbContext(optionsBuilder.Options);
    }
}
