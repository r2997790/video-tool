using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoTool.Data;
using VideoTool.Domain.Entities;
using VideoTool.Web.Services;

namespace VideoTool.Web.Controllers;

[ApiController]
[Route("api/integrations")]
public class EventIntegrationsController : ControllerBase
{
    private readonly VideoToolDbContext _db;
    private readonly EventAccessService _access;
    private readonly AttendeeImportService _import;

    public EventIntegrationsController(VideoToolDbContext db, EventAccessService access, AttendeeImportService import)
    {
        _db = db;
        _access = access;
        _import = import;
    }

    [HttpPost("event-attendees/{slug}")]
    public async Task<IActionResult> WebhookApproveAttendee(string slug, [FromBody] WebhookAttendeeDto dto)
    {
        var ev = await _db.ScheduledEvents.FirstOrDefaultAsync(e => e.Slug == slug && e.IsEnabled);
        if (ev == null) return NotFound();

        if (!ValidateSignature(ev.AttendeeWebhookSecret, Request.Headers["X-Event-Signature"].FirstOrDefault(), dto))
            return Unauthorized(new { error = "Invalid signature" });

        if (string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { error = "Email required" });

        var email = EventAccessService.NormalizeEmail(dto.Email);
        if (await _access.IsBlacklistedAsync(_db, email, ev))
            return BadRequest(new { error = "Email is blacklisted" });

        var status = (dto.Status ?? "approved").Trim().ToLowerInvariant();
        if (status is not ("pending" or "approved" or "rejected")) status = "approved";

        var attendee = await _db.EventAttendees.FirstOrDefaultAsync(a => a.EventId == ev.Id && a.Email == email);
        if (attendee == null)
        {
            attendee = new EventAttendee
            {
                EventId = ev.Id,
                Email = email,
                Name = dto.Name,
                Status = status,
                Source = "webhook",
                AnswersJson = dto.AnswersJson,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.EventAttendees.Add(attendee);
        }
        else
        {
            attendee.Status = status;
            attendee.Name ??= dto.Name;
            attendee.Source = "webhook";
            attendee.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        var config = await _db.DemoConfigs.FirstAsync();
        await _import.NotifyRegistrationAsync(config, ev, attendee);

        return Ok(new { attendee.Id, attendee.Email, attendee.Status });
    }

    private static bool ValidateSignature(string? secret, string? signatureHeader, WebhookAttendeeDto dto)
    {
        if (string.IsNullOrWhiteSpace(secret)) return true; // allow if no secret configured
        if (string.IsNullOrWhiteSpace(signatureHeader)) return false;

        var payload = JsonSerializer.Serialize(dto);
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
        var expected = signatureHeader.Replace("sha256=", "", StringComparison.OrdinalIgnoreCase).Trim();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(hash),
            Encoding.UTF8.GetBytes(expected));
    }

    public record WebhookAttendeeDto(string Email, string? Name, string? Status, string? AnswersJson);
}
