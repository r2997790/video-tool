using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using VideoTool.Data;
using VideoTool.Domain.Entities;

namespace VideoTool.Web.Services;

public record AttendeeImportRow(string Email, string? Name, string Status = "approved");

public interface ICrmAttendeeProvider
{
    Task<IReadOnlyList<AttendeeImportRow>> PullListAsync(string listKey, CancellationToken ct = default);
}

public class NoOpCrmAttendeeProvider : ICrmAttendeeProvider
{
    public Task<IReadOnlyList<AttendeeImportRow>> PullListAsync(string listKey, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<AttendeeImportRow>>([]);
}

public class AttendeeImportService
{
    private readonly ICrmAttendeeProvider _crm;
    private readonly IHttpClientFactory _httpFactory;

    public AttendeeImportService(ICrmAttendeeProvider crm, IHttpClientFactory httpFactory)
    {
        _crm = crm;
        _httpFactory = httpFactory;
    }

    public async Task<int> ImportCsvAsync(VideoToolDbContext db, int eventId, string csvContent, string defaultStatus = "approved")
    {
        var rows = ParseCsv(csvContent);
        return await UpsertAttendeesAsync(db, eventId, rows, "csv", defaultStatus);
    }

    public async Task<int> ImportFromCrmAsync(VideoToolDbContext db, int eventId, string listKey)
    {
        var rows = await _crm.PullListAsync(listKey);
        return await UpsertAttendeesAsync(db, eventId, rows, "crm");
    }

    public async Task NotifyRegistrationAsync(DemoConfig config, ScheduledEvent ev, EventAttendee attendee)
    {
        if (string.IsNullOrWhiteSpace(config.AttendeeWebhookUrl)) return;

        var client = _httpFactory.CreateClient();
        var payload = new
        {
            eventSlug = ev.Slug,
            eventTitle = ev.Title,
            attendee = new
            {
                attendee.Id,
                attendee.Email,
                attendee.Name,
                attendee.Status,
                attendee.Source,
                attendee.CreatedAt,
            },
        };

        try
        {
            await client.PostAsJsonAsync(config.AttendeeWebhookUrl, payload);
        }
        catch { /* best effort */ }
    }

    public static List<AttendeeImportRow> ParseCsv(string csv)
    {
        var lines = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var rows = new List<AttendeeImportRow>();
        var start = 0;
        if (lines.Length > 0 && lines[0].Contains("email", StringComparison.OrdinalIgnoreCase)) start = 1;

        foreach (var line in lines.Skip(start))
        {
            var parts = line.Split(',');
            if (parts.Length == 0) continue;
            var email = parts[0].Trim().Trim('"');
            if (string.IsNullOrWhiteSpace(email) || !email.Contains('@')) continue;
            var name = parts.Length > 1 ? parts[1].Trim().Trim('"') : null;
            var status = parts.Length > 2 ? parts[2].Trim().Trim('"').ToLowerInvariant() : "approved";
            if (status is not ("pending" or "approved" or "rejected")) status = "approved";
            rows.Add(new AttendeeImportRow(email, name, status));
        }

        return rows;
    }

    private static async Task<int> UpsertAttendeesAsync(
        VideoToolDbContext db, int eventId, IEnumerable<AttendeeImportRow> rows, string source, string? defaultStatus = null)
    {
        var count = 0;
        foreach (var row in rows)
        {
            var email = EventAccessService.NormalizeEmail(row.Email);
            var existing = await db.EventAttendees
                .FirstOrDefaultAsync(a => a.EventId == eventId && a.Email == email);

            var status = row.Status ?? defaultStatus ?? "approved";
            if (existing == null)
            {
                db.EventAttendees.Add(new EventAttendee
                {
                    EventId = eventId,
                    Email = email,
                    Name = row.Name,
                    Status = status,
                    Source = source,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
                count++;
            }
            else
            {
                existing.Name ??= row.Name;
                existing.Status = status;
                existing.Source = source;
                existing.UpdatedAt = DateTime.UtcNow;
                count++;
            }
        }

        await db.SaveChangesAsync();
        return count;
    }
}
