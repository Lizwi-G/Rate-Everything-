using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateEverything.Api.Data;
using RateEverything.Api.Dtos;
using RateEverything.Api.Models;

namespace RateEverything.Api.Controllers;

[ApiController]
[Route("api/cities")]
public class CitiesController : ControllerBase
{
    private readonly AppDbContext _db;
    public CitiesController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<ActionResult<List<City>>> Get([FromQuery] string? regionId)
    {
        var query = _db.Cities.AsQueryable();
        if (!string.IsNullOrEmpty(regionId)) query = query.Where(c => c.RegionId == regionId);
        return await query.OrderBy(c => c.Name).ToListAsync();
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<City>> Create(CityRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.RegionId))
            return BadRequest(new { message = "Please fill in all fields." });
        if ((req.Lat is null) != (req.Lng is null))
            return BadRequest(new { message = "Please provide both latitude and longitude, or leave both blank." });

        var region = await _db.Regions.FindAsync(req.RegionId);
        if (region is null) return BadRequest(new { message = "Unknown region." });

        var city = new City
        {
            Id = "ct-" + Guid.NewGuid().ToString("N")[..12],
            Name = req.Name,
            RegionId = req.RegionId,
            CountryCode = region.CountryCode,
            Lat = req.Lat,
            Lng = req.Lng
        };
        _db.Cities.Add(city);
        await _db.SaveChangesAsync();
        return Ok(city);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<ActionResult<City>> Update(string id, CityRequest req)
    {
        if ((req.Lat is null) != (req.Lng is null))
            return BadRequest(new { message = "Please provide both latitude and longitude, or leave both blank." });

        var city = await _db.Cities.FindAsync(id);
        if (city is null) return NotFound();
        var region = await _db.Regions.FindAsync(req.RegionId);
        if (region is null) return BadRequest(new { message = "Unknown region." });

        city.Name = req.Name;
        city.RegionId = req.RegionId;
        city.CountryCode = region.CountryCode;
        city.Lat = req.Lat;
        city.Lng = req.Lng;
        await _db.SaveChangesAsync();
        return Ok(city);
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var city = await _db.Cities.FindAsync(id);
        if (city is null) return NotFound();
        _db.Cities.Remove(city);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
