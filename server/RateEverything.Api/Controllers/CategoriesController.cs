using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateEverything.Api.Data;
using RateEverything.Api.Dtos;
using RateEverything.Api.Models;
using RateEverything.Api.Services;

namespace RateEverything.Api.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _db;
    public CategoriesController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<ActionResult<List<Category>>> Get() =>
        await _db.Categories.OrderBy(c => c.Label).ToListAsync();

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<Category>> Create(CategoryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Icon) || string.IsNullOrWhiteSpace(req.Label))
            return BadRequest(new { message = "Please fill in the icon and label." });

        var key = Slug.From(req.Label);
        if (string.IsNullOrEmpty(key) || await _db.Categories.AnyAsync(c => c.Key == key))
            return BadRequest(new { message = "A category with this name already exists." });

        var category = new Category { Key = key, Label = req.Label, Icon = req.Icon, Color = req.Color };
        _db.Categories.Add(category);
        await _db.SaveChangesAsync();
        return Ok(category);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{key}")]
    public async Task<ActionResult<Category>> Update(string key, CategoryRequest req)
    {
        var category = await _db.Categories.FindAsync(key);
        if (category is null) return NotFound();
        category.Icon = req.Icon;
        category.Label = req.Label;
        category.Color = req.Color;
        await _db.SaveChangesAsync();
        return Ok(category);
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{key}")]
    public async Task<IActionResult> Delete(string key)
    {
        var category = await _db.Categories.FindAsync(key);
        if (category is null) return NotFound();
        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
