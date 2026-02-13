import { Injectable, Logger } from '@nestjs/common';
import { messaging } from 'firebase-admin';

@Injectable()
export class RiderNotificationService {
  async message(fcmToken: string | undefined | null, message: string) {
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

  canceled(fcmToken: string | undefined | null) {
    this.sendNotification(
      fcmToken,
      'notification_cancel_title',
      'notification_cancel_body',
      'Canceled',
      'Your trip has been canceled',
    );
  }

  accepted(fcmToken: string | undefined | null) {
    Logger.log(`Sending accepted notification to ${fcmToken}`);
    this.sendNotification(
      fcmToken,
      'notification_found_title',
      'notification_found_body',
      'Accepted',
      'A driver has accepted your requet',
    );
  }

  bookingAssigned(fcmToken: string | undefined | null, time: string) {
    this.sendNotification(
      fcmToken,
      'notification_booking_assigned_title',
      'notification_booking_assigned_body',
      'Assigned',
      'A driver has been assigned to your trip',
      [time],
    );
  }

  arrived(fcmToken?: string) {
    this.sendNotification(
      fcmToken,
      'notification_arrived_title',
      'notification_arrived_body',
      'Arrived',
      'Driver has arrived to your location',
    );
  }

  started(fcmToken?: string) {
    this.sendNotification(
      fcmToken,
      'notification_started_title',
      'notification_started_body',
      'Started',
      'Trip has been started',
    );
  }

  waitingForPostPay(fcmToken?: string) {
    this.sendNotification(
      fcmToken,
      'notification_waiting_for_pay_title',
      'notification_waiting_for_pay_body',
      'Finished',
      'Waiting for post-pay',
    );
  }

  finished(fcmToken?: string) {
    this.sendNotification(
      fcmToken,
      'notification_finished_title',
      'notification_finished_body',
      'Finished',
      'Trip has been finished.',
    );
  }

  private async sendNotification(
    fcmToken: string | undefined | null,
    titleLocKey: string,
    bodyLocKey: string,
    titleDefault: string,
    bodyDefault: string,
    bodyLocArgs: string[] = [],
    sound = 'default',
    channelId = 'tripEvents',
  ) {
    if (fcmToken == null || fcmToken.length < 5 || fcmToken === undefined) {
      return;
    }
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
        webpush: {
          notification: {
            title: titleDefault,
            body: bodyDefault,
          },
        },
      });
    } catch (error) {
      Logger.log(JSON.stringify(error));
    }
  }
}
