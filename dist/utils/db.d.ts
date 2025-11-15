import * as sql from 'mssql';
export interface SqlConfig {
    user: string;
    password: string;
    server: string;
    database: string;
    port: number;
    options: {
        encrypt: boolean;
        trustServerCertificate: boolean;
    };
    pool?: {
        max: number;
        min: number;
        idleTimeoutMillis: number;
    };
}
export declare const getDefaultSqlConfig: () => SqlConfig;
export declare const getDefaultPoolConfig: () => SqlConfig;
export declare const connectToDatabase: (config: SqlConfig) => Promise<sql.ConnectionPool>;
export declare const closeConnection: (pool: sql.ConnectionPool) => Promise<void>;
//# sourceMappingURL=db.d.ts.map