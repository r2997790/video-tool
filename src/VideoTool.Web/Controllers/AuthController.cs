using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoTool.Data;
using VideoTool.Domain.Entities;

namespace VideoTool.Web.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly VideoToolDbContext _db;

    public AuthController(VideoToolDbContext db) => _db = db;

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await _db.AdminUsers.FirstOrDefaultAsync(u => u.Username == req.Username && u.IsActive);
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid credentials" });

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.NameIdentifier, user.Id.ToString())
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

        return Ok(new { username = user.Username, mustChangePassword = user.MustChangePassword });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "Name is required." });

        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
            return BadRequest(new { error = "A valid email is required." });

        if (string.IsNullOrWhiteSpace(req.Company))
            return BadRequest(new { error = "Company is required." });

        if (string.IsNullOrWhiteSpace(req.Password) || req.Password.Length < 8)
            return BadRequest(new { error = "Password must be at least 8 characters." });

        var username = req.Email.Trim().ToLowerInvariant();
        if (await _db.AdminUsers.AnyAsync(u => u.Username == username))
            return Conflict(new { error = "An account with this email already exists. Sign in instead." });

        var user = new AdminUser
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            IsActive = true,
            MustChangePassword = false,
        };
        _db.AdminUsers.Add(user);
        await _db.SaveChangesAsync();

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.NameIdentifier, user.Id.ToString())
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

        return Ok(new { username = user.Username, mustChangePassword = false });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { success = true });
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!User.Identity?.IsAuthenticated ?? true)
            return Ok(new { authenticated = false });

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var mustChangePassword = false;
        if (int.TryParse(userIdClaim, out var userId))
        {
            var user = await _db.AdminUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
            mustChangePassword = user?.MustChangePassword ?? false;
        }

        return Ok(new { authenticated = true, username = User.Identity?.Name, mustChangePassword });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 8)
            return BadRequest(new { error = "New password must be at least 8 characters." });

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { error = "Not authenticated." });

        var user = await _db.AdminUsers.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
        if (user == null) return Unauthorized(new { error = "Not authenticated." });

        if (!BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
            return BadRequest(new { error = "Current password is incorrect." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.MustChangePassword = false;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, mustChangePassword = false });
    }

    public record LoginRequest(string Username, string Password);
    public record RegisterRequest(string Name, string Email, string Company, string Password);
    public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
}
