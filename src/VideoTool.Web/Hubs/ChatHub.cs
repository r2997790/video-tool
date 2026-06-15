using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using VideoTool.Web.Services;

namespace VideoTool.Web.Hubs;

public class ChatHub : Hub
{
    private readonly ChatMessageService _chat;

    public ChatHub(ChatMessageService chat)
    {
        _chat = chat;
    }

    public async Task JoinSession(string sessionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, SessionGroup(sessionId));
    }

    [Authorize]
    public async Task JoinAdmin()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "admin-chat");
    }

    public async Task SendMessage(string sessionId, string text, string? chapterContext, string? flowSlug = null)
    {
        await _chat.SendUserMessageAsync(sessionId, text, chapterContext, source: "demo", flowSlug: flowSlug);
    }

    [Authorize]
    public async Task AdminReply(string sessionId, string text)
    {
        await _chat.SendAdminReplyAsync(sessionId, text);
    }

    private static string SessionGroup(string sessionId) => $"demo-{sessionId}";
}
