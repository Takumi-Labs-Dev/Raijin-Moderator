# Auto Moderation System Implementation

## Overview

This document describes the Auto Moderation (AutoMod) system added to the Raijin Discord bot. The system provides comprehensive automated moderation capabilities with a modern dashboard interface.

## What Was Added

### Backend Modules

**New Directory Structure:**
```
bot/automod/
├── index.js              # Main entry point
├── config.js             # Configuration utilities
├── handler.js            # Coordinates all filters
├── filters/
│   ├── index.js          # Filter exports
│   ├── bannedWords.js    # Banned words/phrases filter
│   ├── spamProtection.js # Rapid message detection
│   ├── linkFilter.js     # Discord invite & URL filter
│   ├── capsFilter.js     # Excessive caps detection
│   ├── mentionSpam.js    # Mention spam detection
│   └── antiRaid.js       # Raid detection system
└── actions/
    ├── index.js          # Action exports
    └── actions.js        # Punishment execution (delete, warn, mute, kick, ban)
```

### New Event Handler

**File:** `bot/events/messageCreate.js`
- Hooks into Discord's messageCreate event
- Routes messages to automod handler for filtering

### Enhanced Logger Service

**File:** `bot/services/logger.js`
- Added automod-specific colors, labels, and emojis:
  - `automod`: Red (#EF4444) with 🛡️ emoji
  - `antiRaid`: Dark red (#DC2626) with 🚨 emoji
  - `warningEscalation`: Orange (#F97316) with 📈 emoji

### Dashboard Integration

**New Routes:**
- `GET /automod` - Auto Moderation configuration page
- `GET /api/automod/config/:guildId` - Fetch automod config
- `POST /api/automod/config/:guildId` - Update automod config
- `POST /api/automod/banned-words/:guildId` - Manage banned words

**New Page:** `dashboard/public/automod.html`
- Modern red-themed interface
- Toggle switches for each feature
- Sliders for thresholds
- Banned words management
- Real-time configuration

**Enhanced CSS:** `dashboard/public/style.css`
- Toggle switch components
- Form groups with improved styling
- Range sliders with red accent
- Word list with delete buttons
- Primary button with gradient

**Updated Navigation:** Added Auto Moderation link to all dashboard pages

## Features

### 1. Banned Words System
- **Match Types:** contains, exact match, regex
- **Case Sensitivity:** Optional
- **Actions:** delete, warn, mute, kick, ban
- **Auto Response:** Custom message with variables {user}, {word}, {channel}
- **Role Immunity:** Exclude specific roles
- **Channel Whitelist:** Exclude specific channels

### 2. Spam Protection
- **Rate Limiting:** X messages per Y seconds
- **Configurable:** Default 5 messages per 3 seconds
- **Actions:** delete, warn, mute
- **Auto Response:** Optional custom message

### 3. Link / Invite Filter
- **Block Discord Invites:** Detects discord.gg, discord.io, etc.
- **Block External URLs:** Detects http/https links
- **Whitelist Domains:** Allow specific domains
- **Whitelist Invites:** Allow specific invite codes
- **Role/Channel Immunity:** Configurable

### 4. Caps Lock Filter
- **Threshold:** Percentage of caps (default 70%)
- **Minimum Length:** Ignore short messages (default 5 chars)
- **Actions:** delete, warn, mute

### 5. Mention Spam
- **Limit:** Max mentions per message (default 5)
- **Exclude User Mentions:** Only count role mentions
- **Actions:** delete, warn, mute

### 6. Anti-Raid System
- **Detection:** Sudden member joins
- **Threshold:** X joins in Y seconds (default 5 in 10s)
- **Actions:**
  - `slowmode`: Enable slowmode on all channels
  - `lockdown`: Lock channels (deny SEND_MESSAGES)
  - `restrict`: Timeout new accounts (< 7 days)
- **Cooldown:** Prevents repeated actions (default 60s)

### 7. Warning Escalation
- **Automatic Punishment:** Based on warning count
- **Default Rules:**
  - 3 warnings → mute (10 minutes)
  - 5 warnings → ban
- **Configurable:** Custom thresholds and actions

## Configuration Structure

The automod configuration is stored in `data/config.json` under each guild:

```json
{
  "guildId": {
    "logChannelId": "channelId",
    "automod": {
      "enabled": false,
      "continueAfterTrigger": false,
      "bannedWords": {
        "enabled": false,
        "immuneRoles": [],
        "whitelistChannels": [],
        "words": [
          {
            "word": "badword",
            "matchType": "contains",
            "caseSensitive": false,
            "actions": ["delete"],
            "response": "Watch your language, {user}"
          }
        ]
      },
      "spam": {
        "enabled": false,
        "limit": 5,
        "interval": 3000,
        "immuneRoles": [],
        "whitelistChannels": [],
        "actions": ["delete", "mute"],
        "response": null
      },
      "links": {
        "enabled": false,
        "blockInvites": true,
        "blockLinks": true,
        "whitelistDomains": [],
        "whitelistInvites": [],
        "immuneRoles": [],
        "whitelistChannels": [],
        "actions": ["delete"],
        "response": null
      },
      "caps": {
        "enabled": false,
        "threshold": 70,
        "minLength": 5,
        "immuneRoles": [],
        "whitelistChannels": [],
        "actions": ["delete"],
        "response": null
      },
      "mentions": {
        "enabled": false,
        "limit": 5,
        "excludeUserMentions": false,
        "immuneRoles": [],
        "whitelistChannels": [],
        "actions": ["delete"],
        "response": null
      },
      "antiRaid": {
        "enabled": false,
        "threshold": 5,
        "detectionWindow": 10000,
        "cooldown": 60000,
        "actions": ["slowmode"],
        "slowmodeDuration": 10,
        "minAccountAge": 7
      },
      "warningEscalation": {
        "enabled": false,
        "rules": [
          {
            "threshold": 3,
            "actions": ["mute"],
            "duration": "10m"
          },
          {
            "threshold": 5,
            "actions": ["ban"],
            "duration": null
          }
        ]
      }
    }
  }
}
```

## How to Use

### 1. Enable Auto Moderation

1. Start the bot: `cd bot && npm start`
2. Start the dashboard: `cd dashboard && npm start`
3. Open dashboard at http://localhost:3000
4. Navigate to "Auto Moderation"
5. Toggle "Auto Moderation Status" to enable

### 2. Configure Filters

Each filter has its own toggle and settings:

**Banned Words:**
- Click toggle to enable
- Add words with match type and action
- Set optional auto-response
- Words appear in list with delete button

**Spam Protection:**
- Enable toggle
- Adjust message limit slider
- Adjust time window slider
- Select action (delete, delete+warn, delete+mute)

**Link Filter:**
- Enable toggle
- Check/uncheck block invites or links
- Add whitelisted domains (comma-separated)
- Select action

**Caps Filter:**
- Enable toggle
- Adjust caps threshold percentage
- Adjust minimum message length

**Mention Spam:**
- Enable toggle
- Adjust max mentions
- Check to exclude user mentions

**Anti-Raid:**
- Enable toggle
- Adjust join threshold
- Adjust detection window
- Select action (slowmode, lockdown, restrict)

**Warning Escalation:**
- Enable toggle
- Rules are pre-configured (3 warns → mute, 5 warns → ban)

### 3. Save Configuration

Click "Save Configuration" button at the bottom of the page. Settings are saved to `data/config.json`.

## Testing

### Manual Testing

1. **Banned Words:**
   - Add a test word to banned words
   - Send a message containing that word
   - Verify message is deleted and action taken

2. **Spam Protection:**
   - Enable with low threshold (e.g., 3 messages in 3 seconds)
   - Send rapid messages
   - Verify action is taken

3. **Link Filter:**
   - Enable link blocking
   - Send a Discord invite or URL
   - Verify message is deleted

4. **Caps Filter:**
   - Enable with 50% threshold
   - Send message with mostly caps
   - Verify action is taken

5. **Mention Spam:**
   - Enable with low limit (e.g., 3 mentions)
   - Send message with many mentions
   - Verify action is taken

6. **Warning Escalation:**
   - Enable warning escalation
   - Use `/warn` command 3 times on a user
   - Verify user is muted
   - Use `/warn` 2 more times
   - Verify user is banned

### Check Logs

All automod actions are logged:
- **Discord Channel:** Sent to configured log channel
- **JSON File:** Written to `data/logs.json`
- **Dashboard:** Viewable in "Server Logs" page

## Integration Notes

### No Breaking Changes

- All existing commands continue to work
- Existing event handlers are preserved
- Manual moderation commands are not affected
- Config structure is backward compatible

### Event Flow

```
messageCreate event
  ↓
automod/handler.js
  ↓
Check warning escalation first
  ↓
Run all enabled filters in sequence
  ↓
For each triggered filter:
  - Execute actions (delete, warn, mute, kick, ban)
  - Send auto-response if configured
  - Log to channel and file
  - Stop if continueAfterTrigger is false
```

### Anti-Raid Integration

Anti-raid uses the `guildMemberAdd` event. To integrate:

```javascript
const { handleMemberJoin } = require('./automod/handler');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member, client) {
    // Existing logging code...
    await handleMemberJoin(member, client);
  },
};
```

## Performance Considerations

### In-Memory Tracking

- **Spam Protection:** Uses in-memory Map with 30-second cleanup
- **Anti-Raid:** Uses in-memory Map with 1-minute cleanup
- **Memory Usage:** Minimal, automatic cleanup prevents leaks

### File I/O

- All config operations are synchronous (existing pattern)
- Log writes are synchronous (existing pattern)
- Consider async migration for high-traffic servers

## Future Enhancements

### Recommended Improvements

1. **Database Migration:** Replace JSON with SQLite/PostgreSQL
2. **Async Operations:** Migrate to async file I/O
3. **Real-time Updates:** WebSocket for dashboard live updates
4. **Advanced Rules:** More complex conditionals
5. **Appeal System:** User appeal workflow
6. **Analytics:** Detailed automod statistics
7. **Role-Based Dashboard:** Different permission levels
8. **Bulk Operations:** Import/export configurations

### Scalability

- Current system suitable for small to medium servers
- For large servers (10k+ members), consider:
  - Redis for distributed caching
  - Queue system for background tasks
  - Database migration
  - Rate limiting on API endpoints

## Troubleshooting

### Automod Not Triggering

1. Check if automod is enabled globally
2. Check if specific filter is enabled
3. Verify log channel is configured
4. Check bot has necessary permissions
5. Verify role hierarchy (bot role above members)

### Dashboard Not Saving

1. Check browser console for errors
2. Verify `data/config.json` is writable
3. Check API routes are responding
4. Verify session is authenticated

### High Memory Usage

1. Check cleanup intervals in filters
2. Reduce detection windows
3. Restart bot periodically
4. Monitor with process manager

## Support

For issues or questions:
- Check logs in `data/logs.json`
- Verify configuration in `data/config.json`
- Test with manual commands first
- Check Discord bot permissions
