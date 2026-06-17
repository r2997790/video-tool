using Microsoft.EntityFrameworkCore;
using VideoTool.Data;
using VideoTool.Domain.Entities;

namespace VideoTool.Web.Services;

public class EventAnalyticsService
{
    public async Task<object> GetEventMetricsAsync(VideoToolDbContext db, ScheduledEvent ev, RecurrenceService recurrence)
    {
        var now = DateTime.UtcNow;
        var sessionLinks = await db.EventSessionLinks.AsNoTracking()
            .Where(l => l.EventSlug == ev.Slug)
            .Select(l => l.SessionId)
            .Distinct()
            .ToListAsync();

        var registeredCount = await db.EventAttendees.AsNoTracking()
            .CountAsync(a => a.EventId == ev.Id && (a.Status == "approved" || a.Status == "pending"));

        var approvedCount = await db.EventAttendees.AsNoTracking()
            .CountAsync(a => a.EventId == ev.Id && a.Status == "approved");

        var attendeeCount = sessionLinks.Count;

        var watchSeconds = 0;
        var engagementScore = 0.0;
        var chatMessages = 0;

        if (sessionLinks.Count > 0)
        {
            watchSeconds = await db.ChapterViewRecords.AsNoTracking()
                .Where(r => sessionLinks.Contains(r.SessionId))
                .SumAsync(r => r.SecondsWatched);

            chatMessages = await db.ChatMessages.AsNoTracking()
                .CountAsync(m => m.Role == "user" && sessionLinks.Contains(m.SessionId));

            var events = await db.EngagementEvents.AsNoTracking()
                .Where(e => sessionLinks.Contains(e.SessionId))
                .ToListAsync();

            var chatCount = events.Count(e => e.EventType == "chat_message");
            var flowSteps = events.Count(e => e.EventType == "flow_step");
            engagementScore = watchSeconds * 0.5 + chatCount * 10 + flowSteps * 5;
        }

        return new
        {
            registeredCount,
            approvedCount,
            attendeeCount,
            totalWatchSeconds = watchSeconds,
            chatMessages,
            engagementScore = Math.Round(engagementScore, 1),
            displayStatus = recurrence.GetEventDisplayStatus(ev, now),
            recurrenceLabel = string.IsNullOrWhiteSpace(ev.RecurrenceType) || ev.RecurrenceType == "none" ? "Once" : "Recurring",
            nextStartsAtUtc = recurrence.GetNextStartsAtUtc(ev, now),
            isLive = recurrence.IsLive(ev, now),
        };
    }

    public async Task<List<string>> GetEventSessionIdsAsync(VideoToolDbContext db, string eventSlug) =>
        await db.EventSessionLinks.AsNoTracking()
            .Where(l => l.EventSlug == eventSlug)
            .Select(l => l.SessionId)
            .Distinct()
            .ToListAsync();

    public async Task<object> GetSummaryAsync(VideoToolDbContext db, RecurrenceService recurrence)
    {
        var events = await db.ScheduledEvents.AsNoTracking().ToListAsync();
        var enabledCount = events.Count(e => e.IsEnabled);
        var totalAttendees = await db.EventSessionLinks.AsNoTracking()
            .Select(l => l.SessionId)
            .Distinct()
            .CountAsync();

        var allSessionIds = await db.EventSessionLinks.AsNoTracking()
            .Select(l => l.SessionId)
            .Distinct()
            .ToListAsync();

        var totalWatchSeconds = allSessionIds.Count == 0 ? 0 :
            await db.ChapterViewRecords.AsNoTracking()
                .Where(r => allSessionIds.Contains(r.SessionId))
                .SumAsync(r => r.SecondsWatched);

        var engagementEvents = allSessionIds.Count == 0 ? [] :
            await db.EngagementEvents.AsNoTracking()
                .Where(e => allSessionIds.Contains(e.SessionId))
                .ToListAsync();

        var engagementScore = totalWatchSeconds * 0.5
            + engagementEvents.Count(e => e.EventType == "chat_message") * 10
            + engagementEvents.Count(e => e.EventType == "flow_step") * 5;

        return new
        {
            totalEvents = events.Count,
            activeEvents = enabledCount,
            totalAttendees,
            totalWatchSeconds,
            engagementScore = Math.Round(engagementScore, 1),
        };
    }
}
