import { Point } from 'src/lib/interfaces';
import { DriverEventPayload } from '../models/driver-event-payload';
import { RiderActiveOrderUpdateDTO } from '../models/rider-active-order-update-payload';

export type RiderId = number;
export type DriverId = number;
export type OperatorId = number;
export type ShopId = number;

export interface EventMap {
  'driver.event': {
    params: { driverId: DriverId };
    payload: DriverEventPayload;
  };
  'rider.order.updated': {
    params: { riderId: RiderId };
    payload: RiderActiveOrderUpdateDTO;
  };
  'admin.driver-location.updated': {
    params: { operatorId: OperatorId };
    payload: {
      driverId: DriverId;
      location: Point;
    };
  };
  'admin.complaint.created': {
    params: { operatorId: OperatorId };
    payload: {
      complaintId: number;
      description: string;
    };
  };
  'shop.notification.created': {
    params: { shopId: ShopId };
    payload: {
      notificationId: number;
      message: string;
    };
  };
  'admin.sos.created': {
    params: { operatorId: OperatorId };
    payload: {
      sosId: number;
    };
  };
}

type Key = keyof EventMap;

export const buildTopic = <K extends Key>(key: K, p: EventMap[K]['params']) => {
  switch (key) {
    case 'driver.event': {
      const driverParams = p as EventMap['driver.event']['params'];
      return `driver:${driverParams.driverId}:event`;
    }
    case 'rider.order.updated': {
      const riderParams = p as EventMap['rider.order.updated']['params'];
      return `rider:${riderParams.riderId}:order.updated`;
    }
    case 'admin.driver-location.updated': {
      const adminParams =
        p as EventMap['admin.driver-location.updated']['params'];
      return `admin:${adminParams.operatorId}:driver-location.updated`;
    }
    case 'admin.complaint.created': {
      const adminParams = p as EventMap['admin.complaint.created']['params'];
      return `admin:${adminParams.operatorId}:complaint.created`;
    }
    case 'admin.sos.created': {
      const adminParams = p as EventMap['admin.sos.created']['params'];
      return `admin:${adminParams.operatorId}:sos.created`;
    }
    case 'shop.notification.created': {
      const shopParams = p as EventMap['shop.notification.created']['params'];
      return `shop:${shopParams.shopId}:notification.created`;
    }
  }
};
