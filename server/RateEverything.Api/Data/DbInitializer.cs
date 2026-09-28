using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RateEverything.Api.Models;
using RateEverything.Api.Services;

namespace RateEverything.Api.Data;

/// <summary>
/// Idempotent startup seeding — same spirit as the old js/store.js
/// reInitStore(): only seeds a table the first time it's empty, so admin
/// edits made later are never overwritten by a restart.
/// </summary>
public static class DbInitializer
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public static async Task SeedAsync(AppDbContext db, PasswordService passwordService)
    {
        var seedDir = Path.Combine(AppContext.BaseDirectory, "Data", "seed");

        if (!await db.Categories.AnyAsync())
        {
            var items = await LoadAsync<SeedCategory>(seedDir, "categories.json");
            db.Categories.AddRange(items.Select(c => new Category { Key = c.Key, Label = c.Label, Icon = c.Icon, Color = c.Color }));
        }

        if (!await db.Countries.AnyAsync())
        {
            var items = await LoadAsync<SeedCountry>(seedDir, "countries.json");
            db.Countries.AddRange(items.Select(c => new Country { Code = c.Code, Name = c.Name, Flag = c.Flag }));
        }
        await db.SaveChangesAsync(); // countries/categories must exist before regions/businesses reference them

        if (!await db.Regions.AnyAsync())
        {
            var items = await LoadAsync<SeedRegion>(seedDir, "regions.json");
            db.Regions.AddRange(items.Select(r => new Region { Id = r.Id, Name = r.Name, CountryCode = r.CountryCode }));
        }
        await db.SaveChangesAsync();

        if (!await db.Cities.AnyAsync())
        {
            var items = await LoadAsync<SeedCity>(seedDir, "cities.json");
            db.Cities.AddRange(items.Select(c => new City
            {
                Id = c.Id, Name = c.Name, RegionId = c.RegionId, CountryCode = c.CountryCode, Lat = c.Lat, Lng = c.Lng
            }));
        }
        await db.SaveChangesAsync();

        if (!await db.Businesses.AnyAsync())
        {
            var items = await LoadAsync<SeedBusiness>(seedDir, "businesses.json");
            foreach (var b in items)
            {
                db.Businesses.Add(new Business
                {
                    Id = b.Id, Name = b.Name, Category = b.Category, Icon = b.Icon, Image = null,
                    City = b.City, RegionId = b.RegionId, CountryCode = b.CountryCode, Description = b.Description,
                    Email = null, Phone = null, RegNo = null, Verified = b.Verified, PasswordHash = null,
                    CreatedAt = DateTime.UtcNow,
                    Services = b.Services.Select(s => new BusinessService { BusinessId = b.Id, Value = s }).ToList(),
                    LegacyRatings = b.Ratings.Select(r => new LegacyRating { BusinessId = b.Id, Stars = r }).ToList()
                });
            }
        }
        await db.SaveChangesAsync();

        if (!await db.Users.AnyAsync(u => u.Role == "admin"))
        {
            db.Users.Add(new AppUser
            {
                Id = "usr-" + Guid.NewGuid().ToString("N")[..12],
                FirstName = "Site",
                LastName = "Admin",
                Email = "admin@rateeverything.com",
                Role = "admin",
                PasswordHash = passwordService.Hash("Admin@123"),
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
    }

    private static async Task<List<T>> LoadAsync<T>(string seedDir, string fileName)
    {
        var path = Path.Combine(seedDir, fileName);
        await using var stream = File.OpenRead(path);
        var items = await JsonSerializer.DeserializeAsync<List<T>>(stream, JsonOpts);
        return items ?? new List<T>();
    }
}
