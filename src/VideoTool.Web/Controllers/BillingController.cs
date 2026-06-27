using Microsoft.AspNetCore.Mvc;
using VideoTool.Web.Services;

namespace VideoTool.Web.Controllers;

[ApiController]
[Route("api/billing")]
public class BillingController : ControllerBase
{
    private readonly StripeService _stripe;
    private readonly ILogger<BillingController> _logger;

    public BillingController(StripeService stripe, ILogger<BillingController> logger)
    {
        _stripe = stripe;
        _logger = logger;
    }

    [HttpGet("config")]
    public IActionResult GetConfig()
    {
        return Ok(new
        {
            configured = _stripe.IsConfigured,
            publishableKey = _stripe.GetPublishableKey()
        });
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> CreateCheckout([FromBody] CheckoutRequest req, CancellationToken ct)
    {
        if (!_stripe.IsConfigured)
            return StatusCode(503, new { error = "Billing is not configured" });

        if (string.IsNullOrWhiteSpace(req.Plan))
            return BadRequest(new { error = "Plan is required" });

        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var successUrl = string.IsNullOrWhiteSpace(req.SuccessUrl)
            ? $"{baseUrl}/?checkout=success"
            : req.SuccessUrl;
        var cancelUrl = string.IsNullOrWhiteSpace(req.CancelUrl)
            ? $"{baseUrl}/?checkout=cancel"
            : req.CancelUrl;

        try
        {
            var url = await _stripe.CreateCheckoutSessionAsync(req.Plan, successUrl, cancelUrl, ct);
            return Ok(new { url });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create Stripe checkout session for plan {Plan}", req.Plan);
            return StatusCode(500, new { error = "Unable to start checkout" });
        }
    }

    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook(CancellationToken ct)
    {
        var signature = Request.Headers["Stripe-Signature"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(signature))
            return BadRequest(new { error = "Missing Stripe-Signature header" });

        string json;
        using (var reader = new StreamReader(Request.Body))
            json = await reader.ReadToEndAsync(ct);

        try
        {
            var stripeEvent = _stripe.ConstructWebhookEvent(json, signature);
            _stripe.HandleWebhookEvent(stripeEvent);
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Stripe webhook verification or handling failed");
            return BadRequest(new { error = "Webhook error" });
        }
    }
}

public record CheckoutRequest(string Plan, string? SuccessUrl = null, string? CancelUrl = null);
