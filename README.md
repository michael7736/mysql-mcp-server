# MySQL MCP Server

This is a Model Context Protocol (MCP) server that provides access to a MySQL database. It allows Claude to execute SQL queries against a MySQL database.

## Features

- Execute SQL queries against a MySQL database:
  - Read data (SELECT statements)
  - Create tables (CREATE TABLE statements)
  - Insert data (INSERT INTO statements)
  - Update data (UPDATE statements)
  - Delete data (DELETE FROM statements)
- Returns query results in JSON format
- Configurable database connection settings
- Transaction logging with unique IDs

## Prerequisites

- Node.js (v14 or higher)
- MySQL server
- MCP SDK

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
cd mysql-mcp-server
npm install
```

3. Build the server:

```bash
npm run build
```

## Configuration

The MySQL MCP server uses the following environment variables for configuration:

- `MYSQL_HOST`: MySQL server hostname (default: 'localhost')
- `MYSQL_PORT`: MySQL server port (default: 3306)
- `MYSQL_USER`: MySQL username (default: 'mcp101')
- `MYSQL_PASSWORD`: MySQL password (default: '123qwe')
- `MYSQL_DATABASE`: MySQL database name (default: 'mcpdb')

## Database Setup

1. Create a MySQL database:

```sql
CREATE DATABASE mcpdb;
```

2. Create a MySQL user with access to the database:

```sql
CREATE USER 'mcp101'@'localhost' IDENTIFIED BY '123qwe';
GRANT ALL PRIVILEGES ON mcpdb.* TO 'mcp101'@'localhost';
FLUSH PRIVILEGES;
```

3. Create a test table with sample data:

```sql
USE mcpdb;
CREATE TABLE test_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test_users (name, email) VALUES
  ('John Doe', 'john@example.com'),
  ('Jane Smith', 'jane@example.com'),
  ('Bob Johnson', 'bob@example.com');
```

## MCP Configuration

Add the MySQL MCP server to your MCP settings file:

### VSCode (Claude Extension)

File: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "mysql-mcp-server": {
      "autoApprove": [],
      "disabled": false,
      "timeout": 60,
      "command": "node",
      "args": [
        "/path/to/mysql-mcp-server/build/index.js"
      ],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "mcp101",
        "MYSQL_PASSWORD": "123qwe",
        "MYSQL_DATABASE": "mcpdb"
      },
      "transportType": "stdio"
    }
  }
}
```

### Claude Desktop App

File: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mysql-mcp-server": {
      "autoApprove": [],
      "disabled": false,
      "timeout": 60,
      "command": "node",
      "args": [
        "/path/to/mysql-mcp-server/build/index.js"
      ],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "mcp101",
        "MYSQL_PASSWORD": "123qwe",
        "MYSQL_DATABASE": "mcpdb"
      },
      "transportType": "stdio"
    }
  }
}
```

## Usage

Once configured, you can use the MySQL MCP server in your conversations with Claude. For example:

"Can you show me all the users in the test_users table?"

Claude will use the `run_sql_query` tool to execute:

```sql
SELECT * FROM test_users
```

## Available Tools

### run_sql_query

Executes a read-only SQL query (SELECT statements only) against the MySQL database.

Parameters:
- `query`: The SQL SELECT query to execute.

Example:
```json
{
  "query": "SELECT * FROM test_users"
}
```

### create_table

Creates a new table in the MySQL database.

Parameters:
- `query`: The SQL CREATE TABLE query to execute.

Example:
```json
{
  "query": "CREATE TABLE products (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), price DECIMAL(10,2))"
}
```

### insert_data

Inserts data into a table in the MySQL database.

Parameters:
- `query`: The SQL INSERT INTO query to execute.

Example:
```json
{
  "query": "INSERT INTO products (name, price) VALUES ('Laptop', 999.99), ('Smartphone', 499.99)"
}
```

### update_data

Updates data in a table in the MySQL database.

Parameters:
- `query`: The SQL UPDATE query to execute.

Example:
```json
{
  "query": "UPDATE products SET price = 899.99 WHERE name = 'Laptop'"
}
```

### delete_data

Deletes data from a table in the MySQL database.

Parameters:
- `query`: The SQL DELETE FROM query to execute.

Example:
```json
{
  "query": "DELETE FROM products WHERE name = 'Smartphone'"
}
```

## Security Considerations

- Use a dedicated MySQL user with appropriate privileges for the MCP server
- Consider using read-only privileges if you only need to query data
- Store sensitive information like database credentials securely
- All operations are logged with unique transaction IDs for auditing
