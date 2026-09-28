using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateEverything.Api.Data;
using RateEverything.Api.Dtos;
using RateEverything.Api.Models;
using RateEverything.Api.Services;

namespace RateEverything.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly OtpService _otp;
    private readonly PasswordService _password;
    private readonly TokenService _tokens;

    public AuthController(AppDbContext db, OtpService otp, PasswordService password, TokenService tokens)
    {
        _db = db;
        _otp = otp;
        _password = password;
        _tokens = tokens;
    }

    [HttpPost("register/user")]
    public async Task<ActionResult<OtpStartedResponse>> RegisterUser(RegisterUserRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { message = "An account with this email already exists." });

        var data = new PendingUserData(
            Id: "usr-" + Guid.NewGuid().ToString("N")[..12],
            FirstName: req.FirstName.Trim(),
            LastName: req.LastName.Trim(),
            Email: email,
            Phone: req.Phone?.Trim(),
            CountryCode: req.CountryCode,
            RegionId: req.RegionId,
            Role: "user",
            PasswordHash: _password.Hash(req.Password),
            CreatedAt: DateTime.UtcNow);

        var pending = await _otp.StartAsync("user", email, data);
        return Ok(new OtpStartedResponse(pending.Id, pending.Email, pending.Otp));
    }

    [HttpPost("register/business")]
    public async Task<ActionResult<OtpStartedResponse>> RegisterBusiness(RegisterBusinessRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        if (await _db.Businesses.AnyAsync(b => b.Email == email))
            return Conflict(new { message = "A business account with this email already exists." });

        var data = new PendingBusinessData(
            Id: "kb-" + Guid.NewGuid().ToString("N")[..12],
            Name: req.Name.Trim(),
            Category: req.Category,
            Icon: req.Icon,
            Image: req.Image,
            City: req.City.Trim(),
            RegionId: req.RegionId,
            CountryCode: req.CountryCode,
            Description: req.Description.Trim(),
            Services: req.Services,
            Email: email,
            Phone: req.Phone?.Trim(),
            RegNo: req.RegNo?.Trim(),
            Verified: !string.IsNullOrWhiteSpace(req.RegNo),
            PasswordHash: _password.Hash(req.Password),
            CreatedAt: DateTime.UtcNow);

        var pending = await _otp.StartAsync("business", email, data);
        return Ok(new OtpStartedResponse(pending.Id, pending.Email, pending.Otp));
    }

    [HttpPost("resend-otp")]
    public async Task<ActionResult<OtpStartedResponse>> ResendOtp(ResendOtpRequest req)
    {
        var pending = await _otp.ResendAsync(req.PendingId);
        if (pending is null) return NotFound(new { message = "This verification session expired — please start over." });
        return Ok(new OtpStartedResponse(pending.Id, pending.Email, pending.Otp));
    }

    [HttpPost("cancel-pending")]
    public async Task<IActionResult> CancelPending(CancelPendingRequest req)
    {
        await _otp.CancelAsync(req.PendingId);
        return NoContent();
    }

    [HttpPost("verify-otp")]
    public async Task<ActionResult<AuthResult>> VerifyOtp(VerifyOtpRequest req)
    {
        var result = await _otp.VerifyAsync(req.PendingId, req.Code.Trim());
        if (!result.Ok)
        {
            return result.Reason switch
            {
                OtpFailureReason.Expired => BadRequest(new { reason = "expired", message = "This code has expired. Tap Resend to get a new one." }),
                OtpFailureReason.Locked => BadRequest(new { reason = "locked", message = "Too many incorrect attempts. Tap Resend to get a new code." }),
                _ => BadRequest(new { reason = "incorrect", attemptsLeft = result.AttemptsLeft, message = $"Incorrect code. {result.AttemptsLeft} attempt(s) left." })
            };
        }

        if (result.Kind == "user")
        {
            var data = JsonSerializer.Deserialize<PendingUserData>(result.DataJson!)!;
            if (await _db.Users.AnyAsync(u => u.Email == data.Email))
                return Conflict(new { message = "An account with this email already exists." });

            var user = new AppUser
            {
                Id = data.Id, FirstName = data.FirstName, LastName = data.LastName, Email = data.Email,
                Phone = data.Phone, CountryCode = data.CountryCode, RegionId = data.RegionId,
                Role = data.Role, PasswordHash = data.PasswordHash, CreatedAt = data.CreatedAt
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            var token = _tokens.IssueToken(user.Id, "user", user.Role, user.Email);
            return Ok(new AuthResult(token, "user", user.Id, user.Role, user.FirstName, user.Email));
        }
        else
        {
            var data = JsonSerializer.Deserialize<PendingBusinessData>(result.DataJson!)!;
            if (await _db.Businesses.AnyAsync(b => b.Email == data.Email))
                return Conflict(new { message = "A business account with this email already exists." });

            var biz = new Business
            {
                Id = data.Id, Name = data.Name, Category = data.Category, Icon = data.Icon, Image = data.Image,
                City = data.City, RegionId = data.RegionId, CountryCode = data.CountryCode, Description = data.Description,
                Email = data.Email, Phone = data.Phone, RegNo = data.RegNo, Verified = data.Verified,
                PasswordHash = data.PasswordHash, CreatedAt = data.CreatedAt,
                Services = data.Services.Select(s => new BusinessService { BusinessId = data.Id, Value = s }).ToList()
            };
            _db.Businesses.Add(biz);
            await _db.SaveChangesAsync();

            var token = _tokens.IssueToken(biz.Id, "business", null, biz.Email!);
            return Ok(new AuthResult(token, "business", biz.Id, null, biz.Name, biz.Email!));
        }
    }

    [HttpPost("login/user")]
    public async Task<ActionResult<AuthResult>> LoginUser(LoginRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null || !_password.Verify(user.PasswordHash, req.Password))
            return Unauthorized(new { message = "Incorrect email or password." });

        var token = _tokens.IssueToken(user.Id, "user", user.Role, user.Email);
        return Ok(new AuthResult(token, "user", user.Id, user.Role, user.FirstName, user.Email));
    }

    [HttpPost("login/business")]
    public async Task<ActionResult<AuthResult>> LoginBusiness(LoginRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var biz = await _db.Businesses.FirstOrDefaultAsync(b => b.Email == email);
        if (biz is null || string.IsNullOrEmpty(biz.PasswordHash) || !_password.Verify(biz.PasswordHash, req.Password))
            return Unauthorized(new { message = "Incorrect email or password." });

        var token = _tokens.IssueToken(biz.Id, "business", null, biz.Email!);
        return Ok(new AuthResult(token, "business", biz.Id, null, biz.Name, biz.Email!));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<AuthResult>> Me()
    {
        var id = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value;
        var kind = User.FindFirst("kind")!.Value;

        if (kind == "user")
        {
            var user = await _db.Users.FindAsync(id);
            if (user is null) return Unauthorized();
            return Ok(new AuthResult("", "user", user.Id, user.Role, user.FirstName, user.Email));
        }
        else
        {
            var biz = await _db.Businesses.FindAsync(id);
            if (biz is null) return Unauthorized();
            return Ok(new AuthResult("", "business", biz.Id, null, biz.Name, biz.Email!));
        }
    }
}
