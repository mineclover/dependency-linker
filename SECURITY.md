# Security Guidelines

This document outlines security best practices for the Dependency Linker project.

## Environment Variables and Configuration

### ✅ Secure Configuration

**Store sensitive data in environment variables:**

```bash
# .env file (NEVER commit this to version control)
NOTION_API_KEY=your_api_key_here
NOTION_PARENT_PAGE_ID=your_parent_page_id_here
NODE_ENV=development
```

**Use configuration files for non-sensitive settings:**

```json
// .deplink-config.json (safe to commit)
{
  "project": {
    "path": "/path/to/project",
    "environment": "development"
  },
  "notion": {
    "databases": {
      "files": "database-id-here",
      "functions": "database-id-here"
    }
  }
}
```

### ❌ Insecure Configuration

**Never put sensitive data in configuration files:**

```json
// BAD: Don't do this
{
  "notion": {
    "apiKey": "secret_123456789",  // ❌ Security risk!
    "parentPageId": "page-id"      // ❌ Security risk!
  }
}
```

## Configuration Validation

Use the built-in security validation command:

```bash
# Run comprehensive security audit
bun src/main.ts config-validate --security-audit --verbose

# Fix invalid ID formats automatically
bun src/main.ts config-validate --fix-ids
```

## Security Features

### Automatic Security Checks

- **API Key Format Validation**: Ensures keys follow Notion's format (secret_* or ntn_*)
- **ID Format Validation**: Validates database and page IDs are proper UUIDs/hex strings
- **Source Validation**: Warns if sensitive data is stored in config files
- **Environment Consistency**: Validates production environments use secure practices

### Security Reports

The configuration validator provides detailed security reports:

```
🛡️ Security Audit Results:
   Overall Rating: 🟢 SECURE / 🟡 WARNING / 🔴 CRITICAL
   
   Security Findings:
   🔴 [CRITICAL] API key stored in configuration file
   → Recommendation: Move API key to .env file
```

## Best Practices

### 1. Environment Variables
- Store all sensitive data in `.env` files
- Use consistent naming conventions (`NOTION_*` prefix)
- Never commit `.env` files to version control

### 2. Configuration Files
- Only store non-sensitive configuration
- Database IDs can be stored in config files (they're not secret)
- Include security notes in metadata

### 3. Development vs Production
- Use different API keys for development and production
- Validate production environments use environment variables
- Never store production secrets in development config

### 4. Access Control
- Limit API key permissions in Notion workspace
- Regularly rotate API keys
- Monitor API usage and access patterns

### 5. File Security
- Ensure `.gitignore` excludes all sensitive files
- Use file permissions to restrict access to `.env` files
- Backup sensitive configurations securely

## Security Validation Process

1. **Automatic Validation**: Every configuration load includes security checks
2. **ID Format Validation**: Database and page IDs are validated for proper format
3. **Source Analysis**: Configuration sources are analyzed for security compliance
4. **Recommendation Engine**: Provides specific recommendations for security improvements

## Common Security Issues

### Issue: API Key in Config File
**Problem**: API key stored in `.deplink-config.json`
**Solution**: Move to `.env` file and remove from config
**Command**: `bun src/main.ts config-validate --security-audit`

### Issue: Invalid ID Format
**Problem**: Database IDs are not properly formatted
**Solution**: Use ID validation and auto-fix
**Command**: `bun src/main.ts config-validate --fix-ids`

### Issue: Mixed Configuration Sources
**Problem**: Configuration spread across multiple sources inconsistently
**Solution**: Standardize on environment variables for secrets, config files for settings
**Command**: Review security audit recommendations

## Incident Response

If you suspect a security issue:

1. **Immediate**: Rotate affected API keys
2. **Investigation**: Run security audit to identify all affected areas
3. **Remediation**: Follow security recommendations to fix issues
4. **Prevention**: Update security practices and documentation

## Compliance

This system follows security best practices for:
- Environment variable management
- Configuration file security
- API key protection
- Access control validation

For questions about security practices, consult this documentation and run the security audit command.