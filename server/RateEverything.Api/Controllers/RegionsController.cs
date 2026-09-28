using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateEverything.Api.Data;
using RateEverything.Api.Dtos;
using RateEverything.Api.Models;

namespace RateEverything.Api.Controllers;

[ApiController]
[Route("api/regions")]
public class RegionsController : ControllerBase
{
    private readonly AppDbContext _db;
    public RegionsController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<ActionResult<List<Region>>> Get([FromQuery] string? countryCode)
    {
        var query = _db.Regions.AsQueryable();
        if (!string.IsNullOrEmpty(countryCode)) query = query.Where(r => r.CountryCode == countryCode);
        return await query.OrderBy(r => r.Name).ToListAsync();
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<Region>> Create(RegionRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.CountryCode))
            return BadRequest(new { message = "Please fill in all fields." });
        if (!await _db.Countries.AnyAsync(c => c.Code == req.CountryCode))
            return BadRequest(new { message = "Unknown country." });

        var region = new Region { Id = "rg-" + Guid.NewGuid().ToString("N")[..12], Name = req.Name, CountryCode = req.CountryCode };
        _db.Regions.Add(region);
        await _db.SaveChangesAsync();
        return Ok(region);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<ActionResult<Region>> Update(string id, RegionRequest req)
    {
        var region = await _db.Regions.FindAsync(id);
        if (region is null) return NotFound();
        region.Name = req.Name;
        region.CountryCode = req.CountryCode;
        await _db.SaveChangesAsync();
        return Ok(region);
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var region = await _db.Regions.FindAsync(id);
        if (region is null) return NotFound();
        _db.Regions.Remove(region); // cascades to Cities via FK
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
