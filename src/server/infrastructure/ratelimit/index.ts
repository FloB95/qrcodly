import { Ratelimit } from "@upstash/ratelimit";
import AppCache from "../cache";
export const RateLimiter = new Ratelimit({
  redis: AppCache.getClient(),
  limiter: Ratelimit.tokenBucket(3, "10 s", 1),
});
