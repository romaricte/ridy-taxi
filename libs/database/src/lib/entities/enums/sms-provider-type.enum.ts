import { registerEnumType } from '@nestjs/graphql';

export enum SMSProviderType {
  Firebase = 'Firebase',
  Twilio = 'Twilio',
  Plivo = 'Plivo',
  Pahappa = 'Pahappa',
  BroadNet = 'BroadNet',
  Vonage = 'Vonage',
  ClickSend = 'ClickSend',
  Infobip = 'Infobip',
  MessageBird = 'MessageBird',
  VentisSMS = 'VentisSMS',
  ClickSMSNet = 'ClickSMSNet',
}

registerEnumType(SMSProviderType, {
  name: 'SMSProviderType',
  description: 'The type of the SMS provider',
});
