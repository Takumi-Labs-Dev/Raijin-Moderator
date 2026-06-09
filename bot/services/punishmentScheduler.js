function parseDuration(durationString) {
  if (!durationString || typeof durationString !== 'string') return null;

  const match = durationString.trim().toLowerCase().match(/^(\d+)(m|h|d)$/);

  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit  = match[2];

  if (isNaN(value) || value <= 0) return null;

  const multipliers = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const ms = value * multipliers[unit];

  const MAX_MS = 28 * 24 * 60 * 60 * 1000;

  if (ms <= 0 || ms > MAX_MS) return null;

  return ms;
}

module.exports = { parseDuration };