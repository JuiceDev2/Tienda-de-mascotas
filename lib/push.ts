import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

let configured = false;

function ensureConfigured() {
  if (configured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:soporte@example.com';

  if (!publicKey || !privateKey) {
    // Push is optional: if VAPID keys aren't set yet, silently skip sending
    // instead of throwing and breaking the notification/inventory flow.
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

/**
 * Sends a push notification to every device the given user has subscribed
 * from. Failed/expired subscriptions are removed so they stop being retried.
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!ensureConfigured()) return;

  const supabase = getServiceClient();
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, auth_key, p256dh_key')
    .eq('user_id', userId);

  if (!subscriptions || subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { auth: sub.auth_key, p256dh: sub.p256dh_key },
          },
          JSON.stringify(payload)
        );
      } catch (error: any) {
        // 404/410 means the subscription is no longer valid on the browser
        // side (unsubscribed, cleared storage, etc.) — clean it up.
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    })
  );
}
