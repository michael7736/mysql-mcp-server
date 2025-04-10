#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import mysql from 'mysql2/promise';
const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || '3306', 10);
const MYSQL_USER = process.env.MYSQL_USER || 'mcp101';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '123qwe';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'mcpdb';
// Validate SQL query arguments
const isValidSqlQueryArgs = (args) => typeof args === 'object' &&
    args !== null &&
    typeof args.query === 'string';
// Check if query is read-only (SELECT)
const isReadOnlyQuery = (query) => query.trim().toLowerCase().startsWith('select');
// Check if query is for creating a table
const isCreateTableQuery = (query) => query.trim().toLowerCase().startsWith('create table');
// Check if query is for inserting data
const isInsertQuery = (query) => query.trim().toLowerCase().startsWith('insert into');
// Check if query is for updating data
const isUpdateQuery = (query) => query.trim().toLowerCase().startsWith('update');
// Check if query is for deleting data
const isDeleteQuery = (query) => query.trim().toLowerCase().startsWith('delete from');
// Generate a unique transaction ID for logging
const generateTransactionId = () => randomUUID();
class MySqlServer {
    constructor() {
        this.server = new Server({
            name: 'mysql-mcp-server',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.pool = mysql.createPool({
            host: MYSQL_HOST,
            port: MYSQL_PORT,
            user: MYSQL_USER,
            password: MYSQL_PASSWORD,
            database: MYSQL_DATABASE,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
        this.setupToolHandlers();
        // Error handling
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.pool.end();
            await this.server.close();
            process.exit(0);
        });
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'run_sql_query',
                    description: 'Executes a read-only SQL query (SELECT statements only) against the MySQL database.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'The SQL SELECT query to execute.',
                            },
                        },
                        required: ['query'],
                    },
                },
                {
                    name: 'create_table',
                    description: 'Creates a new table in the MySQL database.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'The SQL CREATE TABLE query to execute.',
                            },
                        },
                        required: ['query'],
                    },
                },
                {
                    name: 'insert_data',
                    description: 'Inserts data into a table in the MySQL database.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'The SQL INSERT INTO query to execute.',
                            },
                        },
                        required: ['query'],
                    },
                },
                {
                    name: 'update_data',
                    description: 'Updates data in a table in the MySQL database.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'The SQL UPDATE query to execute.',
                            },
                        },
                        required: ['query'],
                    },
                },
                {
                    name: 'delete_data',
                    description: 'Deletes data from a table in the MySQL database.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'The SQL DELETE FROM query to execute.',
                            },
                        },
                        required: ['query'],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const transactionId = generateTransactionId();
            console.error(`[${transactionId}] Processing request: ${request.params.name}`);
            // Handle different tool types
            switch (request.params.name) {
                case 'run_sql_query':
                    return this.handleReadQuery(request, transactionId);
                case 'create_table':
                    return this.handleCreateTable(request, transactionId);
                case 'insert_data':
                    return this.handleInsertData(request, transactionId);
                case 'update_data':
                    return this.handleUpdateData(request, transactionId);
                case 'delete_data':
                    return this.handleDeleteData(request, transactionId);
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
        });
    }
    // Handle read-only queries (SELECT)
    async handleReadQuery(request, transactionId) {
        if (!isValidSqlQueryArgs(request.params.arguments)) {
            throw new McpError(ErrorCode.InvalidParams, 'Invalid SQL query arguments.');
        }
        const query = request.params.arguments.query;
        if (!isReadOnlyQuery(query)) {
            throw new McpError(ErrorCode.InvalidParams, 'Only SELECT queries are allowed with run_sql_query tool.');
        }
        console.error(`[${transactionId}] Executing SELECT query: ${query}`);
        try {
            const [rows] = await this.pool.query(query);
            console.error(`[${transactionId}] Query executed successfully`);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(rows, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            console.error(`[${transactionId}] Query error:`, error);
            if (error instanceof Error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `MySQL error: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
            throw error;
        }
    }
    // Handle CREATE TABLE queries
    async handleCreateTable(request, transactionId) {
        if (!isValidSqlQueryArgs(request.params.arguments)) {
            throw new McpError(ErrorCode.InvalidParams, 'Invalid SQL query arguments.');
        }
        const query = request.params.arguments.query;
        if (!isCreateTableQuery(query)) {
            throw new McpError(ErrorCode.InvalidParams, 'Only CREATE TABLE queries are allowed with create_table tool.');
        }
        console.error(`[${transactionId}] Executing CREATE TABLE query: ${query}`);
        try {
            const [result] = await this.pool.query(query);
            console.error(`[${transactionId}] Table created successfully`);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: 'Table created successfully',
                            result
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            console.error(`[${transactionId}] Query error:`, error);
            if (error instanceof Error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `MySQL error: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
            throw error;
        }
    }
    // Handle INSERT INTO queries
    async handleInsertData(request, transactionId) {
        if (!isValidSqlQueryArgs(request.params.arguments)) {
            throw new McpError(ErrorCode.InvalidParams, 'Invalid SQL query arguments.');
        }
        const query = request.params.arguments.query;
        if (!isInsertQuery(query)) {
            throw new McpError(ErrorCode.InvalidParams, 'Only INSERT INTO queries are allowed with insert_data tool.');
        }
        console.error(`[${transactionId}] Executing INSERT query: ${query}`);
        try {
            const [result] = await this.pool.query(query);
            console.error(`[${transactionId}] Data inserted successfully`);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: 'Data inserted successfully',
                            result
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            console.error(`[${transactionId}] Query error:`, error);
            if (error instanceof Error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `MySQL error: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
            throw error;
        }
    }
    // Handle UPDATE queries
    async handleUpdateData(request, transactionId) {
        if (!isValidSqlQueryArgs(request.params.arguments)) {
            throw new McpError(ErrorCode.InvalidParams, 'Invalid SQL query arguments.');
        }
        const query = request.params.arguments.query;
        if (!isUpdateQuery(query)) {
            throw new McpError(ErrorCode.InvalidParams, 'Only UPDATE queries are allowed with update_data tool.');
        }
        console.error(`[${transactionId}] Executing UPDATE query: ${query}`);
        try {
            const [result] = await this.pool.query(query);
            console.error(`[${transactionId}] Data updated successfully`);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: 'Data updated successfully',
                            result
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            console.error(`[${transactionId}] Query error:`, error);
            if (error instanceof Error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `MySQL error: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
            throw error;
        }
    }
    // Handle DELETE FROM queries
    async handleDeleteData(request, transactionId) {
        if (!isValidSqlQueryArgs(request.params.arguments)) {
            throw new McpError(ErrorCode.InvalidParams, 'Invalid SQL query arguments.');
        }
        const query = request.params.arguments.query;
        if (!isDeleteQuery(query)) {
            throw new McpError(ErrorCode.InvalidParams, 'Only DELETE FROM queries are allowed with delete_data tool.');
        }
        console.error(`[${transactionId}] Executing DELETE query: ${query}`);
        try {
            const [result] = await this.pool.query(query);
            console.error(`[${transactionId}] Data deleted successfully`);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: 'Data deleted successfully',
                            result
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            console.error(`[${transactionId}] Query error:`, error);
            if (error instanceof Error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `MySQL error: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
            throw error;
        }
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('MySQL MCP server running on stdio');
    }
}
const server = new MySqlServer();
server.run().catch(console.error);
