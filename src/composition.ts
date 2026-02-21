import pool from "./lib/db";
import { createStampCardDAO } from "./dao";

export const stampCardDAO = createStampCardDAO(pool);