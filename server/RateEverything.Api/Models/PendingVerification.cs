namespace RateEverything.Api.Models;

// A registration that hasn't been confirmed with its OTP yet — no real
// User/Business row exists until VerifyOtp succeeds. DataJson holds the
// fully-prepared record (already password-hashed) ready to insert.
public class PendingVerification
{
    public string Id { get; set; } = "";
    public string Kind { get; set; } = ""; // "user" | "business"
    public string Email { get; set; } = "";
    public string DataJson { get; set; } = "";
    public string Otp { get; set; } = "";
    public DateTime OtpExpiresAt { get; set; }
    public int Attempts { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
