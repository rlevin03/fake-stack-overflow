import cron from 'node-cron';
import { decayInactiveUserPoints } from './services/user.service';

// Schedule the job to run every day at midnight (adjust the cron schedule as needed)
cron.schedule('0 0 * * *', async () => {
  console.log('Running inactive user points decay job...');
  await decayInactiveUserPoints();
  console.log('Inactive user points decay job completed.');
});
