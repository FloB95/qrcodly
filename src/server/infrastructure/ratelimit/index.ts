import { Ratelimit } from "@upstash/ratelimit";
import AppCache from "../cache";
export const RateLimiter = new Ratelimit({
  redis: AppCache.getClient(),
  limiter: Ratelimit.fixedWindow(5, "30 s"),
});
