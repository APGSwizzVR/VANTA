/**
 * A minimal per-key token bucket, used to cap how often a single
 * connection may send PILOT_UPDATE messages. This is deliberately
 * simple (no external dependency) since the realtime service only
 * needs to bound one thing: update frequency per connection.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefillMs: number;

  constructor(
    private readonly maxTokens: number,
    private readonly refillPerSecond: number
  ) {
    this.tokens = maxTokens;
    this.lastRefillMs = Date.now();
  }

  /** Returns true and consumes a token if one is available, false otherwise. */
  tryConsume(): boolean {
    this.refill();
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillMs) / 1000;
    if (elapsedSeconds <= 0) return;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsedSeconds * this.refillPerSecond);
    this.lastRefillMs = now;
  }
}
