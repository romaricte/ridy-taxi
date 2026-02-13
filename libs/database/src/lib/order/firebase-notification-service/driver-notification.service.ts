import { Injectable, Logger } from '@nestjs/common';
import { messaging } from 'firebase-admin';
@Injectable()
export class DriverNotificationService {
  async requests(tokens: string[]) {
    tokens = tokens
      .filter((token) => (token?.length ?? 0) > 0)
      .map((x) => x) as unknown as string[];
    if (tokens.length < 1) return;
    Logger.log(tokens, 'DriverNotificationService.requests.tokens');
    try {
      const notificationResult = await messaging().sendEachForMulticast({
        tokens: tokens,
        android: {
          notification: {
            sound: 'default',
            titleLocKey: 'notification_new_request_title',
            bodyLocKey: 'notification_new_request_body',
            channelId: 'orders',
            icon: 'notification_icon',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: {
                critical: true,
                name: process.env.REQUEST_SOUND ?? 'default',
                volume: 1.0,
              },
              badge: 1,
              contentAvailable: true,
              alert: {
                titleLocKey: 'notification_new_request_title',
                subtitleLocKey: 'notification_new_request_body',
              },
            },
          },
        },
      });
      Logger.log(notificationResult);
    } catch (error) {
      Logger.error(error);
    }
  }

  canceled(fcmToken: string | undefined) {
    this.sendNotification(
      fcmToken,
      'notification_cancel_title',
      'notification_cancel_body',
    );
  }

  async message(fcmToken: string, message: string) {
    if (fcmToken == null) return;
    try {
      await messaging().send({
        token: fcmToken,
        android: {
          notification: {
            sound: 'default',
            titleLocKey: 'notification_new_message_title',
            body: message,
            channelId: 'message',
            icon: 'notification_icon',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
              alert: {
                titleLocKey: 'notification_new_message_title',
                subtitle: message,
              },
            },
          },
        },
      });
    } catch (error) {
      Logger.log(JSON.stringify(error));
    }
  }

  paid(fcmToken: string) {
    this.sendNotification(
      fcmToken,
      'notification_paid_title',
      'notification_paid_body',
    );
  }

  assigned(fcmToken: string, time: string, from: string, to: string) {
    this.sendNotification(
      fcmToken,
      'notification_assigned_title',
      'notification_assigned_body',
      [time, from, to],
    );
  }

  upcomingBooking(driver: string) {
    this.sendNotification(
      driver,
      'notification_upcoming_ride_title',
      'notification_upcoming_ride_body',
    );
  }

  private async sendNotification(
    fcmToken: string | undefined | null,
    titleLocKey: string,
    bodyLocKey: string,
    bodyLocArgs: string[] = [],
    sound = 'default',
    channelId = 'tripEvents',
  ) {
    if (fcmToken == null) return;
    try {
      await messaging().send({
        token: fcmToken,
        android: {
          notification: {
            sound,
            titleLocKey,
            bodyLocKey,
            bodyLocArgs,
            channelId,
            icon: 'notification_icon',
          },
        },
        apns: {
          payload: {
            aps: {
              sound,
              alert: {
                titleLocKey,
                subtitleLocKey: bodyLocKey,
                subtitleLocArgs: bodyLocArgs,
              },
            },
          },
        },
      });
    } catch (error) {
      Logger.log(JSON.stringify(error));
    }
  }
}
