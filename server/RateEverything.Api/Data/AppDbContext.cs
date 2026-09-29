using Microsoft.EntityFrameworkCore;
using RateEverything.Api.Models;

namespace RateEverything.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<Region> Regions => Set<Region>();
    public DbSet<City> Cities => Set<City>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Business> Businesses => Set<Business>();
    public DbSet<BusinessService> BusinessServices => Set<BusinessService>();
    public DbSet<LegacyRating> LegacyRatings => Set<LegacyRating>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<PendingVerification> PendingVerifications => Set<PendingVerification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>().HasKey(c => c.Key);
        modelBuilder.Entity<Country>().HasKey(c => c.Code);
        modelBuilder.Entity<Region>().HasKey(r => r.Id);
        modelBuilder.Entity<City>().HasKey(c => c.Id);
        modelBuilder.Entity<AppUser>().HasKey(u => u.Id);
        modelBuilder.Entity<AppUser>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<Business>().HasKey(b => b.Id);
        modelBuilder.Entity<Business>().HasIndex(b => b.Email).IsUnique().HasFilter("\"Email\" IS NOT NULL");
        modelBuilder.Entity<Review>().HasKey(r => r.Id);
        modelBuilder.Entity<PendingVerification>().HasKey(p => p.Id);

        modelBuilder.Entity<Region>()
            .HasOne(r => r.Country)
            .WithMany()
            .HasForeignKey(r => r.CountryCode)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<City>()
            .HasOne(c => c.Region)
            .WithMany()
            .HasForeignKey(c => c.RegionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Business>()
            .HasMany(b => b.Services)
            .WithOne()
            .HasForeignKey(s => s.BusinessId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Business>()
            .HasMany(b => b.LegacyRatings)
            .WithOne()
            .HasForeignKey(r => r.BusinessId)
            .OnDelete(DeleteBehavior.Cascade);

        // Businesses loosely reference Region/Category (matches the original
        // localStorage model, where deleting a region/category doesn't cascade
        // into businesses) — no FK enforced there. Reviews DO cascade-delete
        // with their business, same as the admin.js deleteBusiness() behavior.
        modelBuilder.Entity<Review>()
            .HasOne<Business>()
            .WithMany()
            .HasForeignKey(r => r.BusinessId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
