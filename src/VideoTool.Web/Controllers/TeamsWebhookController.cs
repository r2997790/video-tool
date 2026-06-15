using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoTool.Data;
using VideoTool.Web.Services;

namespace VideoTool.Web.Controllers;

[ApiController]
[Route("api/integrations/teams")]
public class TeamsWebhookController : ControllerBase
{
    private readonly ChatMessageService _chat;
    private readonly VideoToolDbContext _db;
    private readonly ILogger<TeamsWebhookController> _logger;

    public TeamsWebhookController(
        ChatMessageService chat,
        VideoToolDbContext db,
        ILogger<TeamsWebhookController> logger)
    {
        _chat = chat;
        _db = db;
        _logger = logger;
    }

    [HttpPost("messages")]
    public async Task<IActionResult> Messages([FromBody] JsonElement activity)
    {
        var type = activity.TryGetProperty("type", out var typeEl) ? typeEl.GetString() : null;
        if (type != "message") return Ok();

        if (activity.TryGetProperty("from", out var from) &&
            from.TryGetProperty("role", out var roleEl) &&
            roleEl.GetString() == "bot")
            return Ok();

        var text = activity.TryGetProperty("text", out var textEl) ? textEl.GetString() : null;
        if (string.IsNullOrWhiteSpace(text)) return Ok();

        var conversationId = activity.GetProperty("conversation").GetProperty("id").GetString();
        var serviceUrl = activity.GetProperty("serviceUrl").GetString();
        var activityId = activity.TryGetProperty("id", out var idEl) ? idEl.GetString() : Guid.NewGuid().ToString("N");

        if (conversationId == null || serviceUrl == null) return Ok();

        var mapping = await _db.ChatSessionMappings
            .FirstOrDefaultAsync(m => m.TeamsConversationId == conversationId);

        string sessionId;
        if (mapping != null)
        {
            sessionId = mapping.SessionId;
        }
        else
        {
            sessionId = Guid.NewGuid().ToString("N");
            await _chat.StoreTeamsConversationAsync(sessionId, conversationId, serviceUrl);
            _logger.LogInformation("Created Teams session mapping {SessionId} for conversation {ConversationId}",
                sessionId, conversationId);
        }

        await _chat.IngestExternalReplyAsync(
            sessionId,
            text,
            source: "teams",
            externalId: $"teams-{activityId}");

        return Ok();
    }
}
