using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoTool.Data;
using VideoTool.Domain.Entities;
using VideoTool.Web.Services;



namespace VideoTool.Web.Controllers;



[ApiController]

[Route("api/demo")]

public class DemoController : ControllerBase

{

    private readonly VideoToolDbContext _db;
    private readonly ChatMessageService _chat;
    private readonly RecurrenceService _recurrence;
    private readonly LeadNotificationService _leadNotify;
    private readonly EventAccessService _access;
    private readonly EventSessionService _session;
    private readonly PrivacyPolicyService _privacy;
    private readonly AttendeeImportService _attendeeImport;

    public DemoController(
        VideoToolDbContext db,
        ChatMessageService chat,
        RecurrenceService recurrence,
        LeadNotificationService leadNotify,
        EventAccessService access,
        EventSessionService session,
        PrivacyPolicyService privacy,
        AttendeeImportService attendeeImport)
    {
        _db = db;
        _chat = chat;
        _recurrence = recurrence;
        _leadNotify = leadNotify;
        _access = access;
        _session = session;
        _privacy = privacy;
        _attendeeImport = attendeeImport;
    }

    private async Task<FlowProject?> GetFlowForDemoAsync(string slug)
    {
        var flow = await _db.FlowProjects.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Slug == slug);
        if (flow == null) return null;
        if (flow.IsEnabled) return flow;
        if (User.Identity?.IsAuthenticated == true) return flow;
        return null;
    }



    [HttpGet("home")]
    public async Task<IActionResult> GetHome()
    {
        var config = await _db.DemoConfigs.AsNoTracking().FirstAsync();
        var now = DateTime.UtcNow;

        var flows = await _db.FlowProjects.AsNoTracking()
            .Where(f => f.IsEnabled)
            .OrderBy(f => f.ProjectName)
            .Select(f => new
            {
                f.Slug,
                projectName = f.ProjectName,
                url = $"/flow/{f.Slug}",
            })
            .ToListAsync();

        var scheduledEvents = await _db.ScheduledEvents.AsNoTracking()
            .Where(e => e.IsEnabled)
            .OrderBy(e => e.StartsAtUtc)
            .ToListAsync();

        var events = scheduledEvents
            .Select(ev =>
            {
                var nextStarts = _recurrence.GetNextStartsAtUtc(ev, now);
                var isLive = _recurrence.IsLive(ev, now);
                return new
                {
                    ev.Slug,
                    ev.Title,
                    ev.FlowSlug,
                    ev.Timezone,
                    startsAtUtc = ev.StartsAtUtc,
                    nextStartsAtUtc = nextStarts,
                    isLive,
                    url = $"/event/{ev.Slug}",
                };
            })
            .Where(e => e.isLive || (e.nextStartsAtUtc.HasValue && e.nextStartsAtUtc.Value >= now.AddHours(-2)))
            .Take(6)
            .ToList();

        return Ok(new
        {
            brandName = config.ThemeBrandName,
            logoUrl = config.ThemeLogoUrl,
            primaryColor = config.ThemePrimaryColor,
            accentColor = config.ThemeAccentColor,
            tagline = config.DemoChatSubtitle,
            contact = new
            {
                sales = config.SalesEmail,
                support = config.SupportEmail,
                privacy = config.PrivacyEmail,
                legal = config.LegalEmail,
                dpo = config.DpoEmail,
            },
            trustLogos = ParseTrustLogos(config.TrustLogosJson),
            flows,
            events,
        });
    }

    private static List<object> ParseTrustLogos(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<object>();
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return new List<object>();
            var list = new List<object>();
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object) continue;
                var name = item.TryGetProperty("name", out var n) ? n.GetString() : null;
                var logoUrl = item.TryGetProperty("logoUrl", out var u) ? u.GetString() : null;
                if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(logoUrl)) continue;
                list.Add(new { name = name.Trim(), logoUrl = logoUrl.Trim() });
            }
            return list;
        }
        catch
        {
            return new List<object>();
        }
    }

    [HttpGet("config")]

    public Task<IActionResult> GetConfigLegacy() => GetConfigBySlug("default");



    [HttpGet("config/{slug}")]

    public async Task<IActionResult> GetConfigBySlug(string slug)

    {

        var flow = await GetFlowForDemoAsync(slug);

        if (flow == null) return NotFound(new { error = "Flow not found or disabled" });



        var config = await _db.DemoConfigs.AsNoTracking().FirstAsync();

        var chapters = await _db.Chapters.AsNoTracking()
            .Where(c => c.FlowProjectId == flow.Id)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

        var chapterIds = chapters.Select(c => c.Id).ToList();
        var allVideos = await _db.ChapterVideos.AsNoTracking()
            .Where(v => chapterIds.Contains(v.ChapterId))
            .OrderBy(v => v.SortOrder)
            .ToListAsync();
        var videosByChapter = allVideos.GroupBy(v => v.ChapterId).ToDictionary(g => g.Key, g => g.ToList());

        var seedMessages = config.SeedChatEnabled
            ? await _db.SeedChatMessages.AsNoTracking()
                .Where(m => m.FlowProjectId == flow.Id)
                .OrderBy(m => m.SortOrder)
                .ToListAsync()
            : new List<SeedChatMessage>();

        var toasters = await _db.VideoToasters.AsNoTracking()
            .Where(t => t.FlowProjectId == flow.Id && t.IsEnabled)

            .OrderBy(t => t.SortOrder)

            .Select(t => new {

                t.Id, t.ChapterId, t.TriggerAtSeconds, t.DurationSeconds, t.Title, t.Message,

                toasterType = t.ToasterType, t.ImageUrl, t.LinkUrl, t.LinkNewWindow, t.ThumbnailUrl,

                t.DownloadUrl, t.DownloadFileName, t.BannerPosition

            })

            .ToListAsync();

        var pausePoints = await _db.VideoPausePoints.AsNoTracking()
            .Where(p => p.FlowProjectId == flow.Id && p.IsEnabled)

            .OrderBy(p => p.SortOrder)

            .Select(p => new {

                p.Id, p.ChapterId, p.TriggerAtSeconds, p.Prompt, p.FieldId,

                inputType = p.InputType, p.OptionsJson, p.Required, p.Placeholder

            })

            .ToListAsync();



        return Ok(new

        {

            flowSlug = flow.Slug,

            config = MapConfig(config),

            chapters = chapters.Select(ch => MapChapter(ch, videosByChapter.GetValueOrDefault(ch.Id))),

            seedMessages = seedMessages.Select(m => new { m.Role, m.Text }),

            flow = new { flow.ProjectName, projectData = JsonSerializer.Deserialize<object>(flow.ProjectDataJson) },

            toasters,

            pausePoints = pausePoints.Select(p => new

            {

                p.Id, p.ChapterId, p.TriggerAtSeconds, p.Prompt, p.FieldId,

                p.inputType,

                options = ParseOptionsJson(p.OptionsJson),

                p.Required, p.Placeholder

            })

        });

    }



    [HttpGet("flow/{slug}")]

    public async Task<IActionResult> GetFlowBySlug(string slug)

    {

        var flow = await GetFlowForDemoAsync(slug);

        if (flow == null) return NotFound(new { error = "Flow not found or disabled" });



        return Ok(new

        {

            flow.Slug,

            flow.ProjectName,

            projectData = JsonSerializer.Deserialize<object>(flow.ProjectDataJson),

        });

    }



    [HttpGet("chapters")]

    public async Task<IActionResult> GetChapters()

    {

        var chapters = await _db.Chapters.AsNoTracking().OrderBy(c => c.SortOrder).ToListAsync();
        var chapterIds = chapters.Select(c => c.Id).ToList();
        var videosByChapter = await _db.ChapterVideos.AsNoTracking()
            .Where(v => chapterIds.Contains(v.ChapterId))
            .GroupBy(v => v.ChapterId)
            .ToDictionaryAsync(g => g.Key, g => g.ToList());

        return Ok(chapters.Select(ch => MapChapter(ch, videosByChapter.GetValueOrDefault(ch.Id))));

    }



    [HttpPost("chat")]
    public async Task<IActionResult> SendChat([FromBody] ChatRequest req)
    {
        var config = await _db.DemoConfigs.AsNoTracking().FirstAsync();
        if (!config.ChatEnabled)
            return BadRequest(new { error = "Chat is disabled" });

        if (string.IsNullOrWhiteSpace(req.Message) || string.IsNullOrWhiteSpace(req.SessionId))
            return BadRequest(new { error = "Message and sessionId required" });

        var userPayload = await _chat.SendUserMessageAsync(req.SessionId, req.Message, req.ChapterContext, source: "demo", flowSlug: req.FlowSlug);
        if (userPayload == null)
            return BadRequest(new { error = "Failed to send message" });

        return Ok(new { userMessage = userPayload });
    }



    [HttpGet("chat/{sessionId}")]

    public async Task<IActionResult> GetChatHistory(string sessionId)

    {

        var messages = await _db.ChatMessages.AsNoTracking()

            .Where(m => m.SessionId == sessionId)

            .OrderBy(m => m.CreatedAt)

            .Select(m => new { m.Id, m.Role, m.Text, m.Source, m.CreatedAt })

            .ToListAsync();

        return Ok(messages);

    }



    [HttpPost("analytics/heartbeat")]

    public async Task<IActionResult> Heartbeat([FromBody] HeartbeatRequest req)

    {

        if (string.IsNullOrWhiteSpace(req.SessionId) || req.ChapterId <= 0 || req.SecondsWatched < 0)

            return BadRequest();



        if (!string.IsNullOrWhiteSpace(req.EventSlug))
        {
            await _session.LinkSessionAsync(_db, req.SessionId.Trim(), req.EventSlug.Trim(),
                req.EventOccurrenceStartUtc, viewerEmail: req.ViewerEmail);
        }



        var record = await _db.ChapterViewRecords

            .FirstOrDefaultAsync(r => r.SessionId == req.SessionId && r.ChapterId == req.ChapterId);



        if (record == null)

        {

            record = new ChapterViewRecord

            {

                SessionId = req.SessionId,

                ChapterId = req.ChapterId,

                SecondsWatched = req.SecondsWatched,

                UpdatedAt = DateTime.UtcNow

            };

            _db.ChapterViewRecords.Add(record);

        }

        else if (req.SecondsWatched > record.SecondsWatched)

        {

            record.SecondsWatched = req.SecondsWatched;

            record.UpdatedAt = DateTime.UtcNow;

        }



        await _db.SaveChangesAsync();

        return Ok();

    }



    [HttpPost("analytics/event")]

    public async Task<IActionResult> LogEvent([FromBody] EngagementEventRequest req)

    {

        if (string.IsNullOrWhiteSpace(req.SessionId) || string.IsNullOrWhiteSpace(req.EventType))

            return BadRequest();



        if (!string.IsNullOrWhiteSpace(req.EventSlug))
        {
            await _session.LinkSessionAsync(_db, req.SessionId.Trim(), req.EventSlug.Trim(),
                req.EventOccurrenceStartUtc, viewerEmail: req.ViewerEmail);
        }



        _db.EngagementEvents.Add(new EngagementEvent
        {
            SessionId = req.SessionId.Trim(),
            FlowSlug = req.FlowSlug?.Trim(),
            EventType = req.EventType.Trim(),

            ChapterId = req.ChapterId,

            ToasterId = req.ToasterId,

            DataJson = req.DataJson,

            CreatedAt = DateTime.UtcNow

        });

        await _db.SaveChangesAsync();

        return Ok();

    }



    [HttpPost("analytics/lead")]

    public async Task<IActionResult> SubmitLead([FromBody] LeadSubmissionRequest req)

    {

        if (string.IsNullOrWhiteSpace(req.SessionId) || string.IsNullOrWhiteSpace(req.FlowSlug) || string.IsNullOrWhiteSpace(req.Source))

            return BadRequest(new { error = "sessionId, flowSlug, and source required" });



        var answersJson = string.IsNullOrWhiteSpace(req.AnswersJson)

            ? "{}"

            : req.AnswersJson;



        var lead = new LeadSubmission

        {

            SessionId = req.SessionId.Trim(),

            FlowSlug = req.FlowSlug.Trim(),

            Source = req.Source.Trim(),

            ChapterId = req.ChapterId,

            NodeId = req.NodeId?.Trim(),

            AnswersJson = answersJson,

            CreatedAt = DateTime.UtcNow,

        };

        _db.LeadSubmissions.Add(lead);

        await _db.SaveChangesAsync();



        var config = await _db.DemoConfigs.FirstAsync();

        await _leadNotify.NotifyAsync(config, lead);



        return Ok(new { id = lead.Id });

    }



    [HttpGet("event/{slug}")]

    public async Task<IActionResult> GetScheduledEvent(string slug, [FromQuery] string? sessionId, [FromQuery] string? email)

    {

        var ev = await _db.ScheduledEvents.AsNoTracking()

            .FirstOrDefaultAsync(e => e.Slug == slug && e.IsEnabled);

        if (ev == null) return NotFound();



        var now = DateTime.UtcNow;

        var nextStarts = _recurrence.GetNextStartsAtUtc(ev, now);

        var isLive = _recurrence.IsLive(ev, now);



        var holdingVideoType = ev.HoldingVideoType;

        var holdingVideoValue = ev.HoldingVideoUrl ?? "";

        if (!string.IsNullOrWhiteSpace(ev.HoldingVideoUrl) && (holdingVideoType == "none" || string.IsNullOrEmpty(holdingVideoType)))

        {

            var (parsedType, parsedValue) = VideoLinkParser.Parse(ev.HoldingVideoUrl);

            holdingVideoType = parsedType;

            holdingVideoValue = parsedValue;

        }



        var normalizedEmail = string.IsNullOrWhiteSpace(email) ? null : EventAccessService.NormalizeEmail(email);
        var requiresRegistration = ev.AccessMode == "selective";
        var accessDenied = false;
        string? attendeeStatus = null;

        if (!string.IsNullOrWhiteSpace(normalizedEmail))
        {
            var attendee = await _db.EventAttendees.AsNoTracking()
                .FirstOrDefaultAsync(a => a.EventId == ev.Id && a.Email == normalizedEmail);
            attendeeStatus = attendee?.Status;
        }

        if (requiresRegistration)
        {
            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                accessDenied = true;
            }
            else
            {
                accessDenied = !await _access.CanAccessAsync(_db, ev, normalizedEmail);
            }
        }

        if (!string.IsNullOrWhiteSpace(sessionId))
        {
            await _session.LinkSessionAsync(_db, sessionId.Trim(), ev.Slug, nextStarts, viewerEmail: normalizedEmail);
        }



        object? registrationForm = null;
        if (!string.IsNullOrWhiteSpace(ev.RegistrationFormJson))
        {
            try { registrationForm = JsonSerializer.Deserialize<object>(ev.RegistrationFormJson); }
            catch { /* ignore */ }
        }



        return Ok(new

        {

            ev.Slug,

            ev.Title,

            flowSlug = ev.FlowSlug,

            startsAtUtc = ev.StartsAtUtc,

            nextStartsAtUtc = nextStarts,

            isLive,

            holdingHeading = ev.HoldingHeading,

            holdingMessage = ev.HoldingMessage,

            holdingImageUrl = ev.HoldingImageUrl,

            holdingVideoType,

            holdingVideoValue,

            defaultChapterId = ev.DefaultChapterId,

            recurrenceType = ev.RecurrenceType,

            timezone = ev.Timezone,

            serverNowUtc = now,

            accessMode = ev.AccessMode,

            requiresRegistration,

            accessDenied,

            attendeeStatus,

            registrationForm,

            registrationApprovalMode = ev.RegistrationApprovalMode,

        });

    }



    [HttpPost("event/{slug}/register")]

    public async Task<IActionResult> RegisterForEvent(string slug, [FromBody] EventRegistrationRequest req)

    {

        var ev = await _db.ScheduledEvents.FirstOrDefaultAsync(e => e.Slug == slug && e.IsEnabled);

        if (ev == null) return NotFound();



        if (string.IsNullOrWhiteSpace(req.SessionId) || string.IsNullOrWhiteSpace(req.Email))

            return BadRequest(new { error = "Session ID and email required" });



        var email = EventAccessService.NormalizeEmail(req.Email);

        if (!await _access.CanRegisterAsync(_db, ev, email))

            return BadRequest(new { error = "Registration not allowed for this email" });



        var region = _privacy.ResolveRegion(req.Locale, req.Timezone);

        var policy = await _privacy.GetPolicyAsync(_db, region, ev);

        if (policy.ConsentRequired && !req.ConsentGiven)

            return BadRequest(new { error = "Consent required", region, consentRequired = true });



        var status = ev.RegistrationApprovalMode switch

        {

            "manual" => "pending",

            "crm_or_form" => "pending",

            _ => "approved",

        };



        var attendee = await _db.EventAttendees.FirstOrDefaultAsync(a => a.EventId == ev.Id && a.Email == email);

        if (attendee == null)

        {

            attendee = new EventAttendee

            {

                EventId = ev.Id,

                Email = email,

                Name = req.Name,

                Status = status,

                Source = "app_form",

                AnswersJson = req.AnswersJson,

                ConsentRegion = region,

                ConsentGivenAt = req.ConsentGiven ? DateTime.UtcNow : null,

                ConsentNoticeVersion = policy.RegionCode,

                CreatedAt = DateTime.UtcNow,

                UpdatedAt = DateTime.UtcNow,

            };

            _db.EventAttendees.Add(attendee);

        }

        else if (attendee.Status == "rejected")

        {

            return BadRequest(new { error = "Registration was previously rejected" });

        }

        else

        {

            attendee.Name ??= req.Name;

            attendee.AnswersJson = req.AnswersJson ?? attendee.AnswersJson;

            attendee.UpdatedAt = DateTime.UtcNow;

        }



        await _db.SaveChangesAsync();



        await _session.LinkSessionAsync(_db, req.SessionId.Trim(), ev.Slug,

            _recurrence.GetNextStartsAtUtc(ev, DateTime.UtcNow), attendee.Id, email);



        var config = await _db.DemoConfigs.FirstAsync();

        await _attendeeImport.NotifyRegistrationAsync(config, ev, attendee);



        return Ok(new { attendee.Id, attendee.Status, attendee.Email });

    }



    [HttpGet("event/{slug}/privacy")]

    public async Task<IActionResult> GetEventPrivacy(string slug, [FromQuery] string? locale, [FromQuery] string? timezone)

    {

        var ev = await _db.ScheduledEvents.AsNoTracking()

            .FirstOrDefaultAsync(e => e.Slug == slug && e.IsEnabled);

        if (ev == null) return NotFound();



        var region = _privacy.ResolveRegion(locale, timezone);

        var policy = await _privacy.GetPolicyAsync(_db, region, ev);

        return Ok(new

        {

            region,

            noticeHtml = policy.NoticeHtml,

            consentRequired = policy.ConsentRequired,

            policyUrl = policy.PolicyUrl,

        });

    }



    private static object MapConfig(DemoConfig c) => new

    {

        c.Autoplay,

        c.ShowDuration,

        c.ChatEnabled,

        c.AiEnabled,

        c.NotificationsEnabled,

        c.LiveChatEnabled,

        c.SeedChatEnabled,

        c.ChapterPickEnabled,

        c.PauseEnabled,

        theme = new

        {

            primaryColor = c.ThemePrimaryColor,

            accentColor = c.ThemeAccentColor,

            backgroundColor = c.ThemeBackgroundColor,

            surfaceColor = c.ThemeSurfaceColor,

            textColor = c.ThemeTextColor,

            fontFamily = c.ThemeFontFamily,

            brandName = c.ThemeBrandName,
            chatTitle = c.ThemeChatTitle,
            logoUrl = c.ThemeLogoUrl,
        },
        demoChatSubtitle = c.DemoChatSubtitle,
    };



    private static string[] ParseOptionsJson(string? json)

    {

        if (string.IsNullOrWhiteSpace(json)) return [];

        try { return JsonSerializer.Deserialize<string[]>(json) ?? []; }

        catch { return []; }

    }



    private static object MapChapter(Chapter ch, List<ChapterVideo>? videos = null)

    {

        object? gate = null;

        if (!string.IsNullOrEmpty(ch.GateJson))

        {

            try { gate = JsonSerializer.Deserialize<object>(ch.GateJson); }

            catch { /* ignore */ }

        }



        var (videoType, videoValue) = VideoLinkParser.Parse(ch.VideoLink);
        var videoList = (videos ?? []).OrderBy(v => v.SortOrder).Select(v =>
        {
            var (vt, vv) = VideoLinkParser.Parse(v.VideoLink);
            return new
            {
                v.Id,
                v.ChapterId,
                v.Title,
                videoLink = v.VideoLink,
                v.Duration,
                v.SortOrder,
                videoType = vt,
                videoValue = vv,
            };
        }).ToList();

        return new

        {

            ch.Id,

            ch.Slug,

            num = ch.SortOrder.ToString("00"),

            name = ch.Name,

            description = ch.Description,

            ch.Duration,

            videoLink = ch.VideoLink,

            videoType,

            videoValue,

            videos = videoList,

            ch.IsLocked,
            showDuration = ch.ShowDuration,
            gate
        };
    }



    public record ChatRequest(string SessionId, string Message, string? ChapterContext, string? FlowSlug = null);

    public record HeartbeatRequest(string SessionId, int ChapterId, int SecondsWatched, string? EventSlug = null, DateTime? EventOccurrenceStartUtc = null, string? ViewerEmail = null);

    public record EngagementEventRequest(string SessionId, string EventType, int? ChapterId, int? ToasterId, string? DataJson, string? FlowSlug = null, string? EventSlug = null, DateTime? EventOccurrenceStartUtc = null, string? ViewerEmail = null);

    public record LeadSubmissionRequest(string SessionId, string FlowSlug, string Source, string? AnswersJson, int? ChapterId = null, string? NodeId = null);

    public record EventRegistrationRequest(string SessionId, string Email, string? Name, string? AnswersJson, bool ConsentGiven, string? Locale, string? Timezone);

}


