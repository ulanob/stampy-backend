import pool from "./lib/db";
import { createStampCardDAO, createStampCardEventDAO, createBusinessDAO, createLocationDAO, createGiftCardDAO, createUserDAO, createUserNotificationPreferencesDAO, createNotificationDAO, createGiftCardEventDAO } from "./dao";
import { createUserService } from "./services/user.service";
import { createStampCardEventService } from "./services/stampCardEvent.service";
import { createStampCardService } from "./services/stampCard.service";
import { createGiftCardService } from "./services/giftCard.service";
import { createBusinessService } from "./services/business.service";
import { createLocationService } from "./services/location.service";
import { createUserNotificationPreferencesService } from "./services/userNotificationPreferences.service";
import { createGiftCardEventService } from "./services/giftCardEvent.service";

export const stampCardDAO = createStampCardDAO(pool);
export const stampCardEventDAO = createStampCardEventDAO(pool);
export const businessDAO = createBusinessDAO(pool);
export const locationDAO = createLocationDAO(pool);
export const giftCardDAO = createGiftCardDAO(pool);
export const giftCardEventDAO = createGiftCardEventDAO(pool);
export const userDAO = createUserDAO(pool);
export const userNotificationPreferencesDAO = createUserNotificationPreferencesDAO(pool);
export const notificationDAO = createNotificationDAO(pool);

export const userService = createUserService(userDAO, userNotificationPreferencesDAO, pool);
export const stampCardEventService = createStampCardEventService(stampCardEventDAO, stampCardDAO, pool);
export const stampCardService = createStampCardService(stampCardDAO, userDAO, businessDAO, pool);
export const giftCardService = createGiftCardService(giftCardDAO, userDAO, businessDAO, pool)
export const giftCardEventService = createGiftCardEventService(giftCardEventDAO, giftCardDAO, pool)
export const businessService = createBusinessService(businessDAO);
export const locationService = createLocationService(locationDAO, businessDAO)
export const userNotificationPreferencesService = createUserNotificationPreferencesService(userNotificationPreferencesDAO, pool)