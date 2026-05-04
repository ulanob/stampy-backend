import pool from "./lib/db";
import { createStampCardDAO, createBusinessDAO, createLocationDAO, createGiftCardDAO, createUserDAO } from "./dao";

export const stampCardDAO = createStampCardDAO(pool);
export const businessDAO = createBusinessDAO(pool);
export const locationDAO = createLocationDAO(pool);
export const giftCardDAO = createGiftCardDAO(pool);
export const userDAO = createUserDAO(pool);
