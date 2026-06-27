using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace VideoTool.Web.Services;

public class StripeService
{
    private readonly StripeOptions _options;
    private readonly ILogger<StripeService> _logger;

    public StripeService(IOptions<StripeOptions> options, ILogger<StripeService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_options.SecretKey) &&
        !string.IsNullOrWhiteSpace(_options.PublishableKey) &&
        !string.IsNullOrWhiteSpace(_options.PriceStarter) &&
        !string.IsNullOrWhiteSpace(_options.PricePro);

    public string? GetPublishableKey() =>
        string.IsNullOrWhiteSpace(_options.PublishableKey) ? null : _options.PublishableKey;

    public async Task<string> CreateCheckoutSessionAsync(string plan, string successUrl, string cancelUrl, CancellationToken ct = default)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("Stripe is not configured");

        var priceId = plan.ToLowerInvariant() switch
        {
            "starter" => _options.PriceStarter,
            "pro" => _options.PricePro,
            _ => throw new ArgumentException("Invalid plan. Use 'starter' or 'pro'.", nameof(plan))
        };

        if (string.IsNullOrWhiteSpace(priceId))
            throw new InvalidOperationException($"No Stripe price configured for plan '{plan}'.");

        StripeConfiguration.ApiKey = _options.SecretKey;

        var service = new SessionService();
        var session = await service.CreateAsync(new SessionCreateOptions
        {
            Mode = "subscription",
            LineItems =
            [
                new SessionLineItemOptions { Price = priceId, Quantity = 1 }
            ],
            SuccessUrl = successUrl,
            CancelUrl = cancelUrl,
        }, cancellationToken: ct);

        if (string.IsNullOrWhiteSpace(session.Url))
            throw new InvalidOperationException("Stripe did not return a checkout URL.");

        _logger.LogInformation("Created Stripe checkout session {SessionId} for plan {Plan}", session.Id, plan);
        return session.Url;
    }

    public Event ConstructWebhookEvent(string json, string signature)
    {
        if (string.IsNullOrWhiteSpace(_options.WebhookSecret))
            throw new InvalidOperationException("Stripe webhook secret is not configured.");

        return EventUtility.ConstructEvent(json, signature, _options.WebhookSecret);
    }

    public void HandleWebhookEvent(Event stripeEvent)
    {
        switch (stripeEvent.Type)
        {
            case EventTypes.CheckoutSessionCompleted:
                var session = stripeEvent.Data.Object as Session;
                _logger.LogInformation(
                    "Checkout completed: session {SessionId}, customer {CustomerId}, subscription {SubscriptionId}",
                    session?.Id, session?.CustomerId, session?.SubscriptionId);
                break;

            case EventTypes.CustomerSubscriptionCreated:
            case EventTypes.CustomerSubscriptionUpdated:
            case EventTypes.CustomerSubscriptionDeleted:
                var subscription = stripeEvent.Data.Object as Subscription;
                _logger.LogInformation(
                    "Subscription event {EventType}: subscription {SubscriptionId}, status {Status}",
                    stripeEvent.Type, subscription?.Id, subscription?.Status);
                break;

            default:
                _logger.LogDebug("Unhandled Stripe webhook event type: {EventType}", stripeEvent.Type);
                break;
        }
    }
}
