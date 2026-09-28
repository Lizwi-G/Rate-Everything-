using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateEverything.Api.Data;
using RateEverything.Api.Dtos;
using RateEverything.Api.Models;

namespace RateEverything.Api.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ReviewsController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<ActionResult<List<Review>>> Get([FromQuery] string? businessId)
    {
        var query = _db.Reviews.AsQueryable();
        if (!string.IsNullOrEmpty(businessId)) query = query.Where(r => r.BusinessId == businessId);
        return await query.OrderByDescending(r => r.Date).ToListAsync();
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Review>> Create(CreateReviewRequest req)
    {
        var kind = User.FindFirst("kind")?.Value;
        if (kind != "user") return Forbid();
        if (req.Stars < 1 || req.Stars > 5) return BadRequest(new { message = "Stars must be between 1 and 5." });
        if (!await _db.Businesses.AnyAsync(b => b.Id == req.BusinessId)) return NotFound(new { message = "Business not found." });

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)!.Value;
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return Unauthorized();

        var review = new Review
        {
            Id = "rev-" + Guid.NewGuid().ToString("N")[..12],
            BusinessId = req.BusinessId,
            Stars = req.Stars,
            Comment = req.Comment?.Trim(),
            UserId = user.Id,
            ReviewerName = $"{user.FirstName} {user.LastName}".Trim(),
            Date = DateTime.UtcNow
        };
        _db.Reviews.Add(review);
        await _db.SaveChangesAsync();
        return Ok(review);
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var review = await _db.Reviews.FindAsync(id);
        if (review is null) return NotFound();
        _db.Reviews.Remove(review);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
