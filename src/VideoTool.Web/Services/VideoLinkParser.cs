namespace VideoTool.Web.Services;

public static class VideoLinkParser
{
    public static (string Type, string Value) Parse(string? link)
    {
        if (string.IsNullOrWhiteSpace(link))
            return ("none", "");

        var trimmed = link.Trim();

        if (trimmed.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            if (trimmed.Contains("youtube.com/watch", StringComparison.OrdinalIgnoreCase))
            {
                var id = ExtractQueryParam(trimmed, "v");
                if (!string.IsNullOrEmpty(id)) return ("youtube", id);
            }
            if (trimmed.Contains("youtu.be/", StringComparison.OrdinalIgnoreCase))
            {
                var id = trimmed.Split('/').LastOrDefault()?.Split('?').FirstOrDefault();
                if (!string.IsNullOrEmpty(id)) return ("youtube", id);
            }
            if (trimmed.Contains("youtube.com/embed/", StringComparison.OrdinalIgnoreCase))
            {
                var parts = trimmed.Split('/');
                var id = parts.LastOrDefault()?.Split('?').FirstOrDefault();
                if (!string.IsNullOrEmpty(id)) return ("youtube", id);
            }
            if (IsDirectVideo(trimmed))
                return ("direct", trimmed);

            return ("direct", trimmed);
        }

        if (trimmed.Length == 11 && trimmed.All(c => char.IsLetterOrDigit(c) || c == '-' || c == '_'))
            return ("youtube", trimmed);

        return ("direct", trimmed);
    }

    private static bool IsDirectVideo(string url) =>
        url.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase) ||
        url.EndsWith(".webm", StringComparison.OrdinalIgnoreCase) ||
        url.EndsWith(".m3u8", StringComparison.OrdinalIgnoreCase) ||
        url.Contains(".mp4?", StringComparison.OrdinalIgnoreCase);

    private static string? ExtractQueryParam(string url, string key)
    {
        var idx = url.IndexOf('?');
        if (idx < 0) return null;
        foreach (var part in url[(idx + 1)..].Split('&'))
        {
            var kv = part.Split('=', 2);
            if (kv.Length == 2 && kv[0] == key)
                return Uri.UnescapeDataString(kv[1]);
        }
        return null;
    }
}
