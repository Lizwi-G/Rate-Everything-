using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateEverything.Api.Data;
using RateEverything.Api.Dtos;
using RateEverything.Api.Models;

namespace RateEverything.Api.Controllers;

[ApiController]
[Route("api/countries")]
public class CountriesController : ControllerBase
{
    private readonly AppDbContext _db;
    public CountriesController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<ActionResult<List<Country>>> Get() =>
        await _db.Countries.OrderBy(c => c.Name).ToListAsync();

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<Country>> Create(CountryRequest req)
    {
        var code = req.Code?.Trim().ToUpperInvariant() ?? "";
        if (string.IsNullOrWhiteSpace(req.Flag) || string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(code))
            return BadRequest(new { message = "Please fill in all fields." });
        if (await _db.Countries.AnyAsync(c => c.Code == code))
            return BadRequest(new { message = "A country with this code already exists." });

        var country = new Country { Code = code, Name = req.Name, Flag = req.Flag };
        _db.Countries.Add(country);
        await _db.SaveChangesAsync();
        return Ok(country);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{code}")]
    public async Task<ActionResult<Country>> Update(string code, CountryRequest req)
    {
        var country = await _db.Countries.FindAsync(code);
        if (country is null) return NotFound();
        country.Flag = req.Flag;
        country.Name = req.Name;
        await _db.SaveChangesAsync();
        return Ok(country);
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{code}")]
    public async Task<IActionResult> Delete(string code)
    {
        var country = await _db.Countries.FindAsync(code);
        if (country is null) return NotFound();
        _db.Countries.Remove(country); // cascades to Regions -> Cities via FK
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
