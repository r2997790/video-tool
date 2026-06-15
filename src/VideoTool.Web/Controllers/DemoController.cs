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

    public DemoController(VideoToolDbContext db, ChatMessageService chat, RecurrenceService recurrence, LeadNotificationService leadNotify)
    {
        _db = db;
        _chat = chat;
        _recurrence = recurrence;
        _leadNotify = leadNotify;
    }



    [HttpGet("config")]

    public Task<IActionResult> GetConfigLegacy() => GetConfigBySlug("default");



    [HttpGet("config/{slug}")]

    public async Task<IActionResult> GetConfigBySlug(string slug)

    {

        var flow = await _db.FlowProjects.AsNoTracking()

            .FirstOrDefaultAsync(f => f.Slug == slug && f.IsEnabled);

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

        var flow = await _db.FlowProjects.AsNoTracking()

            .FirstOrDefaultAsync(f => f.Slug == slug && f.IsEnabled);

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

    public async Task<IActionResult> GetScheduledEvent(string slug)

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

    public record HeartbeatRequest(string SessionId, int ChapterId, int SecondsWatched);

    public record EngagementEventRequest(string SessionId, string EventType, int? ChapterId, int? ToasterId, string? DataJson, string? FlowSlug = null);

    public record LeadSubmissionRequest(string SessionId, string FlowSlug, string Source, string? AnswersJson, int? ChapterId = null, string? NodeId = null);

}


