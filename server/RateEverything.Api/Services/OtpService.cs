using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RateEverything.Api.Data;
using RateEverything.Api.Models;

namespace RateEverything.Api.Services;

public enum OtpFailureReason { Expired, Locked, Incorrect }

public record OtpVerifyResult(bool Ok, OtpFailureReason? Reason, int? AttemptsLeft, string? Kind, string? DataJson);

public class OtpService
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(10);
    private const int MaxAttempts = 5;

    private readonly AppDbContext _db;
    private readonly IEmailSender _email;

    public OtpService(AppDbContext db, IEmailSender email)
    {
        _db = db;
        _email = email;
    }

    private static string GenerateCode() => Random.Shared.Next(100000, 1000000).ToString();

    public async Task CleanupExpiredAsync()
    {
        var expired = await _db.PendingVerifications.Where(p => p.OtpExpiresAt <= DateTime.UtcNow).ToListAsync();
        _db.PendingVerifications.RemoveRange(expired);
        await _db.SaveChangesAsync();
    }

    /// <summary>Starts (or restarts, e.g. on resend) an OTP verification for a not-yet-created record.</summary>
    public async Task<PendingVerification> StartAsync(string kind, string email, object recordData)
    {
        await CleanupExpiredAsync();

        var existing = await _db.PendingVerifications
            .Where(p => p.Kind == kind && p.Email == email)
            .ToListAsync();
        _db.PendingVerifications.RemoveRange(existing);

        var pending = new PendingVerification
        {
            Id = "pnd-" + Guid.NewGuid().ToString("N")[..12],
            Kind = kind,
            Email = email,
            DataJson = JsonSerializer.Serialize(recordData),
            Otp = GenerateCode(),
            OtpExpiresAt = DateTime.UtcNow.Add(Ttl),
            Attempts = 0,
            CreatedAt = DateTime.UtcNow
        };
        _db.PendingVerifications.Add(pending);
        await _db.SaveChangesAsync();

        await _email.SendAsync(email, "Your Rate Everything verification code",
            $"Your verification code is {pending.Otp}. It expires in 10 minutes.");

        return pending;
    }

    public async Task<PendingVerification?> ResendAsync(string pendingId)
    {
        var pending = await _db.PendingVerifications.FindAsync(pendingId);
        if (pending is null) return null;

        pending.Otp = GenerateCode();
        pending.OtpExpiresAt = DateTime.UtcNow.Add(Ttl);
        pending.Attempts = 0;
        await _db.SaveChangesAsync();

        await _email.SendAsync(pending.Email, "Your Rate Everything verification code",
            $"Your verification code is {pending.Otp}. It expires in 10 minutes.");

        return pending;
    }

    public async Task CancelAsync(string pendingId)
    {
        var pending = await _db.PendingVerifications.FindAsync(pendingId);
        if (pending is not null)
        {
            _db.PendingVerifications.Remove(pending);
            await _db.SaveChangesAsync();
        }
    }

    public async Task<OtpVerifyResult> VerifyAsync(string pendingId, string code)
    {
        var pending = await _db.PendingVerifications.FindAsync(pendingId);
        if (pending is null) return new OtpVerifyResult(false, OtpFailureReason.Expired, null, null, null);
        if (DateTime.UtcNow > pending.OtpExpiresAt) return new OtpVerifyResult(false, OtpFailureReason.Expired, null, null, null);
        if (pending.Attempts >= MaxAttempts) return new OtpVerifyResult(false, OtpFailureReason.Locked, null, null, null);

        if (pending.Otp != code)
        {
            pending.Attempts += 1;
            await _db.SaveChangesAsync();
            return new OtpVerifyResult(false, OtpFailureReason.Incorrect, MaxAttempts - pending.Attempts, null, null);
        }

        _db.PendingVerifications.Remove(pending);
        await _db.SaveChangesAsync();
        return new OtpVerifyResult(true, null, null, pending.Kind, pending.DataJson);
    }
}
