import { NotificationDAO, UserDAO } from "../dao";
import { Notification } from "../models/notification.model";
import { NotFoundError, validateUUID } from "../utils/validators";
import { assertExists } from "./helpers.service";

export type NotificationService = {
  getNotificationByID(id: string): Promise<Notification>;
  getAllNotificationsByUserID(user_id: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification>;
};

export function createNotificationService(notificationDAO: NotificationDAO, userDAO: UserDAO): NotificationService {
    return {
        async getNotificationByID(id: string): Promise<Notification> {
            validateUUID(id);
            const fetchedNotification = await notificationDAO.getNotificationByID(id)

            if (!fetchedNotification) {
                throw new NotFoundError('Could not find notification')
            }

            return fetchedNotification;
        },

        async getAllNotificationsByUserID(user_id: string): Promise<Notification[]> {
            validateUUID(user_id);

            await assertExists(
                () => userDAO.getUserByID(user_id),
                'User not found'
            )

            const fetchedNotifications = await notificationDAO.getAllNotificationsByUserID(user_id);

            return fetchedNotifications;
        },

        async markNotificationAsRead(id: string): Promise<Notification> {
					// TODO: only allow sent -> read once the pipeline sets 'sent' 
					validateUUID(id);

					const updated = await notificationDAO.updateNotificationByID(id, { status: 'read' });

					if (!updated) {
						throw new NotFoundError('Could not find notification to mark as read');
					}

					return updated;
				}
    }
}