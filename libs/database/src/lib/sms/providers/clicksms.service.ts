import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { SMSProviderInterface } from './sms-provider.interface';
import { SMSProviderEntity } from '../../entities/sms-provider.entity';
import { firstValueFrom } from 'rxjs';
import { ForbiddenError } from '@nestjs/apollo';

@Injectable()
export class ClickSMSService implements SMSProviderInterface {
  constructor(private httpService: HttpService) {}

  async sendOTP(input: {
    providerEntity: SMSProviderEntity;
    phoneNumber: string;
    message: string;
  }): Promise<void> {
    const { providerEntity, phoneNumber, message } = input;

    try {
      // Construct the ClickSMS API URL with query parameters
      const apiUrl = new URL('https://clicksms.net/sms/api');
      apiUrl.searchParams.append('action', 'send-sms');
      apiUrl.searchParams.append('api_key', providerEntity.authToken!);
      apiUrl.searchParams.append('to', phoneNumber.replace(/\D/g, '')); // Remove non-digit characters
      apiUrl.searchParams.append('from', providerEntity.fromNumber!);
      apiUrl.searchParams.append('sms', message);

      // Make an HTTP GET request to the ClickSMS API
      const response = await firstValueFrom(
        this.httpService.get(apiUrl.toString()),
      );

      // Handle any errors from the API response
      if (response.status !== 200) {
        throw new ForbiddenError('Failed to send ClickSMS message');
      }
    } catch (error: any) {
      // Handle any errors that occurred during the SMS sending process
      Logger.error(error, 'ClickSMSService.sendOTP');
      throw new ForbiddenError(`Failed to send ClickSMS: ${error.message}`);
    }
  }
}
