using System.Text.RegularExpressions;

namespace RateEverything.Api.Services;

public static class Slug
{
    public static string From(string label)
    {
        var slug = label.ToLowerInvariant().Trim();
        slug = Regex.Replace(slug, "[^a-z0-9]+", "-");
        slug = Regex.Replace(slug, "(^-|-$)", "");
        return slug;
    }
}
