import { IsIn, IsString, MinLength } from 'class-validator';
import { NOTIFICATION_TYPES, NotificationType } from './notification-types.constant';

export class UpsertNotificationTemplateDto {
  @IsIn(NOTIFICATION_TYPES)
  type!: NotificationType;

  @IsString()
  @MinLength(1)
  subjectTemplate!: string;

  @IsString()
  @MinLength(1)
  bodyTemplate!: string;
}
