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
public class AdminController : ControllerBase
{
    private static readonly JsonSerializerOptions FlowJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly VideoToolDbContext _db;
    private readonly ChatMessageService _chat;
    private readonly IWebHostEnvironment _env;
    private readonly LeadNotificationService _leadNotify;

    public AdminController(VideoToolDbContext db, ChatMessageService chat, IWebHostEnvironment env, LeadNotificationService leadNotify)
    {
        _db = db;
        _chat = chat;
        _env = env;
        _leadNotify = leadNotify;
    }

    private Task<FlowProject?> ResolveFlowAsync(string slug) =>
        _db.FlowProjects.FirstOrDefaultAsync(f => f.Slug == slug);

    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
    {
        var config = await _db.DemoConfigs.FirstAsync();
        return Ok(config);
    }

    [HttpPut("config")]
    public async Task<IActionResult> UpdateConfig([FromBody] DemoConfigUpdate dto)
    {
        var config = await _db.DemoConfigs.FirstAsync();
        config.Autoplay = dto.Autoplay;
        config.ShowDuration = dto.ShowDuration;
        config.ChatEnabled = dto.ChatEnabled;
        config.AiEnabled = dto.AiEnabled;
        config.NotificationsEnabled = dto.NotificationsEnabled;
        config.LiveChatEnabled = dto.LiveChatEnabled;
        config.SeedChatEnabled = dto.SeedChatEnabled;
        config.ChapterPickEnabled = dto.ChapterPickEnabled;
        config.PauseEnabled = dto.PauseEnabled;
        config.AiSystemPrompt = dto.AiSystemPrompt ?? config.AiSystemPrompt;
        if (dto.ThemePrimaryColor != null) config.ThemePrimaryColor = dto.ThemePrimaryColor;
        if (dto.ThemeAccentColor != null) config.ThemeAccentColor = dto.ThemeAccentColor;
        if (dto.ThemeBackgroundColor != null) config.ThemeBackgroundColor = dto.ThemeBackgroundColor;
        if (dto.ThemeSurfaceColor != null) config.ThemeSurfaceColor = dto.ThemeSurfaceColor;
        if (dto.ThemeTextColor != null) config.ThemeTextColor = dto.ThemeTextColor;
        if (dto.ThemeFontFamily != null) config.ThemeFontFamily = dto.ThemeFontFamily;
        if (dto.ThemeBrandName != null) config.ThemeBrandName = dto.ThemeBrandName;
        if (dto.ThemeChatTitle != null) config.ThemeChatTitle = dto.ThemeChatTitle;
        if (dto.ThemeLogoUrl != null) config.ThemeLogoUrl = dto.ThemeLogoUrl;
        config.SlackEnabled = dto.SlackEnabled;
        if (dto.SlackChannelId != null) config.SlackChannelId = dto.SlackChannelId;
        config.TeamsEnabled = dto.TeamsEnabled;
        if (dto.TeamsServiceUrl != null) config.TeamsServiceUrl = dto.TeamsServiceUrl;
        if (dto.LeadWebhookUrl != null) config.LeadWebhookUrl = dto.LeadWebhookUrl;
        if (dto.LeadNotifyEmail != null) config.LeadNotifyEmail = dto.LeadNotifyEmail;
        if (dto.DemoChatSubtitle != null) config.DemoChatSubtitle = dto.DemoChatSubtitle;
        if (dto.AttendeeWebhookUrl != null) config.AttendeeWebhookUrl = dto.AttendeeWebhookUrl;
        if (dto.BlockedEmailDomainsJson != null) config.BlockedEmailDomainsJson = dto.BlockedEmailDomainsJson;
        config.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(config);
    }

    [HttpGet("chapters")]
    public Task<IActionResult> GetChaptersLegacy() => GetFlowChapters("default");

    [HttpGet("flows/{slug}/chapters")]
    public async Task<IActionResult> GetFlowChapters(string slug)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var chapters = await _db.Chapters.Where(c => c.FlowProjectId == flow.Id).OrderBy(c => c.SortOrder).ToListAsync();
        var chapterIds = chapters.Select(c => c.Id).ToList();
        var stats = await _db.ChapterViewRecords
            .Where(r => chapterIds.Contains(r.ChapterId))
            .GroupBy(r => r.ChapterId)
            .Select(g => new
            {
                chapterId = g.Key,
                totalSeconds = g.Sum(r => r.SecondsWatched),
                viewerCount = g.Select(r => r.SessionId).Distinct().Count()
            })
            .ToListAsync();

        return Ok(chapters.Select(ch =>
        {
            var stat = stats.FirstOrDefault(s => s.chapterId == ch.Id);
            return new
            {
                ch.Id,
                ch.Slug,
                ch.Name,
                ch.Description,
                ch.VideoLink,
                ch.Duration,
                ch.SortOrder,
                ch.IsLocked,
                ch.ShowDuration,
                ch.GateJson,
                totalWatchSeconds = stat?.totalSeconds ?? 0,
                viewerCount = stat?.viewerCount ?? 0
            };
        }));
    }

    [HttpPost("chapters")]
    public Task<IActionResult> CreateChapterLegacy([FromBody] ChapterDto dto) => CreateFlowChapter("default", dto);

    [HttpPost("flows/{slug}/chapters")]
    public async Task<IActionResult> CreateFlowChapter(string slug, [FromBody] ChapterDto dto)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var maxOrder = await _db.Chapters.Where(c => c.FlowProjectId == flow.Id).MaxAsync(c => (int?)c.SortOrder) ?? 0;
        var chapter = new Chapter
        {
            FlowProjectId = flow.Id,
            Slug = dto.Slug ?? $"chapter-{Guid.NewGuid():N}"[..12],
            Name = dto.Name ?? "New Chapter",
            Description = dto.Description ?? "",
            VideoLink = dto.VideoLink ?? "",
            Duration = dto.Duration ?? "",
            SortOrder = dto.SortOrder > 0 ? dto.SortOrder : maxOrder + 1,
            IsLocked = dto.IsLocked,
            ShowDuration = dto.ShowDuration,
            GateJson = dto.GateJson
        };
        _db.Chapters.Add(chapter);
        await _db.SaveChangesAsync();
        if (!string.IsNullOrWhiteSpace(chapter.VideoLink))
        {
            _db.ChapterVideos.Add(new ChapterVideo
            {
                ChapterId = chapter.Id,
                Title = chapter.Name,
                VideoLink = chapter.VideoLink,
                Duration = chapter.Duration,
                SortOrder = 1,
            });
            await _db.SaveChangesAsync();
        }
        return Ok(chapter);
    }

    [HttpGet("flows/{slug}/chapter-videos")]
    public async Task<IActionResult> GetFlowChapterVideos(string slug)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var chapterIds = await _db.Chapters.AsNoTracking()
            .Where(c => c.FlowProjectId == flow.Id)
            .Select(c => c.Id)
            .ToListAsync();

        var videos = await _db.ChapterVideos.AsNoTracking()
            .Where(v => chapterIds.Contains(v.ChapterId))
            .OrderBy(v => v.ChapterId)
            .ThenBy(v => v.SortOrder)
            .Select(v => new { v.Id, v.ChapterId, v.Title, v.VideoLink, v.Duration, v.SortOrder })
            .ToListAsync();

        return Ok(videos);
    }

    [HttpGet("flows/{slug}/chapters/{chapterId:int}/videos")]
    public async Task<IActionResult> GetChapterVideos(string slug, int chapterId)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var chapter = await _db.Chapters.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == chapterId && c.FlowProjectId == flow.Id);
        if (chapter == null) return NotFound();

        var videos = await _db.ChapterVideos.AsNoTracking()
            .Where(v => v.ChapterId == chapterId)
            .OrderBy(v => v.SortOrder)
            .ToListAsync();
        return Ok(videos);
    }

    [HttpPost("flows/{slug}/chapters/{chapterId:int}/videos")]
    public async Task<IActionResult> CreateChapterVideo(string slug, int chapterId, [FromBody] ChapterVideoDto dto)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var chapter = await _db.Chapters.FirstOrDefaultAsync(c => c.Id == chapterId && c.FlowProjectId == flow.Id);
        if (chapter == null) return NotFound();

        var maxOrder = await _db.ChapterVideos.Where(v => v.ChapterId == chapterId).MaxAsync(v => (int?)v.SortOrder) ?? 0;
        var video = new ChapterVideo
        {
            ChapterId = chapterId,
            Title = dto.Title ?? "New video",
            VideoLink = dto.VideoLink ?? "",
            Duration = dto.Duration ?? "0:00",
            SortOrder = dto.SortOrder > 0 ? dto.SortOrder : maxOrder + 1,
        };
        _db.ChapterVideos.Add(video);
        if (maxOrder == 0 && string.IsNullOrWhiteSpace(chapter.VideoLink))
        {
            chapter.VideoLink = video.VideoLink;
            chapter.Duration = video.Duration;
        }
        await _db.SaveChangesAsync();
        return Ok(video);
    }

    [HttpPut("flows/{slug}/chapters/{chapterId:int}/videos/{videoId:int}")]
    public async Task<IActionResult> UpdateChapterVideo(string slug, int chapterId, int videoId, [FromBody] ChapterVideoDto dto)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var chapter = await _db.Chapters.FirstOrDefaultAsync(c => c.Id == chapterId && c.FlowProjectId == flow.Id);
        if (chapter == null) return NotFound();

        var video = await _db.ChapterVideos.FirstOrDefaultAsync(v => v.Id == videoId && v.ChapterId == chapterId);
        if (video == null) return NotFound();

        if (dto.Title != null) video.Title = dto.Title;
        if (dto.VideoLink != null) video.VideoLink = dto.VideoLink;
        if (dto.Duration != null) video.Duration = dto.Duration;
        if (dto.SortOrder > 0) video.SortOrder = dto.SortOrder;

        if (video.SortOrder == 1)
        {
            chapter.VideoLink = video.VideoLink;
            chapter.Duration = video.Duration;
        }
        await _db.SaveChangesAsync();
        return Ok(video);
    }

    [HttpDelete("flows/{slug}/chapters/{chapterId:int}/videos/{videoId:int}")]
    public async Task<IActionResult> DeleteChapterVideo(string slug, int chapterId, int videoId)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var video = await _db.ChapterVideos.FirstOrDefaultAsync(v =>
            v.Id == videoId && v.ChapterId == chapterId &&
            _db.Chapters.Any(c => c.Id == chapterId && c.FlowProjectId == flow.Id));
        if (video == null) return NotFound();

        _db.ChapterVideos.Remove(video);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("flows/{slug}/chapters/{chapterId:int}/videos/reorder")]
    public async Task<IActionResult> ReorderChapterVideos(string slug, int chapterId, [FromBody] int[] orderedIds)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var chapter = await _db.Chapters.FirstOrDefaultAsync(c => c.Id == chapterId && c.FlowProjectId == flow.Id);
        if (chapter == null) return NotFound();

        var videos = await _db.ChapterVideos.Where(v => v.ChapterId == chapterId).ToListAsync();
        for (var i = 0; i < orderedIds.Length; i++)
        {
            var v = videos.FirstOrDefault(x => x.Id == orderedIds[i]);
            if (v != null) v.SortOrder = i + 1;
        }
        var first = videos.OrderBy(v => v.SortOrder).FirstOrDefault();
        if (first != null)
        {
            chapter.VideoLink = first.VideoLink;
            chapter.Duration = first.Duration;
        }
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPut("chapters/{id:int}")]
    public Task<IActionResult> UpdateChapterLegacy(int id, [FromBody] ChapterDto dto) => UpdateFlowChapter("default", id, dto);

    [HttpPut("flows/{slug}/chapters/{id:int}")]
    public async Task<IActionResult> UpdateFlowChapter(string slug, int id, [FromBody] ChapterDto dto)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var chapter = await _db.Chapters.FirstOrDefaultAsync(c => c.Id == id && c.FlowProjectId == flow.Id);
        if (chapter == null) return NotFound();

        if (dto.Name != null) chapter.Name = dto.Name;
        if (dto.Slug != null) chapter.Slug = dto.Slug;
        if (dto.Description != null) chapter.Description = dto.Description;
        if (dto.VideoLink != null) chapter.VideoLink = dto.VideoLink;
        if (dto.Duration != null) chapter.Duration = dto.Duration;
        if (dto.SortOrder > 0) chapter.SortOrder = dto.SortOrder;
        chapter.IsLocked = dto.IsLocked;
        chapter.ShowDuration = dto.ShowDuration;
        chapter.GateJson = dto.GateJson;

        await _db.SaveChangesAsync();
        return Ok(chapter);
    }

    [HttpDelete("chapters/{id:int}")]
    public Task<IActionResult> DeleteChapterLegacy(int id) => DeleteFlowChapter("default", id);

    [HttpDelete("flows/{slug}/chapters/{id:int}")]
    public async Task<IActionResult> DeleteFlowChapter(string slug, int id)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var chapter = await _db.Chapters.FirstOrDefaultAsync(c => c.Id == id && c.FlowProjectId == flow.Id);
        if (chapter == null) return NotFound();
        _db.Chapters.Remove(chapter);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("chapters/reorder")]
    public Task<IActionResult> ReorderChaptersLegacy([FromBody] int[] orderedIds) => ReorderFlowChapters("default", orderedIds);

    [HttpPost("flows/{slug}/chapters/reorder")]
    public async Task<IActionResult> ReorderFlowChapters(string slug, [FromBody] int[] orderedIds)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var chapters = await _db.Chapters.Where(c => c.FlowProjectId == flow.Id).ToListAsync();
        for (var i = 0; i < orderedIds.Length; i++)
        {
            var ch = chapters.FirstOrDefault(c => c.Id == orderedIds[i]);
            if (ch != null) ch.SortOrder = i + 1;
        }
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("seed-messages")]
    public Task<IActionResult> GetSeedMessagesLegacy() => GetFlowSeedMessages("default");

    [HttpGet("flows/{slug}/seed-messages")]
    public async Task<IActionResult> GetFlowSeedMessages(string slug)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var messages = await _db.SeedChatMessages.Where(m => m.FlowProjectId == flow.Id).OrderBy(m => m.SortOrder).ToListAsync();
        return Ok(messages);
    }

    [HttpPost("seed-messages")]
    public Task<IActionResult> CreateSeedMessageLegacy([FromBody] SeedMessageDto dto) => CreateFlowSeedMessage("default", dto);

    [HttpPost("flows/{slug}/seed-messages")]
    public async Task<IActionResult> CreateFlowSeedMessage(string slug, [FromBody] SeedMessageDto dto)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var maxOrder = await _db.SeedChatMessages.Where(m => m.FlowProjectId == flow.Id).MaxAsync(m => (int?)m.SortOrder) ?? 0;
        var msg = new SeedChatMessage
        {
            FlowProjectId = flow.Id,
            Role = dto.Role ?? "assistant",
            Text = dto.Text ?? "",
            SortOrder = dto.SortOrder > 0 ? dto.SortOrder : maxOrder + 1
        };
        _db.SeedChatMessages.Add(msg);
        await _db.SaveChangesAsync();
        return Ok(msg);
    }

    [HttpPut("seed-messages/{id:int}")]
    public Task<IActionResult> UpdateSeedMessageLegacy(int id, [FromBody] SeedMessageDto dto) => UpdateFlowSeedMessage("default", id, dto);

    [HttpPut("flows/{slug}/seed-messages/{id:int}")]
    public async Task<IActionResult> UpdateFlowSeedMessage(string slug, int id, [FromBody] SeedMessageDto dto)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var msg = await _db.SeedChatMessages.FirstOrDefaultAsync(m => m.Id == id && m.FlowProjectId == flow.Id);
        if (msg == null) return NotFound();
        if (dto.Role != null) msg.Role = dto.Role;
        if (dto.Text != null) msg.Text = dto.Text;
        if (dto.SortOrder > 0) msg.SortOrder = dto.SortOrder;
        await _db.SaveChangesAsync();
        return Ok(msg);
    }

    [HttpDelete("seed-messages/{id:int}")]
    public Task<IActionResult> DeleteSeedMessageLegacy(int id) => DeleteFlowSeedMessage("default", id);

    [HttpDelete("flows/{slug}/seed-messages/{id:int}")]
    public async Task<IActionResult> DeleteFlowSeedMessage(string slug, int id)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var msg = await _db.SeedChatMessages.FirstOrDefaultAsync(m => m.Id == id && m.FlowProjectId == flow.Id);
        if (msg == null) return NotFound();
        _db.SeedChatMessages.Remove(msg);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("chat/sessions")]
    public Task<IActionResult> GetChatSessionsLegacy() => GetFlowChatSessions("default");

    [HttpGet("flows/{slug}/chat/sessions")]
    public async Task<IActionResult> GetFlowChatSessions(string slug)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var sessions = await _db.ChatMessages
            .Where(m => m.FlowSlug == slug)
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

    [HttpGet("chat/{sessionId}")]
    public async Task<IActionResult> GetSessionMessages(string sessionId)
    {
        var messages = await _db.ChatMessages
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new { m.Id, m.SessionId, m.Role, m.Text, m.Source, m.CreatedAt })
            .ToListAsync();
        return Ok(messages);
    }

    [HttpPost("chat/reply")]
    public async Task<IActionResult> AdminReply([FromBody] AdminReplyDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.SessionId) || string.IsNullOrWhiteSpace(dto.Text))
            return BadRequest();

        var payload = await _chat.SendAdminReplyAsync(dto.SessionId, dto.Text);
        if (payload == null) return BadRequest();
        return Ok(payload);
    }

    [HttpGet("integrations/status")]
    public IActionResult GetIntegrationsStatus() => Ok(new
    {
        slackBotTokenConfigured = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("SLACK_BOT_TOKEN")),
        slackSigningSecretConfigured = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("SLACK_SIGNING_SECRET")),
        teamsAppIdConfigured = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("MICROSOFT_APP_ID")),
        teamsAppPasswordConfigured = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("MICROSOFT_APP_PASSWORD")),
    });

    [HttpGet("flow")]
    public Task<IActionResult> GetFlowLegacy() => GetFlowBySlug("default");

    [HttpPut("flow")]
    public Task<IActionResult> UpdateFlowLegacy([FromBody] FlowUpdateDto dto) => UpdateFlowBySlug("default", dto);

    [HttpGet("flows")]
    public async Task<IActionResult> GetFlows()
    {
        var flows = await _db.FlowProjects.AsNoTracking()
            .OrderBy(f => f.ProjectName)
            .Select(f => new
            {
                f.Id,
                f.Slug,
                projectName = f.ProjectName,
                f.IsEnabled,
                f.CreatedAt,
                f.UpdatedAt,
                publicUrl = $"/flow/{f.Slug}",
            })
            .ToListAsync();
        return Ok(flows);
    }

    [HttpPost("flows")]
    public async Task<IActionResult> CreateFlow([FromBody] FlowCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Slug) || string.IsNullOrWhiteSpace(dto.ProjectName))
            return BadRequest(new { error = "Slug and project name required" });

        var slug = Slugify(dto.Slug);
        if (await _db.FlowProjects.AnyAsync(f => f.Slug == slug))
            return BadRequest(new { error = "Slug already in use" });

        var emptyGraph = dto.ProjectData != null
            ? JsonSerializer.Serialize(dto.ProjectData, FlowJsonOptions)
            : """{"projectName":"Demo Flow","nodes":[],"connections":[]}""";

        var flow = new FlowProject
        {
            Slug = slug,
            ProjectName = dto.ProjectName.Trim(),
            ProjectDataJson = emptyGraph,
            IsEnabled = dto.IsEnabled,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.FlowProjects.Add(flow);
        await _db.SaveChangesAsync();
        return Ok(MapFlowDetail(flow));
    }

    [HttpGet("flows/{slug}")]
    public async Task<IActionResult> GetFlowBySlug(string slug)
    {
        var flow = await _db.FlowProjects.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Slug == slug);
        if (flow == null) return NotFound();
        return Ok(MapFlowDetail(flow));
    }

    [HttpPut("flows/{slug}")]
    public async Task<IActionResult> UpdateFlowBySlug(string slug, [FromBody] FlowUpdateDto dto)
    {
        var flow = await _db.FlowProjects.FirstOrDefaultAsync(f => f.Slug == slug);
        if (flow == null) return NotFound();

        if (dto.ProjectName != null) flow.ProjectName = dto.ProjectName;
        if (dto.ProjectData != null)
            flow.ProjectDataJson = JsonSerializer.Serialize(dto.ProjectData, FlowJsonOptions);
        flow.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(MapFlowDetail(flow));
    }

    [HttpPatch("flows/{slug}/enabled")]
    public async Task<IActionResult> SetFlowEnabled(string slug, [FromBody] FlowEnabledDto dto)
    {
        var flow = await _db.FlowProjects.FirstOrDefaultAsync(f => f.Slug == slug);
        if (flow == null) return NotFound();
        flow.IsEnabled = dto.IsEnabled;
        flow.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { flow.Slug, flow.IsEnabled, publicUrl = $"/flow/{flow.Slug}" });
    }

    [HttpDelete("flows/{slug}")]
    public async Task<IActionResult> DeleteFlow(string slug)
    {
        if (slug == "default")
            return BadRequest(new { error = "The default flow cannot be deleted" });

        var flow = await _db.FlowProjects.FirstOrDefaultAsync(f => f.Slug == slug);
        if (flow == null) return NotFound();

        var inUse = await _db.ScheduledEvents.AnyAsync(e => e.FlowSlug == slug && e.IsEnabled);
        if (inUse)
            return BadRequest(new { error = "Flow is referenced by an enabled scheduled event" });

        var chapters = await _db.Chapters.Where(c => c.FlowProjectId == flow.Id).ToListAsync();
        var chapterIds = chapters.Select(c => c.Id).ToList();
        _db.Chapters.RemoveRange(chapters);
        _db.VideoToasters.RemoveRange(await _db.VideoToasters.Where(t => t.FlowProjectId == flow.Id).ToListAsync());
        _db.VideoPausePoints.RemoveRange(await _db.VideoPausePoints.Where(p => p.FlowProjectId == flow.Id).ToListAsync());
        _db.SeedChatMessages.RemoveRange(await _db.SeedChatMessages.Where(m => m.FlowProjectId == flow.Id).ToListAsync());
        if (chapterIds.Count > 0)
        {
            _db.ChapterViewRecords.RemoveRange(await _db.ChapterViewRecords.Where(r => chapterIds.Contains(r.ChapterId)).ToListAsync());
        }

        _db.FlowProjects.Remove(flow);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("flows/{slug}/duplicate")]
    public async Task<IActionResult> DuplicateFlow(string slug, [FromBody] FlowDuplicateDto dto)
    {
        var source = await _db.FlowProjects.FirstOrDefaultAsync(f => f.Slug == slug);
        if (source == null) return NotFound();

        if (string.IsNullOrWhiteSpace(dto.NewSlug) || string.IsNullOrWhiteSpace(dto.NewProjectName))
            return BadRequest(new { error = "New slug and project name required" });

        var newSlug = Slugify(dto.NewSlug);
        if (await _db.FlowProjects.AnyAsync(f => f.Slug == newSlug))
            return BadRequest(new { error = "Slug already in use" });

        var copy = new FlowProject
        {
            Slug = newSlug,
            ProjectName = dto.NewProjectName.Trim(),
            ProjectDataJson = source.ProjectDataJson,
            IsEnabled = dto.IsEnabled,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.FlowProjects.Add(copy);
        await _db.SaveChangesAsync();

        var chapterIdMap = new Dictionary<int, int>();
        foreach (var ch in await _db.Chapters.Where(c => c.FlowProjectId == source.Id).ToListAsync())
        {
            var newCh = new Chapter
            {
                FlowProjectId = copy.Id,
                Slug = ch.Slug,
                Name = ch.Name,
                Description = ch.Description,
                VideoLink = ch.VideoLink,
                Duration = ch.Duration,
                SortOrder = ch.SortOrder,
                IsLocked = ch.IsLocked,
                ShowDuration = ch.ShowDuration,
                GateJson = ch.GateJson,
            };
            _db.Chapters.Add(newCh);
            await _db.SaveChangesAsync();
            chapterIdMap[ch.Id] = newCh.Id;
        }

        foreach (var t in await _db.VideoToasters.Where(x => x.FlowProjectId == source.Id).ToListAsync())
        {
            _db.VideoToasters.Add(new VideoToaster
            {
                FlowProjectId = copy.Id,
                ChapterId = t.ChapterId.HasValue && chapterIdMap.TryGetValue(t.ChapterId.Value, out var mappedCh) ? mappedCh : t.ChapterId,
                TriggerAtSeconds = t.TriggerAtSeconds,
                DurationSeconds = t.DurationSeconds,
                Title = t.Title,
                Message = t.Message,
                ToasterType = t.ToasterType,
                ImageUrl = t.ImageUrl,
                LinkUrl = t.LinkUrl,
                LinkNewWindow = t.LinkNewWindow,
                ThumbnailUrl = t.ThumbnailUrl,
                DownloadUrl = t.DownloadUrl,
                DownloadFileName = t.DownloadFileName,
                BannerPosition = t.BannerPosition,
                IsEnabled = t.IsEnabled,
                SortOrder = t.SortOrder,
            });
        }

        foreach (var p in await _db.VideoPausePoints.Where(x => x.FlowProjectId == source.Id).ToListAsync())
        {
            _db.VideoPausePoints.Add(new VideoPausePoint
            {
                FlowProjectId = copy.Id,
                ChapterId = p.ChapterId.HasValue && chapterIdMap.TryGetValue(p.ChapterId.Value, out var mappedCh) ? mappedCh : p.ChapterId,
                TriggerAtSeconds = p.TriggerAtSeconds,
                Prompt = p.Prompt,
                FieldId = p.FieldId,
                InputType = p.InputType,
                OptionsJson = p.OptionsJson,
                Required = p.Required,
                Placeholder = p.Placeholder,
                IsEnabled = p.IsEnabled,
                SortOrder = p.SortOrder,
            });
        }

        foreach (var m in await _db.SeedChatMessages.Where(x => x.FlowProjectId == source.Id).ToListAsync())
        {
            _db.SeedChatMessages.Add(new SeedChatMessage
            {
                FlowProjectId = copy.Id,
                Role = m.Role,
                Text = m.Text,
                SortOrder = m.SortOrder,
            });
        }

        copy.ProjectDataJson = RemapChapterIdsInFlowJson(source.ProjectDataJson, chapterIdMap);
        copy.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(MapFlowDetail(copy));
    }

    private static string RemapChapterIdsInFlowJson(string projectDataJson, Dictionary<int, int> chapterIdMap)
    {
        if (chapterIdMap.Count == 0) return projectDataJson;
        try
        {
            using var doc = JsonDocument.Parse(projectDataJson);
            if (!doc.RootElement.TryGetProperty("nodes", out var nodes) || nodes.ValueKind != JsonValueKind.Array)
                return projectDataJson;

            var nodeList = new List<object>();
            foreach (var node in nodes.EnumerateArray())
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(node.GetRawText()) ?? new();
                if (dict.TryGetValue("type", out var typeEl) && typeEl.GetString() == "chapter"
                    && dict.TryGetValue("parameters", out var paramsEl))
                {
                    var parameters = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(paramsEl.GetRawText()) ?? new();
                    if (parameters.TryGetValue("chapterId", out var chIdEl))
                    {
                        var oldId = chIdEl.ValueKind == JsonValueKind.Number ? chIdEl.GetInt32() : int.Parse(chIdEl.GetString() ?? "0");
                        if (chapterIdMap.TryGetValue(oldId, out var newId))
                        {
                            parameters["chapterId"] = JsonSerializer.SerializeToElement(newId);
                            dict["parameters"] = JsonSerializer.SerializeToElement(parameters);
                        }
                    }
                }
                nodeList.Add(dict);
            }

            var root = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(projectDataJson) ?? new();
            root["nodes"] = JsonSerializer.SerializeToElement(nodeList);
            return JsonSerializer.Serialize(root);
        }
        catch
        {
            return projectDataJson;
        }
    }

    private static object MapFlowDetail(FlowProject flow) => new
    {
        flow.Id,
        flow.Slug,
        projectName = flow.ProjectName,
        flow.IsEnabled,
        flow.CreatedAt,
        flow.UpdatedAt,
        publicUrl = $"/flow/{flow.Slug}",
        projectData = JsonSerializer.Deserialize<object>(flow.ProjectDataJson),
    };


    [HttpGet("analytics/chapters")]
    public Task<IActionResult> GetChapterAnalyticsLegacy() => GetFlowChapterAnalytics("default");

    [HttpGet("flows/{slug}/analytics/chapters")]
    public async Task<IActionResult> GetFlowChapterAnalytics(string slug)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var chapters = await _db.Chapters.AsNoTracking().Where(c => c.FlowProjectId == flow.Id).OrderBy(c => c.SortOrder).ToListAsync();
        var chapterIds = chapters.Select(c => c.Id).ToList();
        var stats = await _db.ChapterViewRecords
            .Where(r => chapterIds.Contains(r.ChapterId))
            .GroupBy(r => r.ChapterId)
            .Select(g => new
            {
                chapterId = g.Key,
                totalSeconds = g.Sum(r => r.SecondsWatched),
                viewerCount = g.Select(r => r.SessionId).Distinct().Count()
            })
            .ToListAsync();

        return Ok(chapters.Select(ch =>
        {
            var stat = stats.FirstOrDefault(s => s.chapterId == ch.Id);
            return new
            {
                ch.Id,
                ch.Name,
                totalWatchSeconds = stat?.totalSeconds ?? 0,
                viewerCount = stat?.viewerCount ?? 0,
                avgWatchSeconds = stat?.viewerCount > 0 ? stat.totalSeconds / stat.viewerCount : 0
            };
        }));
    }

    [HttpGet("analytics/engagement")]
    public Task<IActionResult> GetEngagementLogLegacy([FromQuery] int limit = 100) => GetFlowEngagementLog("default", limit);

    [HttpGet("flows/{slug}/analytics/engagement")]
    public async Task<IActionResult> GetFlowEngagementLog(string slug, [FromQuery] int limit = 100)
    {
        limit = Math.Clamp(limit, 1, 500);

        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var flowChapterIds = await _db.Chapters.AsNoTracking()
            .Where(c => c.FlowProjectId == flow.Id)
            .Select(c => c.Id)
            .ToListAsync();

        var watchBySession = await _db.ChapterViewRecords
            .Where(r => flowChapterIds.Contains(r.ChapterId))
            .GroupBy(r => r.SessionId)
            .Select(g => new { sessionId = g.Key, totalWatchSeconds = g.Sum(r => r.SecondsWatched) })
            .ToListAsync();

        var chatBySession = await _db.ChatMessages
            .Where(m => m.Role == "user" && m.FlowSlug == slug)
            .GroupBy(m => m.SessionId)
            .Select(g => new { sessionId = g.Key, chatCount = g.Count() })
            .ToListAsync();

        var events = await _db.EngagementEvents.AsNoTracking()
            .Where(e => e.FlowSlug == slug)
            .OrderByDescending(e => e.CreatedAt)
            .Take(limit * 20)
            .ToListAsync();

        var sessionIds = events.Select(e => e.SessionId)
            .Concat(watchBySession.Select(w => w.sessionId))
            .Concat(chatBySession.Select(c => c.sessionId))
            .Distinct()
            .OrderByDescending(id => events.Where(e => e.SessionId == id).Select(e => e.CreatedAt).DefaultIfEmpty(DateTime.MinValue).Max())
            .Take(limit)
            .ToList();

        var result = sessionIds.Select(sid =>
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

    [HttpGet("flows/{slug}/leads")]
    public async Task<IActionResult> GetFlowLeads(string slug, [FromQuery] int limit = 200)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        limit = Math.Clamp(limit, 1, 1000);
        var leads = await _db.LeadSubmissions.AsNoTracking()
            .Where(l => l.FlowSlug == slug)
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

    [HttpGet("flows/{slug}/leads/export")]
    public async Task<IActionResult> ExportFlowLeadsCsv(string slug)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var leads = await _db.LeadSubmissions.AsNoTracking()
            .Where(l => l.FlowSlug == slug)
            .OrderByDescending(l => l.CreatedAt)
            .Take(5000)
            .ToListAsync();

        var sb = new System.Text.StringBuilder();
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
                .Append(EscapeCsv(lead.AnswersJson))
                .AppendLine();
        }

        var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"{slug}-leads.csv");
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains('"') || value.Contains(',') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    [HttpGet("toasters")]
    public Task<IActionResult> GetToastersLegacy() => GetFlowToasters("default");

    [HttpGet("flows/{slug}/toasters")]
    public async Task<IActionResult> GetFlowToasters(string slug)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var toasters = await _db.VideoToasters.Where(t => t.FlowProjectId == flow.Id).OrderBy(t => t.SortOrder).ToListAsync();
        return Ok(toasters);
    }

    [HttpPost("toasters")]
    public Task<IActionResult> CreateToasterLegacy([FromBody] ToasterDto dto) => CreateFlowToaster("default", dto);

    [HttpPost("flows/{slug}/toasters")]
    public async Task<IActionResult> CreateFlowToaster(string slug, [FromBody] ToasterDto dto)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var maxOrder = await _db.VideoToasters.Where(t => t.FlowProjectId == flow.Id).MaxAsync(t => (int?)t.SortOrder) ?? 0;
        var toaster = new VideoToaster
        {
            FlowProjectId = flow.Id,
            ChapterId = dto.ChapterId,
            TriggerAtSeconds = dto.TriggerAtSeconds,
            DurationSeconds = dto.DurationSeconds > 0 ? dto.DurationSeconds : 5,
            Title = dto.Title ?? "",
            Message = dto.Message ?? "",
            ToasterType = string.IsNullOrWhiteSpace(dto.ToasterType) ? "popup" : dto.ToasterType,
            ImageUrl = dto.ImageUrl,
            LinkUrl = dto.LinkUrl,
            LinkNewWindow = dto.LinkNewWindow,
            ThumbnailUrl = dto.ThumbnailUrl,
            DownloadUrl = dto.DownloadUrl,
            DownloadFileName = dto.DownloadFileName,
            BannerPosition = string.IsNullOrWhiteSpace(dto.BannerPosition) ? "top" : dto.BannerPosition,
            IsEnabled = dto.IsEnabled,
            SortOrder = dto.SortOrder > 0 ? dto.SortOrder : maxOrder + 1
        };
        _db.VideoToasters.Add(toaster);
        await _db.SaveChangesAsync();
        return Ok(toaster);
    }

    [HttpPut("toasters/{id:int}")]
    public Task<IActionResult> UpdateToasterLegacy(int id, [FromBody] ToasterDto dto) => UpdateFlowToaster("default", id, dto);

    [HttpPut("flows/{slug}/toasters/{id:int}")]
    public async Task<IActionResult> UpdateFlowToaster(string slug, int id, [FromBody] ToasterDto dto)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var toaster = await _db.VideoToasters.FirstOrDefaultAsync(t => t.Id == id && t.FlowProjectId == flow.Id);
        if (toaster == null) return NotFound();
        toaster.ChapterId = dto.ChapterId;
        toaster.TriggerAtSeconds = dto.TriggerAtSeconds;
        if (dto.DurationSeconds > 0) toaster.DurationSeconds = dto.DurationSeconds;
        if (dto.Title != null) toaster.Title = dto.Title;
        if (dto.Message != null) toaster.Message = dto.Message;
        if (dto.ToasterType != null) toaster.ToasterType = dto.ToasterType;
        toaster.ImageUrl = dto.ImageUrl;
        toaster.LinkUrl = dto.LinkUrl;
        toaster.LinkNewWindow = dto.LinkNewWindow;
        toaster.ThumbnailUrl = dto.ThumbnailUrl;
        toaster.DownloadUrl = dto.DownloadUrl;
        toaster.DownloadFileName = dto.DownloadFileName;
        if (dto.BannerPosition != null) toaster.BannerPosition = dto.BannerPosition;
        toaster.IsEnabled = dto.IsEnabled;
        if (dto.SortOrder > 0) toaster.SortOrder = dto.SortOrder;
        await _db.SaveChangesAsync();
        return Ok(toaster);
    }

    [HttpDelete("toasters/{id:int}")]
    public Task<IActionResult> DeleteToasterLegacy(int id) => DeleteFlowToaster("default", id);

    [HttpDelete("flows/{slug}/toasters/{id:int}")]
    public async Task<IActionResult> DeleteFlowToaster(string slug, int id)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var toaster = await _db.VideoToasters.FirstOrDefaultAsync(t => t.Id == id && t.FlowProjectId == flow.Id);
        if (toaster == null) return NotFound();
        _db.VideoToasters.Remove(toaster);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("pause-points")]
    public Task<IActionResult> GetPausePointsLegacy() => GetFlowPausePoints("default");

    [HttpGet("flows/{slug}/pause-points")]
    public async Task<IActionResult> GetFlowPausePoints(string slug)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var points = await _db.VideoPausePoints.Where(p => p.FlowProjectId == flow.Id).OrderBy(p => p.SortOrder).ToListAsync();
        return Ok(points);
    }

    [HttpPost("pause-points")]
    public Task<IActionResult> CreatePausePointLegacy([FromBody] PausePointDto dto) => CreateFlowPausePoint("default", dto);

    [HttpPost("flows/{slug}/pause-points")]
    public async Task<IActionResult> CreateFlowPausePoint(string slug, [FromBody] PausePointDto dto)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var maxOrder = await _db.VideoPausePoints.Where(p => p.FlowProjectId == flow.Id).MaxAsync(p => (int?)p.SortOrder) ?? 0;
        var point = new VideoPausePoint
        {
            FlowProjectId = flow.Id,
            ChapterId = dto.ChapterId,
            TriggerAtSeconds = dto.TriggerAtSeconds,
            Prompt = dto.Prompt ?? "Please answer",
            FieldId = string.IsNullOrWhiteSpace(dto.FieldId) ? "answer" : dto.FieldId,
            InputType = string.IsNullOrWhiteSpace(dto.InputType) ? "text" : dto.InputType,
            OptionsJson = dto.OptionsJson,
            Required = dto.Required,
            Placeholder = dto.Placeholder,
            IsEnabled = dto.IsEnabled,
            SortOrder = dto.SortOrder > 0 ? dto.SortOrder : maxOrder + 1
        };
        _db.VideoPausePoints.Add(point);
        await _db.SaveChangesAsync();
        return Ok(point);
    }

    [HttpPut("pause-points/{id:int}")]
    public Task<IActionResult> UpdatePausePointLegacy(int id, [FromBody] PausePointDto dto) => UpdateFlowPausePoint("default", id, dto);

    [HttpPut("flows/{slug}/pause-points/{id:int}")]
    public async Task<IActionResult> UpdateFlowPausePoint(string slug, int id, [FromBody] PausePointDto dto)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var point = await _db.VideoPausePoints.FirstOrDefaultAsync(p => p.Id == id && p.FlowProjectId == flow.Id);
        if (point == null) return NotFound();
        point.ChapterId = dto.ChapterId;
        point.TriggerAtSeconds = dto.TriggerAtSeconds;
        if (dto.Prompt != null) point.Prompt = dto.Prompt;
        if (dto.FieldId != null) point.FieldId = dto.FieldId;
        if (dto.InputType != null) point.InputType = dto.InputType;
        point.OptionsJson = dto.OptionsJson;
        point.Required = dto.Required;
        point.Placeholder = dto.Placeholder;
        point.IsEnabled = dto.IsEnabled;
        if (dto.SortOrder > 0) point.SortOrder = dto.SortOrder;
        await _db.SaveChangesAsync();
        return Ok(point);
    }

    [HttpDelete("pause-points/{id:int}")]
    public Task<IActionResult> DeletePausePointLegacy(int id) => DeleteFlowPausePoint("default", id);

    [HttpDelete("flows/{slug}/pause-points/{id:int}")]
    public async Task<IActionResult> DeleteFlowPausePoint(string slug, int id)
    {
        var flow = await ResolveFlowAsync(slug);
        if (flow == null) return NotFound();

        var point = await _db.VideoPausePoints.FirstOrDefaultAsync(p => p.Id == id && p.FlowProjectId == flow.Id);
        if (point == null) return NotFound();
        _db.VideoPausePoints.Remove(point);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("upload")]
    [RequestSizeLimit(100_000_000)]
    public async Task<IActionResult> UploadMedia(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".mov" };
        if (!allowed.Contains(ext))
            return BadRequest(new { error = "File type not allowed" });

        var uploadsDir = Path.Combine(_env.WebRootPath, "uploads");
        Directory.CreateDirectory(uploadsDir);
        var fileName = $"{Guid.NewGuid():N}{ext}";
        var path = Path.Combine(uploadsDir, fileName);
        await using (var stream = System.IO.File.Create(path))
            await file.CopyToAsync(stream);

        return Ok(new { url = $"/uploads/{fileName}", fileName });
    }

    private static string Slugify(string raw) =>
        new string(raw.Trim().ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-')
            .ToArray()).Trim('-');

    public record DemoConfigUpdate(
        bool Autoplay, bool ShowDuration, bool ChatEnabled, bool AiEnabled,
        bool NotificationsEnabled, bool LiveChatEnabled, bool SeedChatEnabled,
        bool ChapterPickEnabled, bool PauseEnabled,
        string? AiSystemPrompt,
        string? ThemePrimaryColor, string? ThemeAccentColor, string? ThemeBackgroundColor,
        string? ThemeSurfaceColor, string? ThemeTextColor, string? ThemeFontFamily,
        string? ThemeBrandName, string? ThemeChatTitle, string? ThemeLogoUrl,
        bool SlackEnabled, string? SlackChannelId, bool TeamsEnabled, string? TeamsServiceUrl,
        string? LeadWebhookUrl, string? LeadNotifyEmail, string? DemoChatSubtitle,
        string? AttendeeWebhookUrl, string? BlockedEmailDomainsJson);

    public record ChapterDto(string? Slug, string? Name, string? Description, string? VideoLink, string? Duration, int SortOrder, bool IsLocked, bool? ShowDuration, string? GateJson);
    public record ChapterVideoDto(string? Title, string? VideoLink, string? Duration, int SortOrder = 0);
    public record SeedMessageDto(string? Role, string? Text, int SortOrder);
    public record AdminReplyDto(string SessionId, string Text);
    public record FlowUpdateDto(string? ProjectName, object? ProjectData);
    public record FlowCreateDto(string Slug, string ProjectName, object? ProjectData, bool IsEnabled = true);
    public record FlowEnabledDto(bool IsEnabled);
    public record FlowDuplicateDto(string NewSlug, string NewProjectName, bool IsEnabled = false);
    public record ToasterDto(
        int? ChapterId, int TriggerAtSeconds, int DurationSeconds, string? Title, string? Message,
        string? ToasterType, string? ImageUrl, string? LinkUrl, bool LinkNewWindow, string? ThumbnailUrl,
        string? DownloadUrl, string? DownloadFileName, string? BannerPosition,
        bool IsEnabled, int SortOrder);
    public record PausePointDto(
        int? ChapterId, int TriggerAtSeconds, string? Prompt, string? FieldId, string? InputType,
        string? OptionsJson, bool Required, string? Placeholder, bool IsEnabled, int SortOrder);
}
