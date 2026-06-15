using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using VideoTool.Data;
using VideoTool.Domain.Entities;
using VideoTool.Web.Hubs;

namespace VideoTool.Web.Services;

public class ChatMessageService
{
    private readonly VideoToolDbContext _db;
    private readonly IHubContext<ChatHub> _hub;
    private readonly AiChatService _ai;
    private readonly SlackIntegrationService _slack;
    private readonly TeamsIntegrationService _teams;
    private readonly ILogger<ChatMessageService> _logger;

    public ChatMessageService(
        VideoToolDbContext db,
        IHubContext<ChatHub> hub,
        AiChatService ai,
        SlackIntegrationService slack,
        TeamsIntegrationService teams,
        ILogger<ChatMessageService> logger)
    {
        _db = db;
        _hub = hub;
        _ai = ai;
        _slack = slack;
        _teams = teams;
        _logger = logger;
    }

    public async Task<object?> SendUserMessageAsync(string sessionId, string text, string? chapterContext, string source = "demo", string? flowSlug = null)
    {
        if (string.IsNullOrWhiteSpace(text) || string.IsNullOrWhiteSpace(sessionId)) return null;

        var config = await _db.DemoConfigs.AsNoTracking().FirstAsync();
        if (!config.ChatEnabled) return null;

        var userMsg = new ChatMessage
        {
            SessionId = sessionId,
            FlowSlug = flowSlug,
            Role = "user",
            Text = text.Trim(),
            Source = source
        };
        _db.ChatMessages.Add(userMsg);
        await _db.SaveChangesAsync();

        var payload = BuildPayload(userMsg, sessionId);
        await BroadcastAsync(sessionId, payload);

        await EnsureExternalThreadsAsync(sessionId, config, userMsg.Text);
        await FanOutToIntegrationsAsync(sessionId, config, userMsg.Role, userMsg.Text);

        if (source != "demo") return payload;

        if (config.LiveChatEnabled && !config.AiEnabled)
            return payload;

        if (!config.AiEnabled)
            return payload;

        var reply = await _ai.GetReplyAsync(config.AiSystemPrompt, text, chapterContext);
        return await SendAssistantMessageAsync(sessionId, reply, "ai", fanOutExternal: true);
    }

    public async Task<object?> SendAdminReplyAsync(string sessionId, string text)
    {
        if (string.IsNullOrWhiteSpace(text) || string.IsNullOrWhiteSpace(sessionId)) return null;

        var config = await _db.DemoConfigs.AsNoTracking().FirstAsync();
        return await SendAssistantMessageAsync(sessionId, text.Trim(), "admin", fanOutExternal: true, config: config);
    }

    public async Task<object?> IngestExternalReplyAsync(
        string sessionId,
        string text,
        string source,
        string? externalId = null,
        string role = "assistant")
    {
        if (string.IsNullOrWhiteSpace(text) || string.IsNullOrWhiteSpace(sessionId)) return null;

        if (!string.IsNullOrEmpty(externalId))
        {
            var exists = await _db.ChatMessages.AnyAsync(m => m.ExternalId == externalId);
            if (exists) return null;
        }

        var config = await _db.DemoConfigs.AsNoTracking().FirstAsync();
        return await SendAssistantMessageAsync(sessionId, text.Trim(), source, externalId, fanOutExternal: false, config: config, role: role);
    }

    private async Task<object?> SendAssistantMessageAsync(
        string sessionId,
        string text,
        string source,
        string? externalId = null,
        bool fanOutExternal = false,
        DemoConfig? config = null,
        string role = "assistant")
    {
        config ??= await _db.DemoConfigs.AsNoTracking().FirstAsync();

        var msg = new ChatMessage
        {
            SessionId = sessionId,
            Role = role,
            Text = text,
            Source = source,
            ExternalId = externalId
        };
        _db.ChatMessages.Add(msg);
        await _db.SaveChangesAsync();

        var payload = BuildPayload(msg, sessionId);
        await BroadcastAsync(sessionId, payload);

        if (fanOutExternal && source is "admin" or "ai")
            await FanOutToIntegrationsAsync(sessionId, config, msg.Role, msg.Text);

        return payload;
    }

    private static object BuildPayload(ChatMessage msg, string sessionId) => new
    {
        id = msg.Id,
        sessionId,
        role = msg.Role,
        text = msg.Text,
        source = msg.Source,
        createdAt = msg.CreatedAt
    };

    private async Task BroadcastAsync(string sessionId, object payload)
    {
        await _hub.Clients.Group($"demo-{sessionId}").SendAsync("ReceiveMessage", payload);
        await _hub.Clients.Group("admin-chat").SendAsync("ReceiveMessage", payload);
    }

    private async Task EnsureExternalThreadsAsync(string sessionId, DemoConfig config, string previewText)
    {
        var mapping = await _db.ChatSessionMappings.FirstOrDefaultAsync(m => m.SessionId == sessionId);
        if (mapping != null) return;

        mapping = new ChatSessionMapping { SessionId = sessionId, CreatedAt = DateTime.UtcNow };
        _db.ChatSessionMappings.Add(mapping);
        await _db.SaveChangesAsync();

        if (config.SlackEnabled && !string.IsNullOrWhiteSpace(config.SlackChannelId))
        {
            try
            {
                var shortId = sessionId.Length > 8 ? sessionId[..8] : sessionId;
                var threadTs = await _slack.CreateThreadAsync(
                    config.SlackChannelId,
                    $"Demo chat — session {shortId}",
                    previewText);
                if (threadTs != null)
                {
                    mapping.SlackChannelId = config.SlackChannelId;
                    mapping.SlackThreadTs = threadTs;
                    await _db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to create Slack thread for session {SessionId}", sessionId);
            }
        }
    }

    private async Task FanOutToIntegrationsAsync(string sessionId, DemoConfig config, string role, string text)
    {
        var mapping = await _db.ChatSessionMappings.AsNoTracking()
            .FirstOrDefaultAsync(m => m.SessionId == sessionId);
        if (mapping == null) return;

        var prefix = role == "user" ? "User" : role == "admin" ? "Admin" : "Assistant";

        if (config.SlackEnabled && mapping.SlackChannelId != null && mapping.SlackThreadTs != null)
        {
            try
            {
                await _slack.PostThreadReplyAsync(mapping.SlackChannelId, mapping.SlackThreadTs, $"*{prefix}:* {text}");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to post Slack message for session {SessionId}", sessionId);
            }
        }

        if (config.TeamsEnabled && mapping.TeamsConversationId != null && mapping.TeamsServiceUrl != null)
        {
            try
            {
                await _teams.SendMessageAsync(mapping.TeamsServiceUrl, mapping.TeamsConversationId, $"{prefix}: {text}");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to post Teams message for session {SessionId}", sessionId);
            }
        }
    }

    public async Task StoreTeamsConversationAsync(string sessionId, string conversationId, string serviceUrl)
    {
        var mapping = await _db.ChatSessionMappings.FirstOrDefaultAsync(m => m.SessionId == sessionId);
        if (mapping == null)
        {
            mapping = new ChatSessionMapping
            {
                SessionId = sessionId,
                TeamsConversationId = conversationId,
                TeamsServiceUrl = serviceUrl,
                CreatedAt = DateTime.UtcNow
            };
            _db.ChatSessionMappings.Add(mapping);
        }
        else
        {
            mapping.TeamsConversationId = conversationId;
            mapping.TeamsServiceUrl = serviceUrl;
        }
        await _db.SaveChangesAsync();
    }
}
