using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoTool.Data;
using VideoTool.Web.Services;

namespace VideoTool.Web.Controllers;

[ApiController]
[Route("api/integrations/slack")]
public class SlackWebhookController : ControllerBase
{
    private readonly SlackIntegrationService _slack;
    private readonly ChatMessageService _chat;
    private readonly VideoToolDbContext _db;
    private readonly ILogger<SlackWebhookController> _logger;

    public SlackWebhookController(
        SlackIntegrationService slack,
        ChatMessageService chat,
        VideoToolDbContext db,
        ILogger<SlackWebhookController> logger)
    {
        _slack = slack;
        _chat = chat;
        _db = db;
        _logger = logger;
    }

    [HttpPost("events")]
    public async Task<IActionResult> Events()
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var body = await reader.ReadToEndAsync();

        var signature = Request.Headers["X-Slack-Signature"].ToString();
        var timestamp = Request.Headers["X-Slack-Request-Timestamp"].ToString();

        if (!_slack.VerifySignature(signature, timestamp, body))
            return Unauthorized();

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        if (root.TryGetProperty("type", out var typeEl) && typeEl.GetString() == "url_verification")
        {
            var challenge = root.GetProperty("challenge").GetString();
            return Content(challenge ?? "", "text/plain");
        }

        if (root.TryGetProperty("event", out var evt))
        {
            var eventType = evt.TryGetProperty("type", out var et) ? et.GetString() : null;
            if (eventType == "message" && !evt.TryGetProperty("bot_id", out _))
            {
                var channel = evt.GetProperty("channel").GetString();
                var threadTs = evt.TryGetProperty("thread_ts", out var tt) ? tt.GetString() : null;
                var ts = evt.GetProperty("ts").GetString();
                var text = evt.TryGetProperty("text", out var tx) ? tx.GetString() : null;

                if (channel != null && threadTs != null && !string.IsNullOrWhiteSpace(text) && ts != null)
                {
                    var mapping = await _db.ChatSessionMappings.AsNoTracking()
                        .FirstOrDefaultAsync(m => m.SlackChannelId == channel && m.SlackThreadTs == threadTs);

                    if (mapping != null)
                    {
                        await _chat.IngestExternalReplyAsync(
                            mapping.SessionId,
                            text,
                            source: "slack",
                            externalId: $"slack-{ts}");
                    }
                }
            }
        }

        return Ok();
    }
}
