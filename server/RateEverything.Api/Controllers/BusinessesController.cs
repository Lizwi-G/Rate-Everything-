using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateEverything.Api.Data;
using RateEverything.Api.Dtos;
using RateEverything.Api.Models;

namespace RateEverything.Api.Controllers;

[ApiController]
[Route("api/businesses")]
public class BusinessesController : ControllerBase
{
    private readonly AppDbContext _db;
    public BusinessesController(AppDbContext db) { _db = db; }

    // `extraStars` merges in submitted review stars alongside the legacy seed
    // ratings, so the frontend gets one ready-to-average list without having
    // to fetch every business's reviews separately (was 28+ requests per
    // page load — one grouped query now covers all of them at once).
    private static BusinessDto ToDto(Business b, IReadOnlyList<int>? extraStars = null) => new(
        b.Id, b.Name, b.Category, b.Icon, b.Image, b.City, b.RegionId, b.CountryCode, b.Description,
        b.Services.Select(s => s.Value).ToList(),
        b.LegacyRatings.Select(r => r.Stars).Concat(extraStars ?? Array.Empty<int>()).ToList(),
        b.Email, b.Phone, b.RegNo, b.Verified, b.CreatedAt);

    // AsSplitQuery: two collection Includes (Services + LegacyRatings) on the
    // same root otherwise compile to a single cartesian-product JOIN — for a
    // business with, say, 4 services x 7 ratings that's 28 duplicate rows to
    // de-flatten per business, and it was the actual cause of GET /businesses
    // hanging under load. Two simple queries beats one exploding join.
    private IQueryable<Business> WithChildren() =>
        _db.Businesses.AsSplitQuery().Include(b => b.Services).Include(b => b.LegacyRatings);

    [HttpGet]
    public async Task<ActionResult<List<BusinessDto>>> Get()
    {
        var businesses = await WithChildren().ToListAsync();
        var reviewStars = await _db.Reviews
            .GroupBy(r => r.BusinessId)
            .Select(g => new { BusinessId = g.Key, Stars = g.Select(r => r.Stars).ToList() })
            .ToDictionaryAsync(x => x.BusinessId, x => x.Stars);

        return businesses.Select(b => ToDto(b, reviewStars.GetValueOrDefault(b.Id))).ToList();
    }

    private async Task<List<int>> StarsFor(string businessId) =>
        await _db.Reviews.Where(r => r.BusinessId == businessId).Select(r => r.Stars).ToListAsync();

    [HttpGet("{id}")]
    public async Task<ActionResult<BusinessDto>> GetOne(string id)
    {
        var biz = await WithChildren().FirstOrDefaultAsync(b => b.Id == id);
        if (biz is null) return NotFound();
        return Ok(ToDto(biz, await StarsFor(id)));
    }

    [Authorize]
    [HttpGet("mine")]
    public async Task<ActionResult<BusinessDto>> GetMine()
    {
        var (kind, id) = CurrentIdentity();
        if (kind != "business") return Forbid();
        var biz = await WithChildren().FirstOrDefaultAsync(b => b.Id == id);
        if (biz is null) return NotFound();
        return Ok(ToDto(biz, await StarsFor(id)));
    }

    [Authorize]
    [HttpPut("mine")]
    public async Task<ActionResult<BusinessDto>> UpdateMine(MyBusinessUpdateRequest req)
    {
        var (kind, id) = CurrentIdentity();
        if (kind != "business") return Forbid();

        var biz = await WithChildren().FirstOrDefaultAsync(b => b.Id == id);
        if (biz is null) return NotFound();

        biz.Name = req.Name.Trim();
        biz.Category = req.Category;
        biz.City = req.City.Trim();
        biz.Description = req.Description.Trim();
        biz.Email = req.Email?.Trim();
        biz.Phone = req.Phone?.Trim();
        if (req.ImageChanged) biz.Image = req.Image;

        _db.BusinessServices.RemoveRange(biz.Services);
        biz.Services = req.Services.Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => new BusinessService { BusinessId = biz.Id, Value = s.Trim() }).ToList();

        await _db.SaveChangesAsync();
        return Ok(ToDto(biz));
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<ActionResult<BusinessDto>> AdminUpdate(string id, AdminBusinessUpdateRequest req)
    {
        var biz = await WithChildren().FirstOrDefaultAsync(b => b.Id == id);
        if (biz is null) return NotFound();
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Category) || string.IsNullOrWhiteSpace(req.Description))
            return BadRequest(new { message = "Please fill in all fields." });

        biz.Name = req.Name;
        biz.Category = req.Category;
        biz.Description = req.Description;
        biz.Verified = req.Verified;
        await _db.SaveChangesAsync();
        return Ok(ToDto(biz));
    }

    [Authorize(Roles = "admin")]
    [HttpPatch("{id}/verified")]
    public async Task<IActionResult> SetVerified(string id, VerifiedRequest req)
    {
        var biz = await _db.Businesses.FindAsync(id);
        if (biz is null) return NotFound();
        biz.Verified = req.Verified;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}/image")]
    public async Task<IActionResult> RemoveImage(string id)
    {
        var biz = await _db.Businesses.FindAsync(id);
        if (biz is null) return NotFound();
        biz.Image = null;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var biz = await _db.Businesses.FindAsync(id);
        if (biz is null) return NotFound();
        _db.Businesses.Remove(biz); // cascades to Services, LegacyRatings, Reviews via FK
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private (string? kind, string? id) CurrentIdentity() =>
        (User.FindFirst("kind")?.Value, User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
}
