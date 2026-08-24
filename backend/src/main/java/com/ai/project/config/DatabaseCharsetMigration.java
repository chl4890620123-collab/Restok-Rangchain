package com.ai.project.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@ConditionalOnProperty(
        prefix = "app.database.charset-migration",
        name = "enabled",
        havingValue = "true"
)
public class DatabaseCharsetMigration implements CommandLineRunner {

    private final DataSource dataSource;

    public DatabaseCharsetMigration(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            String product = connection.getMetaData().getDatabaseProductName();
            if (product == null || !product.toLowerCase().contains("mariadb")) {
                return;
            }

            String database;
            try (Statement statement = connection.createStatement();
                 ResultSet resultSet = statement.executeQuery("SELECT DATABASE()")) {
                if (!resultSet.next()) {
                    throw new IllegalStateException("Could not resolve MariaDB database name");
                }
                database = resultSet.getString(1);
            }

            if (database == null || !database.matches("[A-Za-z0-9_]+")) {
                throw new IllegalStateException("Unexpected MariaDB database name");
            }

            List<String> tables = new ArrayList<>();
            try (PreparedStatement statement = connection.prepareStatement(
                    "SELECT TABLE_NAME FROM information_schema.TABLES " +
                            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' " +
                            "AND (TABLE_COLLATION IS NULL OR TABLE_COLLATION NOT LIKE 'utf8mb4%')");
                 ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    tables.add(resultSet.getString(1));
                }
            }

            try (Statement statement = connection.createStatement()) {
                statement.execute("ALTER DATABASE `" + database + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

                if (tables.isEmpty()) {
                    return;
                }

                statement.execute("SET FOREIGN_KEY_CHECKS=0");
                try {
                    for (String table : tables) {
                        if (table == null || !table.matches("[A-Za-z0-9_]+")) {
                            throw new IllegalStateException("Unexpected MariaDB table name");
                        }
                        statement.execute(
                                "ALTER TABLE `" + table + "` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                        );
                    }
                } finally {
                    statement.execute("SET FOREIGN_KEY_CHECKS=1");
                }
            }
        }
    }
}
