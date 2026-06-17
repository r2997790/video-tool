using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoTool.Data;
using VideoTool.Domain.Entities;
using VideoTool.Web.Services;

namespace VideoTool.Web.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize]
public class EventsAdminController : ControllerBase
{
    private readonly VideoToolDbContext _db;
    private readonly RecurrenceService _recurrence;
    private readonly EventAnalyticsService _analytics;
    private readonly AttendeeImportService _import;

    public EventsAdminController(
        VideoToolDbContext db,
        RecurrenceService recurrence,
        EventAnalyticsService analytics,
        AttendeeImportService import)
    {
        _db = db;
        _recurrence = recurrence;
        _analytics = analytics;
        _import = import;
    }

    [HttpGet("events/summary")]
    public async Task<IActionResult> GetEventsSummary() =>
        Ok(await _analytics.GetSummaryAsync(_db, _recurrence));

    [HttpGet("events")]
    public async Task<IActionResult> GetEvents()
    {
        var events = await _db.ScheduledEvents.OrderByDescending(e => e.UpdatedAt).ToListAsync();
        var now = DateTime.UtcNow;
        var result = new List<object>();
        foreach (var ev in events)
        {
            var metrics = await _analytics.GetEventMetricsAsync(_db, ev, _recurrence);
            result.Add(MapEventAdmin(ev, metrics, now));
        }
        return Ok(result);
    }

    [HttpGet("events/{id:int}")]
    public async Task<IActionResult> GetEvent(int id)
    {
        var ev = await _db.ScheduledEvents.FindAsync(id);
        if (ev == null) return NotFound();
        var now = DateTime.UtcNow;
        var metrics = await _analytics.GetEventMetricsAsync(_db, ev, _recurrence);
        return Ok(MapEventAdmin(ev, metrics, now));
    }

    [HttpGet("events/{id:int}/preview")]
    public async Task<IActionResult> PreviewEventOccurrence(int id)
    {
        var ev = await _db.ScheduledEvents.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (ev == null) return NotFound();
        var now = DateTime.UtcNow;
        return Ok(new
        {
            nextStartsAtUtc = _recurrence.GetNextStartsAtUtc(ev, now),
            isLive = _recurrence.IsLive(ev, now),
            displayStatus = _recurrence.GetEventDisplayStatus(ev, now),
            serverNowUtc = now,
        });
    }

    [HttpPost("events")]
    public async Task<IActionResult> CreateEvent([FromBody] ScheduledEventDto dto) =>
        await SaveEventAsync(null, dto);

    [HttpPost("events/instant")]
    public async Task<IActionResult> CreateInstantEvent([FromBody] InstantEventDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FlowSlug))
            return BadRequest(new { error = "Flow slug is required" });

        var flowSlug = Slugify(dto.FlowSlug);
        if (!await _db.FlowProjects.AnyAsync(f => f.Slug == flowSlug))
            return BadRequest(new { error = "Flow not found" });

        var now = DateTime.UtcNow;
        var slug = Slugify(string.IsNullOrWhiteSpace(dto.Slug) ? $"instant-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}" : dto.Slug);
        if (await _db.ScheduledEvents.AnyAsync(e => e.Slug == slug))
            return BadRequest(new { error = "Slug already in use" });

        var ev = new ScheduledEvent
        {
            Slug = slug,
            Title = string.IsNullOrWhiteSpace(dto.Title) ? "Instant Broadcast" : dto.Title.Trim(),
            FlowSlug = flowSlug,
            StartsAtUtc = now,
            EventKind = "instant",
            AccessMode = dto.AccessMode ?? "open",
            HoldingHeading = dto.HoldingHeading ?? "Starting now",
            HoldingMessage = dto.HoldingMessage,
            HoldingVideoType = "none",
            RecurrenceType = "none",
            Timezone = "UTC",
            LiveDurationMinutes = dto.LiveDurationMinutes ?? 60,
            IsEnabled = true,
            UpdatedAt = now,
        };

        _db.ScheduledEvents.Add(ev);
        await _db.SaveChangesAsync();

        _db.EventOccurrenceLogs.Add(new EventOccurrenceLog
        {
            EventId = ev.Id,
            OccurrenceStartUtc = now,
            TriggerSource = "instant",
            CreatedAt = now,
        });
        await _db.SaveChangesAsync();

        var metrics = await _analytics.GetEventMetricsAsync(_db, ev, _recurrence);
        return Ok(MapEventAdmin(ev, metrics, now));
    }

    [HttpPost("events/{id:int}/go-live")]
    public async Task<IActionResult> GoLive(int id)
    {
        var ev = await _db.ScheduledEvents.FindAsync(id);
        if (ev == null) return NotFound();

        var now = DateTime.UtcNow;
        ev.EventKind = "on_demand";
        ev.OnDemandLiveStartUtc = now;
        ev.IsEnabled = true;
        ev.UpdatedAt = now;

        _db.EventOccurrenceLogs.Add(new EventOccurrenceLog
        {
            EventId = ev.Id,
            OccurrenceStartUtc = now,
            TriggerSource = "on_demand",
            CreatedAt = now,
        });

        await _db.SaveChangesAsync();
        var metrics = await _analytics.GetEventMetricsAsync(_db, ev, _recurrence);
        return Ok(MapEventAdmin(ev, metrics, now));
    }

    [HttpPost("events/{id:int}/duplicate")]
    public async Task<IActionResult> DuplicateEvent(int id, [FromBody] DuplicateEventDto? dto)
    {
        var source = await _db.ScheduledEvents.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (source == null) return NotFound();

        var newSlug = Slugify(dto?.NewSlug ?? $"{source.Slug}-copy-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}");
        if (await _db.ScheduledEvents.AnyAsync(e => e.Slug == newSlug))
            return BadRequest(new { error = "Slug already in use" });

        var copy = new ScheduledEvent
        {
            Slug = newSlug,
            Title = dto?.NewTitle ?? $"{source.Title} (copy)",
            StartsAtUtc = source.StartsAtUtc,
            HoldingHeading = source.HoldingHeading,
            HoldingMessage = source.HoldingMessage,
            HoldingImageUrl = source.HoldingImageUrl,
            HoldingVideoUrl = source.HoldingVideoUrl,
            HoldingVideoType = source.HoldingVideoType,
            DefaultChapterId = source.DefaultChapterId,
            FlowSlug = source.FlowSlug,
            RecurrenceType = source.RecurrenceType,
            IntervalMinutes = source.IntervalMinutes,
            RecurrenceStartUtc = source.RecurrenceStartUtc,
            RecurrenceEndUtc = source.RecurrenceEndUtc,
            Timezone = source.Timezone,
            WeeklyScheduleJson = source.WeeklyScheduleJson,
            LiveDurationMinutes = source.LiveDurationMinutes,
            EventKind = source.EventKind == "instant" ? "scheduled" : source.EventKind,
            AccessMode = source.AccessMode,
            RegistrationFormJson = source.RegistrationFormJson,
            RegistrationApprovalMode = source.RegistrationApprovalMode,
            CrmListKey = source.CrmListKey,
            PrivacyPolicyOverrideJson = source.PrivacyPolicyOverrideJson,
            AccessOverrideJson = source.AccessOverrideJson,
            DuplicatedFromId = source.Id,
            IsEnabled = false,
            UpdatedAt = DateTime.UtcNow,
        };

        if (string.IsNullOrWhiteSpace(copy.AttendeeWebhookSecret))
            copy.AttendeeWebhookSecret = GenerateWebhookSecret();

        _db.ScheduledEvents.Add(copy);
        await _db.SaveChangesAsync();

        var metrics = await _analytics.GetEventMetricsAsync(_db, copy, _recurrence);
        return Ok(MapEventAdmin(copy, metrics, DateTime.UtcNow));
    }

    [HttpPut("events/{id:int}")]
    public async Task<IActionResult> UpdateEvent(int id, [FromBody] ScheduledEventDto dto) =>
        await SaveEventAsync(id, dto);

    [HttpDelete("events/{id:int}")]
    public async Task<IActionResult> DeleteEvent(int id)
    {
        var ev = await _db.ScheduledEvents.FindAsync(id);
        if (ev == null) return NotFound();

        var attendees = await _db.EventAttendees.Where(a => a.EventId == id).ToListAsync();
        _db.EventAttendees.RemoveRange(attendees);
        var logs = await _db.EventOccurrenceLogs.Where(o => o.EventId == id).ToListAsync();
        _db.EventOccurrenceLogs.RemoveRange(logs);
        _db.ScheduledEvents.Remove(ev);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("events/{id:int}/attendees")]
    public async Task<IActionResult> GetAttendees(int id, [FromQuery] string? status)
    {
        if (!await _db.ScheduledEvents.AnyAsync(e => e.Id == id)) return NotFound();

        var q = _db.EventAttendees.AsNoTracking().Where(a => a.EventId == id);
        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(a => a.Status == status.Trim().ToLowerInvariant());

        var rows = await q.OrderByDescending(a => a.UpdatedAt).ToListAsync();
        return Ok(rows.Select(MapAttendee));
    }

    [HttpPost("events/{id:int}/attendees")]
    public async Task<IActionResult> AddAttendee(int id, [FromBody] AttendeeDto dto)
    {
        var ev = await _db.ScheduledEvents.FindAsync(id);
        if (ev == null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Email)) return BadRequest(new { error = "Email required" });

        var email = EventAccessService.NormalizeEmail(dto.Email);
        var existing = await _db.EventAttendees.FirstOrDefaultAsync(a => a.EventId == id && a.Email == email);
        if (existing != null) return BadRequest(new { error = "Attendee already exists" });

        var attendee = new EventAttendee
        {
            EventId = id,
            Email = email,
            Name = dto.Name,
            Status = dto.Status ?? "approved",
            Source = "manual",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.EventAttendees.Add(attendee);
        await _db.SaveChangesAsync();
        return Ok(MapAttendee(attendee));
    }

    [HttpPatch("events/{id:int}/attendees/{attendeeId:int}")]
    public async Task<IActionResult> UpdateAttendee(int id, int attendeeId, [FromBody] AttendeeStatusDto dto)
    {
        var attendee = await _db.EventAttendees.FirstOrDefaultAsync(a => a.Id == attendeeId && a.EventId == id);
        if (attendee == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Status))
        {
            var status = dto.Status.Trim().ToLowerInvariant();
            if (status is not ("pending" or "approved" or "rejected"))
                return BadRequest(new { error = "Invalid status" });
            attendee.Status = status;
        }
        if (dto.RejectedReason != null) attendee.RejectedReason = dto.RejectedReason;
        if (dto.Name != null) attendee.Name = dto.Name;
        attendee.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(MapAttendee(attendee));
    }

    [HttpPost("events/{id:int}/attendees/import-csv")]
    public async Task<IActionResult> ImportAttendeesCsv(int id, [FromBody] CsvImportDto dto)
    {
        if (!await _db.ScheduledEvents.AnyAsync(e => e.Id == id)) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.CsvContent)) return BadRequest(new { error = "CSV content required" });

        var count = await _import.ImportCsvAsync(_db, id, dto.CsvContent, dto.DefaultStatus ?? "approved");
        return Ok(new { imported = count });
    }

    [HttpGet("events/{id:int}/attendees/export-csv")]
    public async Task<IActionResult> ExportAttendeesCsv(int id)
    {
        if (!await _db.ScheduledEvents.AnyAsync(e => e.Id == id)) return NotFound();

        var rows = await _db.EventAttendees.AsNoTracking()
            .Where(a => a.EventId == id)
            .OrderBy(a => a.Email)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("email,name,status,source,createdAt,rejectedReason");
        foreach (var a in rows)
        {
            sb.Append(EscapeCsv(a.Email)).Append(',')
                .Append(EscapeCsv(a.Name ?? "")).Append(',')
                .Append(a.Status).Append(',')
                .Append(a.Source).Append(',')
                .Append(a.CreatedAt.ToString("o")).Append(',')
                .Append(EscapeCsv(a.RejectedReason ?? ""));
            sb.AppendLine();
        }

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", $"event-{id}-attendees.csv");
    }

    [HttpPost("events/{id:int}/sync-crm")]
    public async Task<IActionResult> SyncCrm(int id)
    {
        var ev = await _db.ScheduledEvents.FindAsync(id);
        if (ev == null) return NotFound();
        if (string.IsNullOrWhiteSpace(ev.CrmListKey))
            return BadRequest(new { error = "No CRM list key configured" });

        var count = await _import.ImportFromCrmAsync(_db, id, ev.CrmListKey);
        return Ok(new { imported = count });
    }

    [HttpGet("access-lists")]
    public async Task<IActionResult> GetAccessLists()
    {
        var entries = await _db.GlobalAccessListEntries.AsNoTracking()
            .OrderBy(e => e.ListType).ThenBy(e => e.Value)
            .ToListAsync();
        return Ok(entries);
    }

    [HttpPost("access-lists")]
    public async Task<IActionResult> AddAccessListEntry([FromBody] AccessListEntryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Value)) return BadRequest(new { error = "Value required" });

        var entry = new GlobalAccessListEntry
        {
            ListType = dto.ListType ?? "blacklist",
            MatchType = dto.MatchType ?? "email",
            Value = dto.Value.Trim().ToLowerInvariant(),
            Note = dto.Note,
            CreatedAt = DateTime.UtcNow,
        };
        _db.GlobalAccessListEntries.Add(entry);
        await _db.SaveChangesAsync();
        return Ok(entry);
    }

    [HttpDelete("access-lists/{entryId:int}")]
    public async Task<IActionResult> DeleteAccessListEntry(int entryId)
    {
        var entry = await _db.GlobalAccessListEntries.FindAsync(entryId);
        if (entry == null) return NotFound();
        _db.GlobalAccessListEntries.Remove(entry);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("privacy-regions")]
    public async Task<IActionResult> GetPrivacyRegions() =>
        Ok(await _db.PrivacyPolicyRegions.AsNoTracking().OrderBy(r => r.RegionCode).ToListAsync());

    [HttpPut("privacy-regions/{regionCode}")]
    public async Task<IActionResult> UpdatePrivacyRegion(string regionCode, [FromBody] PrivacyRegionDto dto)
    {
        var region = await _db.PrivacyPolicyRegions.FirstOrDefaultAsync(r => r.RegionCode == regionCode);
        if (region == null)
        {
            region = new PrivacyPolicyRegion { RegionCode = regionCode };
            _db.PrivacyPolicyRegions.Add(region);
        }
        if (dto.NoticeHtml != null) region.NoticeHtml = dto.NoticeHtml;
        if (dto.ConsentRequired.HasValue) region.ConsentRequired = dto.ConsentRequired.Value;
        if (dto.PolicyUrl != null) region.PolicyUrl = dto.PolicyUrl;
        region.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(region);
    }

    [HttpGet("events/{id:int}/analytics")]
    public async Task<IActionResult> GetEventAnalytics(int id)
    {
        var ev = await _db.ScheduledEvents.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (ev == null) return NotFound();

        var metrics = await _analytics.GetEventMetricsAsync(_db, ev, _recurrence);
        var occurrences = await _db.EventOccurrenceLogs.AsNoTracking()
            .Where(o => o.EventId == id)
            .OrderByDescending(o => o.OccurrenceStartUtc)
            .Take(50)
            .ToListAsync();

        return Ok(new { metrics, occurrences });
    }

    [HttpGet("events/{id:int}/chat/sessions")]
    public async Task<IActionResult> GetEventChatSessions(int id)
    {
        var (ev, sessionIds) = await ResolveEventSessionsAsync(id);
        if (ev == null) return NotFound();
        if (sessionIds.Count == 0) return Ok(Array.Empty<object>());

        var flowSlug = ev.FlowSlug;
        var sessions = await _db.ChatMessages
            .Where(m => sessionIds.Contains(m.SessionId) && (flowSlug == null || m.FlowSlug == flowSlug))
            .GroupBy(m => m.SessionId)
            .Select(g => new
            {
                sessionId = g.Key,
                lastMessage = g.OrderByDescending(m => m.CreatedAt).First().Text,
                lastAt = g.Max(m => m.CreatedAt),
                count = g.Count()
            })
            .OrderByDescending(s => s.lastAt)
            .Take(50)
            .ToListAsync();
        return Ok(sessions);
    }

    [HttpGet("events/{id:int}/leads")]
    public async Task<IActionResult> GetEventLeads(int id, [FromQuery] int limit = 200)
    {
        var (ev, sessionIds) = await ResolveEventSessionsAsync(id);
        if (ev == null) return NotFound();
        if (string.IsNullOrWhiteSpace(ev.FlowSlug)) return Ok(Array.Empty<object>());

        limit = Math.Clamp(limit, 1, 1000);
        if (sessionIds.Count == 0) return Ok(Array.Empty<object>());

        var leads = await _db.LeadSubmissions.AsNoTracking()
            .Where(l => l.FlowSlug == ev.FlowSlug && sessionIds.Contains(l.SessionId))
            .OrderByDescending(l => l.CreatedAt)
            .Take(limit)
            .Select(l => new
            {
                l.Id,
                l.SessionId,
                l.FlowSlug,
                l.Source,
                l.ChapterId,
                l.NodeId,
                l.AnswersJson,
                l.CreatedAt,
            })
            .ToListAsync();
        return Ok(leads);
    }

    [HttpGet("events/{id:int}/leads/export")]
    public async Task<IActionResult> ExportEventLeadsCsv(int id)
    {
        var (ev, sessionIds) = await ResolveEventSessionsAsync(id);
        if (ev == null) return NotFound();
        if (string.IsNullOrWhiteSpace(ev.FlowSlug)) return NotFound();

        var leads = sessionIds.Count == 0 ? [] :
            await _db.LeadSubmissions.AsNoTracking()
                .Where(l => l.FlowSlug == ev.FlowSlug && sessionIds.Contains(l.SessionId))
                .OrderByDescending(l => l.CreatedAt)
                .Take(5000)
                .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Id,SessionId,FlowSlug,Source,ChapterId,NodeId,CreatedAt,AnswersJson");
        foreach (var lead in leads)
        {
            sb.Append(lead.Id).Append(',')
                .Append(EscapeCsv(lead.SessionId)).Append(',')
                .Append(EscapeCsv(lead.FlowSlug)).Append(',')
                .Append(EscapeCsv(lead.Source)).Append(',')
                .Append(lead.ChapterId?.ToString() ?? "").Append(',')
                .Append(EscapeCsv(lead.NodeId ?? "")).Append(',')
                .Append(lead.CreatedAt.ToString("o")).Append(',')
                .Append(EscapeCsv(lead.AnswersJson));
            sb.AppendLine();
        }

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", $"event-{id}-leads.csv");
    }

    [HttpGet("events/{id:int}/engagement")]
    public async Task<IActionResult> GetEventEngagementLog(int id, [FromQuery] int limit = 100)
    {
        var (ev, sessionIds) = await ResolveEventSessionsAsync(id);
        if (ev == null) return NotFound();
        if (string.IsNullOrWhiteSpace(ev.FlowSlug)) return Ok(Array.Empty<object>());

        limit = Math.Clamp(limit, 1, 500);
        if (sessionIds.Count == 0) return Ok(Array.Empty<object>());

        var slug = ev.FlowSlug;
        var flow = await _db.FlowProjects.AsNoTracking().FirstOrDefaultAsync(f => f.Slug == slug);
        if (flow == null) return NotFound();

        var flowChapterIds = await _db.Chapters.AsNoTracking()
            .Where(c => c.FlowProjectId == flow.Id)
            .Select(c => c.Id)
            .ToListAsync();

        var watchBySession = await _db.ChapterViewRecords
            .Where(r => flowChapterIds.Contains(r.ChapterId) && sessionIds.Contains(r.SessionId))
            .GroupBy(r => r.SessionId)
            .Select(g => new { sessionId = g.Key, totalWatchSeconds = g.Sum(r => r.SecondsWatched) })
            .ToListAsync();

        var chatBySession = await _db.ChatMessages
            .Where(m => m.Role == "user" && m.FlowSlug == slug && sessionIds.Contains(m.SessionId))
            .GroupBy(m => m.SessionId)
            .Select(g => new { sessionId = g.Key, chatCount = g.Count() })
            .ToListAsync();

        var events = await _db.EngagementEvents.AsNoTracking()
            .Where(e => e.FlowSlug == slug && sessionIds.Contains(e.SessionId))
            .OrderByDescending(e => e.CreatedAt)
            .Take(limit * 20)
            .ToListAsync();

        var resultSessionIds = events.Select(e => e.SessionId)
            .Concat(watchBySession.Select(w => w.sessionId))
            .Concat(chatBySession.Select(c => c.sessionId))
            .Distinct()
            .OrderByDescending(sid => events.Where(e => e.SessionId == sid).Select(e => e.CreatedAt).DefaultIfEmpty(DateTime.MinValue).Max())
            .Take(limit)
            .ToList();

        var result = resultSessionIds.Select(sid =>
        {
            var watch = watchBySession.FirstOrDefault(w => w.sessionId == sid);
            var chat = chatBySession.FirstOrDefault(c => c.sessionId == sid);
            var sessionEvents = events.Where(e => e.SessionId == sid).OrderByDescending(e => e.CreatedAt).Take(50).ToList();
            return new
            {
                sessionId = sid,
                totalWatchSeconds = watch?.totalWatchSeconds ?? 0,
                chatMessages = chat?.chatCount ?? 0,
                toasterViews = sessionEvents.Count(e => e.EventType == "toaster_shown"),
                toasterDismissals = sessionEvents.Count(e => e.EventType == "toaster_dismissed"),
                downloads = sessionEvents.Count(e => e.EventType == "toaster_download"),
                flowSteps = sessionEvents.Count(e => e.EventType == "flow_step"),
                lastActivity = sessionEvents.FirstOrDefault()?.CreatedAt,
                events = sessionEvents.Select(e => new
                {
                    eventType = e.EventType,
                    e.ChapterId,
                    e.ToasterId,
                    e.DataJson,
                    e.CreatedAt
                })
            };
        });

        return Ok(result);
    }

    private async Task<(ScheduledEvent? ev, List<string> sessionIds)> ResolveEventSessionsAsync(int id)
    {
        var ev = await _db.ScheduledEvents.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (ev == null) return (null, []);
        var sessionIds = await _analytics.GetEventSessionIdsAsync(_db, ev.Slug);
        return (ev, sessionIds);
    }

    private async Task<IActionResult> SaveEventAsync(int? id, ScheduledEventDto dto)
    {
        ScheduledEvent ev;
        if (id.HasValue)
        {
            var found = await _db.ScheduledEvents.FindAsync(id.Value);
            if (found == null) return NotFound();
            ev = found;
        }
        else
        {
            if (string.IsNullOrWhiteSpace(dto.Slug) || string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { error = "Slug and title required" });
            ev = new ScheduledEvent();
            _db.ScheduledEvents.Add(ev);
        }

        var slug = string.IsNullOrWhiteSpace(dto.Slug) ? ev.Slug : Slugify(dto.Slug);
        if (await _db.ScheduledEvents.AnyAsync(e => e.Slug == slug && e.Id != ev.Id))
            return BadRequest(new { error = "Slug already in use" });

        if (string.IsNullOrWhiteSpace(dto.FlowSlug) && string.IsNullOrWhiteSpace(ev.FlowSlug))
            return BadRequest(new { error = "Flow slug is required" });

        var flowSlug = string.IsNullOrWhiteSpace(dto.FlowSlug) ? ev.FlowSlug! : Slugify(dto.FlowSlug);
        if (!await _db.FlowProjects.AnyAsync(f => f.Slug == flowSlug))
            return BadRequest(new { error = "Flow not found" });

        MapEventDto(ev, dto, slug, flowSlug);
        if (string.IsNullOrWhiteSpace(ev.AttendeeWebhookSecret))
            ev.AttendeeWebhookSecret = GenerateWebhookSecret();

        await _db.SaveChangesAsync();
        var metrics = await _analytics.GetEventMetricsAsync(_db, ev, _recurrence);
        return Ok(MapEventAdmin(ev, metrics, DateTime.UtcNow));
    }

    private static void MapEventDto(ScheduledEvent ev, ScheduledEventDto dto, string slug, string flowSlug)
    {
        ev.Slug = slug;
        ev.FlowSlug = flowSlug;
        if (dto.Title != null) ev.Title = dto.Title;
        if (dto.StartsAtUtc.HasValue) ev.StartsAtUtc = dto.StartsAtUtc.Value.ToUniversalTime();
        ev.HoldingHeading = dto.HoldingHeading;
        ev.HoldingMessage = dto.HoldingMessage;
        ev.HoldingImageUrl = dto.HoldingImageUrl;
        ev.HoldingVideoUrl = dto.HoldingVideoUrl;
        if (dto.HoldingVideoType != null) ev.HoldingVideoType = dto.HoldingVideoType;
        ev.DefaultChapterId = dto.DefaultChapterId;
        if (dto.RecurrenceType != null) ev.RecurrenceType = dto.RecurrenceType;
        ev.IntervalMinutes = dto.IntervalMinutes;
        if (dto.RecurrenceStartUtc.HasValue) ev.RecurrenceStartUtc = dto.RecurrenceStartUtc.Value.ToUniversalTime();
        if (dto.RecurrenceEndUtc.HasValue) ev.RecurrenceEndUtc = dto.RecurrenceEndUtc.Value.ToUniversalTime();
        if (dto.Timezone != null) ev.Timezone = dto.Timezone;
        ev.WeeklyScheduleJson = dto.WeeklyScheduleJson;
        ev.LiveDurationMinutes = dto.LiveDurationMinutes;
        if (dto.IsEnabled.HasValue) ev.IsEnabled = dto.IsEnabled.Value;
        else if (ev.Id == 0) ev.IsEnabled = true;
        if (dto.EventKind != null) ev.EventKind = dto.EventKind;
        if (dto.AccessMode != null) ev.AccessMode = dto.AccessMode;
        ev.RegistrationFormJson = dto.RegistrationFormJson;
        if (dto.RegistrationApprovalMode != null) ev.RegistrationApprovalMode = dto.RegistrationApprovalMode;
        ev.CrmListKey = dto.CrmListKey;
        ev.PrivacyPolicyOverrideJson = dto.PrivacyPolicyOverrideJson;
        ev.AccessOverrideJson = dto.AccessOverrideJson;
        ev.UpdatedAt = DateTime.UtcNow;
    }

    private object MapEventAdmin(ScheduledEvent ev, object metricsObj, DateTime now)
    {
        return new
        {
            ev.Id,
            ev.Slug,
            ev.Title,
            ev.StartsAtUtc,
            ev.HoldingHeading,
            ev.HoldingMessage,
            ev.HoldingImageUrl,
            ev.HoldingVideoUrl,
            ev.HoldingVideoType,
            ev.DefaultChapterId,
            ev.FlowSlug,
            ev.RecurrenceType,
            ev.IntervalMinutes,
            ev.RecurrenceStartUtc,
            ev.RecurrenceEndUtc,
            ev.Timezone,
            ev.WeeklyScheduleJson,
            ev.LiveDurationMinutes,
            ev.IsEnabled,
            ev.EventKind,
            ev.AccessMode,
            ev.RegistrationFormJson,
            ev.RegistrationApprovalMode,
            ev.CrmListKey,
            ev.AttendeeWebhookSecret,
            ev.PrivacyPolicyOverrideJson,
            ev.AccessOverrideJson,
            ev.DuplicatedFromId,
            ev.OnDemandLiveStartUtc,
            ev.UpdatedAt,
            occurrence = new
            {
                nextStartsAtUtc = _recurrence.GetNextStartsAtUtc(ev, now),
                isLive = _recurrence.IsLive(ev, now),
                displayStatus = _recurrence.GetEventDisplayStatus(ev, now),
                serverNowUtc = now,
            },
            metrics = metricsObj,
        };
    }

    private static object MapAttendee(EventAttendee a) => new
    {
        a.Id,
        a.EventId,
        a.Email,
        a.Name,
        a.Status,
        a.Source,
        a.RejectedReason,
        a.AnswersJson,
        a.ConsentRegion,
        a.ConsentGivenAt,
        a.ConsentNoticeVersion,
        a.CreatedAt,
        a.UpdatedAt,
    };

    private static string Slugify(string raw) =>
        new string(raw.Trim().ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-')
            .ToArray()).Trim('-');

    private static string GenerateWebhookSecret() =>
        Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    public record ScheduledEventDto(
        string? Slug, string? Title, DateTime? StartsAtUtc, string? HoldingHeading, string? HoldingMessage,
        string? HoldingImageUrl, string? HoldingVideoUrl, string? HoldingVideoType,
        int? DefaultChapterId, string? FlowSlug, string? RecurrenceType, int? IntervalMinutes,
        DateTime? RecurrenceStartUtc, DateTime? RecurrenceEndUtc, string? Timezone,
        string? WeeklyScheduleJson, int? LiveDurationMinutes, bool? IsEnabled,
        string? EventKind, string? AccessMode, string? RegistrationFormJson,
        string? RegistrationApprovalMode, string? CrmListKey,
        string? PrivacyPolicyOverrideJson, string? AccessOverrideJson);

    public record InstantEventDto(string? Slug, string? Title, string FlowSlug, string? HoldingHeading,
        string? HoldingMessage, int? LiveDurationMinutes, string? AccessMode);

    public record DuplicateEventDto(string? NewSlug, string? NewTitle);

    public record AttendeeDto(string Email, string? Name, string? Status);

    public record AttendeeStatusDto(string? Status, string? RejectedReason, string? Name);

    public record CsvImportDto(string CsvContent, string? DefaultStatus);

    public record AccessListEntryDto(string? ListType, string? MatchType, string Value, string? Note);

    public record PrivacyRegionDto(string? NoticeHtml, bool? ConsentRequired, string? PolicyUrl);
}
