// import env
import './config/env';

// tsyringe dependency injection
import 'reflect-metadata';

// Register Core Event Handlers
import './event/handler';

// Register Subscription Event Handlers
import '@/modules/subscription/event/handler';

// Register Cron Jobs
import '@/modules/subscription/jobs/process-expired-grace-periods.cron-job';
