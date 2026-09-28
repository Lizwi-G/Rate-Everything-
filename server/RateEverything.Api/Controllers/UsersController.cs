using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateEverything.Api.Data;
using RateEverything.Api.Dtos;

namespace RateEverything.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "admin")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    public UsersController(AppDbContext db) { _db = db; }

    private static UserDto ToDto(Models.AppUser u) =>
        new(u.Id, u.FirstName, u.LastName, u.Email, u.Phone, u.CountryCode, u.RegionId, u.Role, u.CreatedAt);

    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> Get() =>
        (await _db.Users.OrderByDescending(u => u.CreatedAt).ToListAsync()).Select(ToDto).ToList();

    [HttpPatch("{id}/role")]
    public async Task<IActionResult> SetRole(string id, SetRoleRequest req)
    {
        var myId = User.FindFirst(ClaimTypes.NameIdentifier)!.Value;
        if (id == myId) return BadRequest(new { message = "You can't change your own admin status." });

        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound();
        if (req.Role != "user" && req.Role != "admin") return BadRequest(new { message = "Invalid role." });

        user.Role = req.Role;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var myId = User.FindFirst(ClaimTypes.NameIdentifier)!.Value;
        if (id == myId) return BadRequest(new { message = "You can't delete your own account." });

        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound();
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
