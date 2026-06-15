using System.Net;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using VideoTool.Domain.Entities;

namespace VideoTool.Web.Services;

public class LeadNotificationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<LeadNotificationService> _logger;

    public LeadNotificationService(IHttpClientFactory httpClientFactory, ILogger<LeadNotificationService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task NotifyAsync(DemoConfig config, LeadSubmission lead)
    {
        if (!string.IsNullOrWhiteSpace(config.LeadWebhookUrl))
            await PostWebhookAsync(config.LeadWebhookUrl, lead);

        if (!string.IsNullOrWhiteSpace(config.LeadNotifyEmail))
            await SendEmailAsync(config.LeadNotifyEmail, lead);
    }

    private async Task PostWebhookAsync(string url, LeadSubmission lead)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            var payload = JsonSerializer.Serialize(new
            {
                lead.Id,
                lead.SessionId,
                lead.FlowSlug,
                lead.Source,
                lead.ChapterId,
                lead.NodeId,
                answers = JsonSerializer.Deserialize<object>(lead.AnswersJson),
                lead.CreatedAt,
            });
            using var content = new StringContent(payload, Encoding.UTF8, "application/json");
            var response = await client.PostAsync(url, content);
            if (!response.IsSuccessStatusCode)
                _logger.LogWarning("Lead webhook returned {StatusCode} for lead {LeadId}", response.StatusCode, lead.Id);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lead webhook failed for lead {LeadId}", lead.Id);
        }
    }

    private async Task SendEmailAsync(string toEmail, LeadSubmission lead)
    {
        var host = Environment.GetEnvironmentVariable("SMTP_HOST");
        if (string.IsNullOrWhiteSpace(host))
        {
            _logger.LogInformation("Lead notify email skipped — SMTP_HOST not configured (lead {LeadId})", lead.Id);
            return;
        }

        try
        {
            var port = int.TryParse(Environment.GetEnvironmentVariable("SMTP_PORT"), out var p) ? p : 587;
            var user = Environment.GetEnvironmentVariable("SMTP_USER") ?? "";
            var pass = Environment.GetEnvironmentVariable("SMTP_PASS") ?? "";
            var from = Environment.GetEnvironmentVariable("SMTP_FROM") ?? user;
            if (string.IsNullOrWhiteSpace(from)) return;

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = port != 25,
                Credentials = string.IsNullOrEmpty(user) ? null : new NetworkCredential(user, pass),
            };

            var body = new StringBuilder()
                .AppendLine($"New lead from flow: {lead.FlowSlug}")
                .AppendLine($"Source: {lead.Source}")
                .AppendLine($"Session: {lead.SessionId}")
                .AppendLine($"Submitted: {lead.CreatedAt:u}")
                .AppendLine()
                .AppendLine("Answers:")
                .AppendLine(lead.AnswersJson)
                .ToString();

            using var message = new MailMessage(from, toEmail.Trim())
            {
                Subject = $"New demo lead — {lead.FlowSlug}",
                Body = body,
            };
            await client.SendMailAsync(message);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lead notify email failed for lead {LeadId}", lead.Id);
        }
    }
}
