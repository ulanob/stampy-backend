import { Pool, PoolClient } from "pg";

export type Executor = Pool | PoolClient;