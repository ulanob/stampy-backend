import pool from "./lib/db";
import { createStampCardDAO, createStampEventDAO, createBusinessDAO, createLocationDAO, createGiftCardDAO, createUserDAO, createUserNotificationPreferencesDAO, createNotificationDAO } from "./dao";
import { createUserService } from "./services/user.service";
import { createStampEventService } from "./services/stampEvent.service";
import { createStampCardService } from "./services/stampCard.service";
import { createGiftCardService } from "./services/giftCard.service";
import { createBusinessService } from "./services/business.service";
import { createLocationService } from "./services/location.service";

export const stampCardDAO = createStampCardDAO(pool);
export const stampEventDAO = createStampEventDAO(pool);
export const businessDAO = createBusinessDAO(pool);
export const locationDAO = createLocationDAO(pool);
export const giftCardDAO = createGiftCardDAO(pool);
export const userDAO = createUserDAO(pool);
export const userNotificationPreferencesDAO = createUserNotificationPreferencesDAO(pool);
export const notificationDAO = createNotificationDAO(pool);

export const userService = createUserService(userDAO, userNotificationPreferencesDAO, pool);
export const stampEventService = createStampEventService(stampEventDAO, stampCardDAO, pool);
export const stampCardService = createStampCardService(stampCardDAO, userDAO, businessDAO, pool);
export const giftCardService = createGiftCardService(giftCardDAO, userDAO, businessDAO, pool)
export const businessService = createBusinessService(businessDAO);
export const locationService = createLocationService(locationDAO, businessDAO)