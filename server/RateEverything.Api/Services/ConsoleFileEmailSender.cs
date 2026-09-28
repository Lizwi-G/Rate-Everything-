namespace RateEverything.Api.Services;

/// <summary>
/// Stand-in for a real email provider. No SMTP/API-key is configured for
/// this environment, so instead of actually emailing the OTP, it logs to
/// the console and appends to otp-outbox.log — the API response also
/// echoes the code back (see AuthController) so the frontend's existing
/// "prototype note" UI keeps working unchanged. Swap this registration in
/// Program.cs for a real SmtpEmailSender/SendGrid sender once credentials
/// are available; nothing else in the app needs to change.
/// </summary>
public class ConsoleFileEmailSender : IEmailSender
{
    private readonly string _logPath;
    private readonly ILogger<ConsoleFileEmailSender> _logger;

    public ConsoleFileEmailSender(ILogger<ConsoleFileEmailSender> logger)
    {
        _logger = logger;
        _logPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "otp-outbox.log");
    }

    public async Task SendAsync(string toEmail, string subject, string body)
    {
        var line = $"[{DateTime.UtcNow:u}] To: {toEmail} | Subject: {subject} | {body}";
        _logger.LogInformation("📧 (stub email) {Line}", line);
        try
        {
            await File.AppendAllTextAsync(_logPath, line + Environment.NewLine);
        }
        catch
        {
            // Best-effort only — the console log above is the reliable source.
        }
    }
}
