import pool from "./lib/db";
import { createStampCardDAO, createBusinessDAO, createLocationDAO } from "./dao";

export const stampCardDAO = createStampCardDAO(pool);
export const businessDAO = createBusinessDAO(pool);
export const locationDAO = createLocationDAO(pool);