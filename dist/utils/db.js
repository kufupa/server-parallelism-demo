"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeConnection = exports.connectToDatabase = exports.getDefaultPoolConfig = exports.getDefaultSqlConfig = void 0;
const sql = __importStar(require("mssql"));
const getDefaultSqlConfig = () => {
    return {
        user: process.env.DB_USER || 'hackathon_ro_05',
        password: process.env.DB_PASSWORD || 'B8^cNp1%',
        server: process.env.DB_HOST || 'pepsaco-db-standard.c1oqimeoszvd.eu-west-2.rds.amazonaws.com',
        database: process.env.DB_NAME || 'WideWorldImporters_Base',
        port: parseInt(process.env.DB_PORT || '1433', 10),
        options: {
            encrypt: true,
            trustServerCertificate: true
        }
    };
};
exports.getDefaultSqlConfig = getDefaultSqlConfig;
const getDefaultPoolConfig = () => {
    const config = (0, exports.getDefaultSqlConfig)();
    return {
        ...config,
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        }
    };
};
exports.getDefaultPoolConfig = getDefaultPoolConfig;
const connectToDatabase = async (config) => {
    try {
        const pool = await sql.connect(config);
        console.log('✓ Connected to SQL Server:', config.server);
        return pool;
    }
    catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error('✗ Failed to connect to SQL Server:', error);
        throw err;
    }
};
exports.connectToDatabase = connectToDatabase;
const closeConnection = async (pool) => {
    try {
        await pool.close();
        console.log('✓ Database connection closed');
    }
    catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error('✗ Error closing connection:', error);
        throw err;
    }
};
exports.closeConnection = closeConnection;
//# sourceMappingURL=db.js.map