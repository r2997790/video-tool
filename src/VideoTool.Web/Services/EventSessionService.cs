using Microsoft.EntityFrameworkCore;
using VideoTool.Data;
using VideoTool.Domain.Entities;

namespace VideoTool.Web.Services;

public class EventSessionService
{
    public async Task<EventSessionLink> LinkSessionAsync(
        VideoToolDbContext db,
        string sessionId,
        string eventSlug,
        DateTime? occurrenceStartUtc = null,
        int? attendeeId = null,
        string? viewerEmail = null)
    {
        var link = await db.EventSessionLinks
            .FirstOrDefaultAsync(l => l.SessionId == sessionId && l.EventSlug == eventSlug);

        if (link == null)
        {
            link = new EventSessionLink
            {
                SessionId = sessionId,
                EventSlug = eventSlug,
                EventOccurrenceStartUtc = occurrenceStartUtc,
                RegisteredAttendeeId = attendeeId,
                ViewerEmail = viewerEmail,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.EventSessionLinks.Add(link);
        }
        else
        {
            if (occurrenceStartUtc.HasValue) link.EventOccurrenceStartUtc = occurrenceStartUtc;
            if (attendeeId.HasValue) link.RegisteredAttendeeId = attendeeId;
            if (!string.IsNullOrWhiteSpace(viewerEmail)) link.ViewerEmail = viewerEmail;
            link.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        return link;
    }
}
